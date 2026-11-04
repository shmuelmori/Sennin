#!/usr/bin/env python3
"""Check Claude Code skills against the official skill-authoring rules.

Manual use:
    python validate_skill.py                  # every skill in .claude/skills/ plus stray skill files
    python validate_skill.py PATH [PATH ...]  # specific skill folders or SKILL.md files

Hook use (configured in .claude/settings.json):
    python validate_skill.py --hook
    Reads the hook event JSON on stdin, finds skill files that changed since the
    previous run, checks the affected skills, and prints hook JSON so Claude gets
    the report. Always exits 0 so a validator problem never blocks other work.

Exit codes (manual use): 0 = no errors, 1 = errors found, 2 = a path does not exist.

Needs only the Python 3.8+ standard library. If PyYAML is installed it is used as
an extra YAML parse check.

Rules come from:
    https://code.claude.com/docs/en/skills
    https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
"""

from __future__ import annotations

import difflib
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import unquote

try:  # optional cross-check; the built-in parser covers every rule without it
    import yaml  # type: ignore
except ImportError:  # pragma: no cover
    yaml = None

# --- Hard limits from the docs ---------------------------------------------------
NAME_MAX = 64              # Agent Skills spec: `name` is at most 64 characters
DESCRIPTION_MAX = 1024     # Agent Skills spec: `description` is at most 1,024 characters
LISTING_MAX = 1536         # Claude Code truncates description + when_to_use past this
COMPATIBILITY_MAX = 500    # Agent Skills spec: `compatibility` is at most 500 characters
BODY_MAX_LINES = 500       # docs: "Keep SKILL.md under 500 lines"
TOC_MIN_LINES = 100        # docs: reference files longer than 100 lines need a table of contents

# --- Heuristics (produce warnings only) ------------------------------------------
DESCRIPTION_MIN = 50       # shorter descriptions rarely say both what the skill does and when
TOC_SEARCH_LINES = 40      # a table of contents only helps partial reads when it is near the top

# Change-tracking state for hook mode, kept in the .claude folder that holds this script.
STATE_FILE = ".skill-generator-state.json"

PORTABLE_KEYS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
CLAUDE_CODE_KEYS = {
    "when_to_use", "argument-hint", "arguments", "disable-model-invocation", "user-invocable",
    "disallowed-tools", "model", "effort", "context", "agent", "background", "hooks", "paths",
    "shell",
}
KNOWN_KEYS = PORTABLE_KEYS | CLAUDE_CODE_KEYS
TEXT_KEYS = ("name", "description", "when_to_use")
BOOL_KEYS = {"disable-model-invocation", "user-invocable", "background"}
BOOL_TRUE = {"true", "yes", "on", "1"}
BOOL_FALSE = {"false", "no", "off", "0"}
ENUM_KEYS = {
    "effort": {"low", "medium", "high", "xhigh", "max"},
    "shell": {"bash", "powershell"},
    "context": {"fork"},
}
RESERVED_WORDS = ("anthropic", "claude")
RESERVED_FOLDERS = {"synced", "anthropic-skills"}
VAGUE_NAMES = {
    "helper", "helpers", "util", "utils", "tool", "tools", "misc", "stuff", "common", "general",
    "document", "documents", "data", "file", "files", "skill", "skills",
}
SKIP_NAMES = {"__pycache__", "node_modules", ".git"}
LEVEL_ORDER = {"ERROR": 0, "WARN": 1, "NOTE": 2}

NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KEY_RE = re.compile(r"^([A-Za-z0-9_][A-Za-z0-9_.-]*)[ \t]*:(?:[ \t]+(.*))?$")
UNSAFE_CHARS_RE = re.compile(
    "[<>\x00-\x1f\x7f ​-‏‪-‮⁠-⁤﻿-]"
)
XML_TAG_RE = re.compile(r"</?[A-Za-z][\w:.-]*(?:\s[^<>]*)?/?>")
FIRST_PERSON_RE = re.compile(
    r"(?<![\w'])(?:I(?:'m|'ll|'ve)?|[Mm]e|[Mm]y|[Ww]e(?:'re|'ll|'ve)?|[Oo]ur|[Uu]s)(?![\w'/])"
)
SECOND_PERSON_RE = re.compile(
    r"(?i)\byou(?:'ll)?\s+(?:can|could|should|will|must|might|need)\b|^\s*you\b"
)
WHEN_RE = re.compile(
    r"(?i)\b(?:when|whenever|use (?:it |this (?:skill )?)?(?:for|if|on|to|after|before|while|with)"
    r"|triggers?|invoked?)\b"
)
MONTHS = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?"
    r"|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
)
TIME_RE = re.compile(
    rf"(?i)\b(?:before|after|until|till|as of|since|starting|from|by)\s+"
    rf"(?:(?:early|mid|late|the end of)\s+)?(?:{MONTHS}|q[1-4]|(?:19|20)\d\d)\b"
)
LINK_RE = re.compile(r"\[[^\]\n]*\]\(\s*<?([^)\s>]+)>?(?:\s+[\"'][^\"']*[\"'])?\s*\)")
ABS_PATH_RE = re.compile(r"(?<![\w$])[A-Za-z]:[\\/][\w.\\/-]|(?<![\w.~$}])/(?:Users|home)/\w")
BACKSLASH_PATH_RE = re.compile(r"(?<![\\\w])[\w.-]+\\[\w.-]+(?:\\[\w.-]+)*\.[A-Za-z0-9]{1,5}\b")
INJECTION_RE = re.compile(r"(?m)(?:^|[ \t])!`[^`\n]+`|^[ \t]*```!")
TOC_HEADING_RE = re.compile(r"(?i)^#{1,6}\s*(?:table of )?contents\b")
TOC_ANCHOR_RE = re.compile(r"^\s*[-*]\s+\[[^\]]+\]\(#")


# --- Data -------------------------------------------------------------------------

@dataclass
class Finding:
    level: str      # "ERROR" breaks loading or the spec, "WARN" breaks a best practice, "NOTE" is info
    where: str      # file name inside the skill, plus ":line" when known
    message: str


@dataclass
class Field:
    key: str
    line: int                                   # 1-based line number in the file
    raw: str                                    # text after "key:" on the same line
    cont: List[str] = field(default_factory=list)  # indented continuation lines
    value: object = None                        # str, list, or None for a nested mapping


def add(out: List[Finding], level: str, where: str, message: str) -> None:
    if not any(f.level == level and f.where == where and f.message == message for f in out):
        out.append(Finding(level, where, message))


def plural(n: int, word: str) -> str:
    return f"{n} {word}" + ("" if n == 1 else "s")


# --- Frontmatter ------------------------------------------------------------------

def resolve_value(f: Field, fname: str, out: List[Finding]) -> object:
    """Turn a field's raw YAML text into a value, flagging YAML that would not parse."""
    where = f"{fname}:{f.line}"
    cont = list(f.cont)
    while cont and not cont[-1].strip():
        cont.pop()
    raw = f.raw

    if not raw:
        items = [c.strip() for c in cont if c.strip()]
        if not items:
            return ""
        if all(s == "-" or s.startswith("- ") for s in items):
            return [s[1:].strip().strip("\"'") for s in items]
        return None  # nested mapping such as `hooks` or `metadata`

    if raw[0] in "|>":
        if not re.fullmatch(r"[|>](?:[1-9]?[+-]?|[+-][1-9]?)(?:\s+#.*)?", raw):
            add(out, "ERROR", where, f"'{f.key}' has an invalid block indicator {raw!r}.")
        parts = [c.strip() for c in cont]
        if raw[0] == "|":
            return "\n".join(parts).strip()
        return re.sub(r"\s*\n\s*", " ", "\n".join(parts)).strip()

    if raw[0] in "\"'":
        quote = raw[0]
        joined = " ".join([raw] + [c.strip() for c in cont])
        pattern = r'"((?:[^"\\]|\\.)*)"(.*)$' if quote == '"' else r"'((?:[^']|'')*)'(.*)$"
        m = re.match(pattern, joined, re.S)
        if not m:
            add(out, "ERROR", where, f"'{f.key}' opens a {quote} quote that never closes.")
            return joined[1:]
        rest = m.group(2).strip()
        if rest and not rest.startswith("#"):
            add(out, "ERROR", where,
                f"'{f.key}' has text after its closing quote ({rest[:40]!r}). "
                "Put the whole value inside the quotes.")
        value = m.group(1)
        if quote == '"':
            try:
                value = json.loads('"' + value + '"')
            except ValueError:
                pass
        else:
            value = value.replace("''", "'")
        return value

    if raw[0] in "[{":
        joined = " ".join([raw] + [c.strip() for c in cont]).strip()
        joined = re.split(r"[ \t]#", joined, 1)[0].rstrip()
        closer = "]" if raw[0] == "[" else "}"
        if not joined.endswith(closer):
            kind = "list" if closer == "]" else "map"
            add(out, "ERROR", where,
                f"'{f.key}' starts a YAML flow {kind} with {raw[0]!r} that never closes. "
                "To use brackets as text, wrap the value in double quotes.")
        if closer == "]":
            inner = joined[1:-1] if joined.endswith("]") else joined[1:]
            return [x.strip().strip("\"'") for x in inner.split(",") if x.strip()]
        return None

    if raw == "-" or raw.startswith("- ") or raw[0] in "*&!%@`":
        add(out, "ERROR", where,
            f"'{f.key}' starts with {raw[0]!r}, which YAML treats as syntax. "
            "Wrap the value in double quotes.")
    text = " ".join([raw] + [c.strip() for c in cont if c.strip()])
    if re.search(r"[ \t]#", text):
        add(out, "WARN", where,
            f"' #' in '{f.key}' starts a YAML comment, so the rest of the value is dropped. "
            "Wrap the value in double quotes.")
        text = re.split(r"[ \t]#", text, 1)[0].rstrip()
    if re.search(r":(?:[ \t]|$)", text):
        add(out, "ERROR", where,
            f"'{f.key}' contains ': ', which YAML reads as a nested field, so the frontmatter "
            "fails to parse and the skill loads with no name or description. "
            "Wrap the value in double quotes.")
    return text


def parse_frontmatter(lines: List[str], fname: str,
                      out: List[Finding]) -> Tuple[Optional[Dict[str, Field]], int]:
    """Return (fields, index of the first body line). fields is None without valid frontmatter."""
    if not lines or lines[0].rstrip() != "---":
        add(out, "ERROR", f"{fname}:1",
            "Line 1 must be exactly '---'. Claude Code reads frontmatter only when the opening "
            "'---' is the first line; otherwise the skill has no name or description.")
        return None, 0
    close = next((i for i in range(1, len(lines)) if lines[i].rstrip() == "---"), None)
    if close is None:
        add(out, "ERROR", f"{fname}:1", "The frontmatter has no closing '---' line.")
        return None, 0

    errors_before = sum(1 for f in out if f.level == "ERROR")
    fields: Dict[str, Field] = {}
    current: Optional[Field] = None
    for i in range(1, close):
        line, n = lines[i], i + 1
        if not line.strip():
            if current:
                current.cont.append("")
            continue
        if line[0] in " \t":
            if re.match(r"^ *\t", line):
                add(out, "ERROR", f"{fname}:{n}", "YAML indentation must use spaces, not tabs.")
            if current is None:
                add(out, "ERROR", f"{fname}:{n}", "Indented line with no field above it.")
            else:
                current.cont.append(line)
            continue
        if line.startswith("#"):
            continue
        m = KEY_RE.match(line)
        if not m:
            add(out, "ERROR", f"{fname}:{n}",
                f"Not a 'field: value' line: {line.strip()[:60]!r}. The frontmatter will not "
                "parse and the skill loads with no name or description.")
            current = None
            continue
        key, raw = m.group(1), (m.group(2) or "").strip()
        if key in fields:
            add(out, "ERROR", f"{fname}:{n}", f"Field '{key}' appears twice; keep one.")
        current = Field(key, n, raw)
        fields[key] = current

    for f in fields.values():
        f.value = resolve_value(f, fname, out)

    errors_now = sum(1 for f in out if f.level == "ERROR")
    if yaml is not None and errors_now == errors_before:
        try:
            data = yaml.safe_load("\n".join(lines[1:close]))
            if data is not None and not isinstance(data, dict):
                add(out, "ERROR", f"{fname}:2", "The frontmatter must be 'field: value' pairs.")
        except yaml.YAMLError as exc:
            first = str(exc).splitlines()[0] if str(exc) else "parse error"
            add(out, "ERROR", fname,
                f"The frontmatter YAML does not parse ({first}); the skill would load with "
                "no name or description.")
    return fields, close + 1


def check_fields(fields: Dict[str, Field], fname: str, folder_name: Optional[str],
                 out: List[Finding]) -> None:
    def loc(key: str) -> str:
        return f"{fname}:{fields[key].line}" if key in fields else fname

    def text_of(key: str) -> str:
        f = fields.get(key)
        return f.value.strip() if f and isinstance(f.value, str) else ""

    for key in fields:
        if key not in KNOWN_KEYS:
            close = difflib.get_close_matches(key, sorted(KNOWN_KEYS), n=1, cutoff=0.6)
            hint = f" Did you mean '{close[0]}'?" if close else " Remove it, or move it under 'metadata'."
            add(out, "ERROR", loc(key), f"Unknown field '{key}' is silently ignored by Claude Code.{hint}")
        elif key in CLAUDE_CODE_KEYS:
            add(out, "NOTE", loc(key),
                f"'{key}' works only in Claude Code; claude.ai and the Skills API reject it on upload.")
    for key in TEXT_KEYS:
        if key in fields and not isinstance(fields[key].value, str):
            add(out, "ERROR", loc(key), f"'{key}' must be plain text. Wrap the value in double quotes.")

    # name
    name = text_of("name")
    if not name:
        hint = f" Use the folder name: 'name: {folder_name}'." if folder_name else ""
        add(out, "ERROR", loc("name"), "Missing 'name'. The Agent Skills spec requires it." + hint)
    else:
        if len(name) > NAME_MAX:
            add(out, "ERROR", loc("name"), f"name is {len(name)} characters; the limit is {NAME_MAX}.")
        if not NAME_RE.match(name):
            add(out, "ERROR", loc("name"),
                f"name '{name}' must use only lowercase letters, digits and single hyphens "
                "(for example pdf-processing).")
        for word in RESERVED_WORDS:
            if word in name:
                add(out, "ERROR", loc("name"), f"name '{name}' contains the reserved word '{word}'.")
        if folder_name is not None and name != folder_name:
            add(out, "ERROR", loc("name"),
                f"name '{name}' differs from its folder '{folder_name}'. Make them identical.")
        if name in VAGUE_NAMES or all(t in VAGUE_NAMES for t in name.split("-")):
            add(out, "WARN", loc("name"),
                f"name '{name}' is vague. Say what the skill does (for example processing-pdfs).")

    # description
    desc = text_of("description")
    if not desc:
        add(out, "ERROR", loc("description"),
            "Missing 'description'. Claude chooses skills by their description, so without one "
            "the skill rarely triggers.")
    else:
        if len(desc) > DESCRIPTION_MAX:
            add(out, "ERROR", loc("description"),
                f"description is {len(desc)} characters; the limit is {DESCRIPTION_MAX}. "
                "Keep what it does and when to use it; cut the rest.")
        elif len(desc) < DESCRIPTION_MIN:
            add(out, "WARN", loc("description"),
                f"description is only {len(desc)} characters. Say what the skill does and when "
                "to use it, with the words users would type.")
        if XML_TAG_RE.search(desc):
            add(out, "ERROR", loc("description"), "description must not contain XML tags.")
        elif "<" in desc or ">" in desc:
            add(out, "WARN", loc("description"),
                "Angle brackets in the description display as &lt; and &gt;. "
                "Use [brackets] for placeholders.")
        person = FIRST_PERSON_RE.search(desc) or SECOND_PERSON_RE.search(desc)
        if person:
            add(out, "WARN", loc("description"),
                f"Write the description in third person (found {person.group(0).strip()!r}): "
                "'Processes Excel files...', not 'I can...' or 'You can...'.")
        if not WHEN_RE.search(desc):
            add(out, "WARN", loc("description"),
                "The description does not say when to use the skill. Add 'Use when ...' with "
                "the situations and keywords that should trigger it.")

    when = text_of("when_to_use")
    if when:
        if XML_TAG_RE.search(when):
            add(out, "ERROR", loc("when_to_use"), "when_to_use must not contain XML tags.")
        total = len(desc) + len(when)
        if total > LISTING_MAX:
            add(out, "ERROR", loc("when_to_use"),
                f"description + when_to_use is {total} characters; Claude Code truncates the "
                f"skill listing at {LISTING_MAX}.")

    # values of behavior fields
    for key in sorted(BOOL_KEYS & fields.keys()):
        v = str(fields[key].value).strip().lower()
        if v not in BOOL_TRUE | BOOL_FALSE:
            add(out, "ERROR", loc(key), f"'{key}' must be true or false, not {fields[key].value!r}.")
    for key, allowed in ENUM_KEYS.items():
        if key in fields and str(fields[key].value).strip().lower() not in allowed:
            add(out, "ERROR", loc(key), f"'{key}' must be one of: {', '.join(sorted(allowed))}.")
    is_fork = str(getattr(fields.get("context"), "value", "")).strip().lower() == "fork"
    for key in ("agent", "background"):
        if key in fields and not is_fork:
            add(out, "WARN", loc(key), f"'{key}' has an effect only together with 'context: fork'.")
    no_model = str(getattr(fields.get("disable-model-invocation"), "value", "")).strip().lower() in BOOL_TRUE
    no_user = str(getattr(fields.get("user-invocable"), "value", "")).strip().lower() in BOOL_FALSE
    if no_model and no_user:
        add(out, "ERROR", loc("user-invocable"),
            "disable-model-invocation: true plus user-invocable: false means nobody can invoke "
            "this skill.")
    comp = text_of("compatibility")
    if len(comp) > COMPATIBILITY_MAX:
        add(out, "ERROR", loc("compatibility"),
            f"compatibility is {len(comp)} characters; the limit is {COMPATIBILITY_MAX}.")


# --- Body and supporting files -----------------------------------------------------

def strip_code(text: str) -> str:
    """Blank out fenced code blocks and inline code spans, keeping line numbers."""
    out: List[str] = []
    fence: Optional[str] = None
    for line in text.split("\n"):
        m = re.match(r"^[ \t]*(`{3,}|~{3,})", line)
        if fence:
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence) \
                    and not line.strip()[len(m.group(1)):].strip():
                fence = None
            out.append("")
            continue
        if m:
            fence = m.group(1)
            out.append("")
            continue
        out.append(re.sub(r"`[^`\n]*`", "", line))
    return "\n".join(out)


def check_text(text: str, fname: str, first_line: int, base_dir: Path,
               out: List[Finding]) -> List[Path]:
    """Checks shared by SKILL.md bodies and reference files. Returns local link targets."""
    prose = strip_code(text)
    targets: List[Path] = []
    for idx, line in enumerate(prose.split("\n")):
        where = f"{fname}:{first_line + idx}"
        for m in LINK_RE.finditer(line):
            target = m.group(1)
            if re.match(r"^(?:[a-z][a-z0-9+.-]*:|#|\$\{)", target, re.I):
                continue
            path_part = unquote(target.split("#", 1)[0])
            if not path_part:
                continue
            if "\\" in path_part:
                add(out, "WARN", where, f"Link '{target}' uses backslashes; use forward slashes.")
            resolved = base_dir / path_part.replace("\\", "/")
            if not resolved.exists():
                add(out, "ERROR", where, f"Link target '{path_part}' does not exist.")
            else:
                targets.append(resolved.resolve())
        m = BACKSLASH_PATH_RE.search(line)
        if m:
            add(out, "WARN", where,
                f"Path '{m.group(0)}' uses backslashes. Use forward slashes; they work on every platform.")
    for idx, line in enumerate(text.split("\n")):
        if ABS_PATH_RE.search(line):
            add(out, "WARN", f"{fname}:{first_line + idx}",
                "Machine-specific absolute path. Use a path relative to the skill folder, or the "
                "CLAUDE_SKILL_DIR / CLAUDE_PROJECT_DIR variables.")
    no_details = re.sub(r"(?is)<details>.*?</details>",
                        lambda m: "\n" * m.group(0).count("\n"), prose)
    for idx, line in enumerate(no_details.split("\n")):
        m = TIME_RE.search(line)
        if m:
            add(out, "WARN", f"{fname}:{first_line + idx}",
                f"Time-sensitive wording ({m.group(0)!r}) goes stale. State the current behavior "
                "and move history into an 'Old patterns' <details> block.")
    return targets


def check_body(lines: List[str], start: int, fname: str,
               fields: Optional[Dict[str, Field]], out: List[Finding]) -> None:
    body = lines[start:]
    while body and not body[-1].strip():
        body.pop()
    text = "\n".join(body)
    if not text.strip():
        add(out, "ERROR", fname, "The body is empty. Add the instructions Claude should follow.")
        return
    if len(body) > BODY_MAX_LINES:
        add(out, "ERROR", fname,
            f"The body is {len(body)} lines; keep it under {BODY_MAX_LINES}. Move detailed "
            "material into reference files linked from SKILL.md.")
    if INJECTION_RE.search(text) and (fields is None or "allowed-tools" not in fields):
        add(out, "WARN", fname,
            "The body runs shell commands through '!' injection without 'allowed-tools'. "
            "Commands that are not pre-approved abort the skill outside auto mode.")


def iter_files(root: Path, skip_top: frozenset = frozenset()):
    """Yield files under root, skipping hidden entries, caches and the given top-level names."""
    try:
        entries = sorted(root.iterdir())
    except OSError:
        return
    for p in entries:
        if p.name.startswith(".") or p.name in SKIP_NAMES or p.name in skip_top:
            continue
        if p.is_dir():
            yield from iter_files(p)
        elif p.is_file() and p.suffix.lower() != ".pyc":
            yield p


def has_toc(lines: List[str]) -> bool:
    return any(TOC_HEADING_RE.match(l) for l in lines) or \
        sum(1 for l in lines if TOC_ANCHOR_RE.match(l)) >= 3


def check_supporting(skill_dir: Path, skill_md_text: str, out: List[Finding]) -> None:
    root = skill_dir.resolve()
    for f in iter_files(skill_dir):
        rel = f.relative_to(skill_dir).as_posix()
        if f.parent == skill_dir and f.name.lower() == "skill.md":
            continue
        if rel not in skill_md_text and f.name not in skill_md_text:
            add(out, "WARN", rel,
                f"{rel} is not mentioned in SKILL.md, so Claude won't know it exists. Link it "
                "with a note on when to read or run it, or delete it.")
        if f.suffix.lower() != ".md":
            continue
        try:
            text = f.read_text(encoding="utf-8").replace("\r\n", "\n")
        except (OSError, UnicodeDecodeError):
            add(out, "ERROR", rel, f"{rel} is not readable UTF-8 text.")
            continue
        lines = text.split("\n")
        if len(lines) > TOC_MIN_LINES and not has_toc(lines[:TOC_SEARCH_LINES]):
            add(out, "WARN", rel,
                f"{rel} is {len(lines)} lines with no table of contents near the top. Add a "
                "'## Contents' list so a partial read still shows the full scope.")
        for t in check_text(text, rel, 1, f.parent, out):
            inside = str(t).lower().startswith(str(root).lower() + os.sep.lower())
            if inside and t.suffix.lower() == ".md" and t != f.resolve() and t.name.lower() != "skill.md":
                add(out, "WARN", rel,
                    f"{rel} links to {t.relative_to(root).as_posix()}. Keep references one level "
                    "deep: link every reference file directly from SKILL.md.")


# --- Units: skill folders, stray skill files, loose files ----------------------------

def check_skill_markdown(md: Path, folder_name: Optional[str], out: List[Finding]) -> Optional[str]:
    fname = md.name
    try:
        data = md.read_bytes()
    except OSError as exc:
        add(out, "ERROR", fname, f"Cannot read the file: {exc}")
        return None
    if data.startswith(b"\xef\xbb\xbf"):
        add(out, "ERROR", f"{fname}:1",
            "The file starts with a UTF-8 byte-order mark. Save it as UTF-8 without BOM so "
            "'---' is truly the first line.")
        data = data[3:]
    try:
        text = data.decode("utf-8").replace("\r\n", "\n")
    except UnicodeDecodeError:
        add(out, "ERROR", fname, "The file is not valid UTF-8.")
        return None
    lines = text.split("\n")
    fields, body_start = parse_frontmatter(lines, fname, out)
    if fields is not None:
        check_fields(fields, fname, folder_name, out)
    check_body(lines, body_start, fname, fields, out)
    check_text("\n".join(lines[body_start:]), fname, body_start + 1, md.parent, out)
    return text


def check_skill_folder(d: Path) -> List[Finding]:
    out: List[Finding] = []
    folder = d.name
    if folder.lower() in RESERVED_FOLDERS or folder.lower().startswith("anthropic-skills"):
        add(out, "ERROR", ".", f"Folder name '{folder}' is reserved, so Claude Code won't load it. Rename it.")
    if UNSAFE_CHARS_RE.search(folder):
        add(out, "ERROR", ".",
            "The folder name contains invisible, control or angle-bracket characters, so "
            "Claude Code won't load it.")
    if not d.is_dir():
        add(out, "ERROR", ".", "The skill folder does not exist.")
        return out
    candidates = [p for p in d.iterdir() if p.is_file() and p.name.lower() == "skill.md"]
    if not candidates:
        add(out, "ERROR", ".", "No SKILL.md in this folder, so it is not a skill. Add SKILL.md or remove the folder.")
        return out
    md = candidates[0]
    if md.name != "SKILL.md":
        add(out, "ERROR", md.name,
            f"Rename {md.name} to SKILL.md (exact case). Case-sensitive systems such as Linux "
            "and claude.ai uploads won't find it otherwise.")
    text = check_skill_markdown(md, folder, out)
    if text is not None:
        check_supporting(d, text, out)
    return out


def check_stray(path: Path) -> List[Finding]:
    out: List[Finding] = []
    add(out, "ERROR", path.name,
        "Claude Code loads skills only from .claude/skills/[skill-name]/SKILL.md, so this file "
        "is ignored. Move it to .claude/skills/[skill-name]/SKILL.md (folder name = frontmatter "
        "name), then delete this copy.")
    check_skill_markdown(path, None, out)
    return out


def check_loose(path: Path) -> List[Finding]:
    out: List[Finding] = []
    if path.suffix.lower() == ".md":
        add(out, "ERROR", path.name,
            "Files directly in .claude/skills/ are not loaded. Put each skill in its own "
            "folder: .claude/skills/[skill-name]/SKILL.md.")
    else:
        add(out, "WARN", path.name,
            "Unexpected file directly in .claude/skills/. Skills live in their own folders.")
    return out


def run_unit(kind: str, path: Path) -> List[Finding]:
    if kind == "skill":
        return check_skill_folder(path)
    if kind == "stray":
        return check_stray(path)
    return check_loose(path)


# --- Discovery ----------------------------------------------------------------------

def norm(p: Path) -> str:
    return os.path.normcase(os.path.abspath(str(p)))


def claude_dirs(project: Path) -> List[Path]:
    """The project's .claude folder, plus the .claude folder holding this script if different."""
    dirs = [project / ".claude"]
    own = Path(os.path.abspath(__file__)).parents[3]
    if own.name == ".claude" and norm(own) != norm(dirs[0]):
        dirs.append(own)
    return dirs


def is_home_claude(cd: Path) -> bool:
    return norm(cd) == norm(Path.home() / ".claude")


def tracked_files(project: Path, cdirs: List[Path]) -> Dict[str, Path]:
    """Every file under each skills folder, plus stray skill.md files next to them."""
    files: Dict[str, Path] = {}
    for cd in cdirs:
        skip = frozenset({"synced"}) if is_home_claude(cd) else frozenset()
        skills = cd / "skills"
        if skills.is_dir():
            for p in iter_files(skills, skip):
                files[norm(p)] = p
        for folder in (cd, project):
            if folder.is_dir():
                for p in folder.iterdir():
                    if p.is_file() and p.name.lower() == "skill.md":
                        files[norm(p)] = p
    return files


def unit_for(path: Path, cdirs: List[Path]) -> Optional[Tuple[str, Path]]:
    target = norm(path)
    for cd in cdirs:
        skills = cd / "skills"
        prefix = norm(skills) + os.sep
        if not target.startswith(prefix):
            continue
        parts = target[len(prefix):].split(os.sep)
        if len(parts) == 1:
            return ("loose", path)
        try:
            for child in skills.iterdir():
                if os.path.normcase(child.name) == parts[0]:
                    return ("skill", child)
        except OSError:
            pass
        return None  # the skill folder itself is gone
    return ("stray", path)


def discover_units(project: Path, cdirs: List[Path]) -> List[Tuple[str, Path]]:
    units: Dict[Tuple[str, str], Tuple[str, Path]] = {}
    for cd in cdirs:
        skills = cd / "skills"
        if skills.is_dir():
            skip = {"synced"} if is_home_claude(cd) else set()
            for child in sorted(skills.iterdir()):
                if child.name.startswith(".") or child.name in SKIP_NAMES or child.name in skip:
                    continue
                kind = "skill" if child.is_dir() else "loose"
                units[(kind, norm(child))] = (kind, child)
    for p in tracked_files(project, cdirs).values():
        u = unit_for(p, cdirs)
        if u:
            units.setdefault((u[0], norm(u[1])), u)
    return list(units.values())


def units_from_arg(p: Path, project: Path) -> List[Tuple[str, Path]]:
    if p.is_dir() and p.name == "skills":
        return discover_units(project, [p.parent])
    if p.is_dir() and p.name == ".claude":
        return discover_units(p.parent, [p])
    for anc in (p, *p.parents):
        if anc.parent.name == "skills":
            return [("loose" if anc.is_file() else "skill", anc)]
    return [("stray" if p.is_file() else "skill", p)]


def label(path: Path, project: Path) -> str:
    try:
        return Path(os.path.abspath(path)).relative_to(os.path.abspath(project)).as_posix()
    except ValueError:
        return Path(os.path.abspath(path)).as_posix()


def format_unit(name: str, findings: List[Finding], include_notes: bool) -> List[str]:
    shown = sorted((f for f in findings if include_notes or f.level != "NOTE"),
                   key=lambda f: LEVEL_ORDER[f.level])
    errors = sum(1 for f in findings if f.level == "ERROR")
    warns = sum(1 for f in findings if f.level == "WARN")
    notes = sum(1 for f in findings if f.level == "NOTE")
    head = f"{name}: {plural(errors, 'error')}, {plural(warns, 'warning')}"
    if include_notes and notes:
        head += f", {plural(notes, 'note')}"
    return [head] + [f"  {f.level:<5} {f.where}  {f.message}" for f in shown]


# --- Entry points ------------------------------------------------------------------

def main_manual(args: List[str]) -> int:
    project = Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
    cdirs = claude_dirs(project)
    units: List[Tuple[str, Path]] = []
    for a in args:
        p = Path(a).expanduser()
        p = p if p.is_absolute() else Path(os.getcwd()) / p
        if not p.exists():
            print(f"Path not found: {a}", file=sys.stderr)
            return 2
        units.extend(units_from_arg(Path(os.path.abspath(p)), project))
    if not args:
        units = discover_units(project, cdirs)
    if not units:
        print("No skills found.")
        return 0
    total_e = total_w = 0
    for kind, path in units:
        findings = run_unit(kind, path)
        total_e += sum(1 for f in findings if f.level == "ERROR")
        total_w += sum(1 for f in findings if f.level == "WARN")
        print("\n".join(format_unit(label(path, project), findings, include_notes=True)))
        print()
    print(f"Total: {plural(total_e, 'error')}, {plural(total_w, 'warning')} "
          f"in {plural(len(units), 'item')}.")
    return 1 if total_e else 0


def build_hook_output(event: str, results: List[Tuple[str, List[Finding]]],
                      external: bool, first_run: bool) -> dict:
    errors = sum(1 for _, fs in results for f in fs if f.level == "ERROR")
    warns = sum(1 for _, fs in results for f in fs if f.level == "WARN")
    if first_run:
        intro = "[skill-generator] First run in this project: audited every skill."
    elif external:
        intro = ("[skill-generator] Skill files changed outside this conversation (edited by the "
                 "user or another program). Automated check:")
    else:
        intro = "[skill-generator] A skill file changed. Automated check:"
    lines = [intro, ""]
    for name, findings in results:
        lines += format_unit(name, findings, include_notes=False)
    lines.append("")
    script = Path(os.path.abspath(__file__)).as_posix()
    if errors or warns:
        targets = " ".join(f'"{name}"' for name, fs in results
                           if any(f.level in ("ERROR", "WARN") for f in fs))
        lines.append(
            "Required: follow the skill-generator skill now (invoke it with the Skill tool if its "
            "instructions are not already in this conversation). Fix every ERROR and WARN while "
            "keeping the author's intent, then rerun until it reports 0 errors and 0 warnings:")
        lines.append(f'  python "{script}" {targets}')
        if external:
            lines.append("Do this alongside the user's request and tell the user which skill "
                         "files you changed and why.")
    else:
        lines.append("All automated checks pass. If this change has not been reviewed against the "
                     "skill-generator judgment checklist (step 6) yet, do that before finishing.")
    summary = (f"skill-generator: checked {plural(len(results), 'item')} - "
               f"{plural(errors, 'error')}, {plural(warns, 'warning')}")
    output: dict = {"systemMessage": summary}
    if event in ("PostToolUse", "UserPromptSubmit", "SessionStart"):
        output["hookSpecificOutput"] = {"hookEventName": event, "additionalContext": "\n".join(lines)}
    return output


def load_state(path: Path) -> Optional[Dict[str, list]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (OSError, ValueError):
        return None


def save_state(path: Path, state: Dict[str, list]) -> None:
    tmp = path.with_name(path.name + f".{os.getpid()}.tmp")
    try:
        tmp.write_text(json.dumps(state, indent=0, sort_keys=True), encoding="utf-8")
        os.replace(tmp, path)
    except OSError:
        try:
            tmp.unlink()
        except OSError:
            pass


def main_hook() -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except ValueError:
        data = {}
    event = data.get("hook_event_name") or "PostToolUse"
    here = Path(os.path.abspath(__file__))
    project = Path(os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or here.parents[4])
    cdirs = claude_dirs(project)
    state_path = here.parents[3] / STATE_FILE

    old = load_state(state_path)
    files = tracked_files(project, cdirs)
    snapshot: Dict[str, list] = {}
    for key, p in files.items():
        try:
            st = p.stat()
            snapshot[key] = [st.st_mtime_ns, st.st_size]
        except OSError:
            continue
    changed = set(snapshot) if old is None else {k for k, v in snapshot.items() if old.get(k) != v}
    deleted = set(old or {}) - set(snapshot)

    units: Dict[Tuple[str, str], Tuple[str, Path]] = {}
    for key in sorted(changed):
        u = unit_for(files[key], cdirs)
        if u:
            units.setdefault((u[0], norm(u[1])), u)
    for key in sorted(deleted):
        u = unit_for(Path(key), cdirs)
        if u and u[0] == "skill" and u[1].is_dir():
            units.setdefault((u[0], norm(u[1])), u)

    if units:
        results = [(label(path, project), run_unit(kind, path)) for kind, path in units.values()]
        output = build_hook_output(event, results, external=(event == "UserPromptSubmit"),
                                   first_run=old is None)
        print(json.dumps(output))
    save_state(state_path, snapshot)
    return 0


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except (AttributeError, ValueError):
            pass
    args = sys.argv[1:]
    if args[:1] == ["--hook"]:
        try:
            return main_hook()
        except Exception as exc:  # never block the session because of the validator
            print(json.dumps({"systemMessage": f"skill-generator hook error: {exc}"}))
            return 0
    if args[:1] in (["-h"], ["--help"]):
        print(__doc__)
        return 0
    return main_manual(args)


if __name__ == "__main__":
    sys.exit(main())
