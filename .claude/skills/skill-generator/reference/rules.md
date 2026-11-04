# Skill authoring rules

The full rule set behind the skill-generator workflow, condensed from the official Claude Code and Agent Skills docs (sources at the end). SKILL.md holds the workflow; read this file for a field's exact behavior, a limit, or an edge case.

## Contents

- Where skills live
- SKILL.md file format
- Frontmatter fields
- Name rules
- Description rules
- Invocation control
- Arguments and string substitutions
- Dynamic context injection
- Body content rules
- Progressive disclosure and supporting files
- Scripts
- Workflows and feedback loops
- How skill content lives in a session
- Portability outside Claude Code
- Testing and evaluation
- Troubleshooting
- Final checklist
- Sources

## Where skills live

A skill is a folder containing a file named exactly `SKILL.md`. The location decides where it loads:

| Scope | Path | Loads in |
| :- | :- | :- |
| Personal | `~/.claude/skills/[skill-name]/SKILL.md` | All your projects on this machine |
| Project | `.claude/skills/[skill-name]/SKILL.md` | This repository; commit it to share with the team |
| Nested | `[subdir]/.claude/skills/[skill-name]/SKILL.md` | Sessions started in or below that folder |
| Plugin | `[plugin]/skills/[skill-name]/SKILL.md` | Wherever the plugin is enabled, as `/plugin-name:skill-name` |
| Enterprise | `.claude/skills/...` in the managed settings directory | Every user the organization deploys it to |

- One folder per skill. Files placed directly in `.claude/skills/` are not loaded.
- Reserved folder names: `synced` (any capitalization), `anthropic-skills`, and anything starting with `anthropic-skills:` outside a plugin.
- A folder name, or the `name` field, must not contain zero-width, control, private-use, or direction-changing characters, non-plain blanks, or `<` / `>`.
- A skill folder may be a symlink; it loads once even if several locations point to it.
- Legacy `.claude/commands/[name].md` files still work as commands. Prefer skills for new work: they support supporting files.
- Edits to an existing SKILL.md apply within the current session. A brand-new top-level skills folder needs `/reload-skills` (or a restart).

## SKILL.md file format

```markdown
---
name: my-skill
description: What this skill does and when to use it
---

Instructions...
```

- Frontmatter is read only when the opening `---` is the first line of the file. Otherwise the whole file, markers included, is treated as content.
- If the YAML does not parse, the skill still loads but with no fields set, so Claude cannot match its description.
- Unrecognized field names are silently ignored; names must match exactly, hyphens included (`allowed-tools`, not `allowed_tools`).
- Boolean fields accept `true`/`false`, `yes`/`no`, `on`/`off`, `1`/`0`, any letter case.
- Quote a value when it contains `: ` (read as a nested field) or ` #` (starts a comment), or starts with a YAML syntax character such as `[`, `{`, `>`, `|`, `*`, `&`, `!`, `%`, `@`, or a backtick.
- Indent with spaces, never tabs.

## Frontmatter fields

All fields are optional for Claude Code, but `name` and `description` are required by the Agent Skills spec, so always set both.

| Field | Behavior and constraints |
| :- | :- |
| `name` | Command name (`/name`). Defaults to the folder name. Lowercase words separated by hyphens. |
| `description` | What the skill does and when to use it. Falls back to the first non-empty body line if omitted. |
| `when_to_use` | Extra trigger phrases, appended to `description`. Counts toward the 1,536-character listing cap. |
| `argument-hint` | Autocomplete hint, for example `"[issue-number]"`. |
| `arguments` | Named positional arguments for `$name` substitution; a space-separated string or YAML list. |
| `disable-model-invocation` | `true`: only the user can invoke it, and the description leaves Claude's context. Also blocks preloading into subagents. |
| `user-invocable` | `false`: hidden from the `/` menu; only Claude invokes it. |
| `allowed-tools` | Tools usable without permission prompts during the invoking turn. Does not restrict other tools. |
| `disallowed-tools` | Tools removed while the skill is active; clears on the next user message. |
| `model` | Model override for the rest of the turn; `inherit` keeps the current one. |
| `effort` | `low`, `medium`, `high`, `xhigh`, or `max` for the turn. |
| `context` | `fork` runs the skill as the prompt of a new subagent with no conversation history. |
| `agent` | Subagent type for `context: fork` (`Explore`, `Plan`, `general-purpose`, or a custom agent). Default `general-purpose`. |
| `background` | With `context: fork`, `false` waits for the result in the same turn. Default `true`. |
| `hooks` | Hooks registered when the skill is invoked, active for the rest of the session. |
| `paths` | Glob patterns limiting automatic activation to matching files, relative to the working directory. |
| `shell` | `bash` (default) or `powershell` for injected shell commands. |
| `metadata` | Free-form map for your own tooling; Claude Code ignores it. |
| `license`, `compatibility` | Agent Skills spec fields; `compatibility` holds at most 500 characters. Accepted, not acted on. |

`allowed-tools` from project skills applies even in untrusted folders, so keep grants narrow, for example `Bash(git add *) Bash(git commit *)` rather than `Bash`.

## Name rules

- At most 64 characters; lowercase letters, digits, and hyphens only; no XML tags.
- Must not contain the reserved words `anthropic` or `claude`.
- Keep it identical to the folder name so `/name` and the folder agree.
- Prefer gerund form: `processing-pdfs`, `analyzing-spreadsheets`, `writing-documentation`. Noun phrases (`pdf-processing`) and action names (`process-pdfs`) are acceptable.
- Avoid vague names (`helper`, `utils`, `tools`) and generic ones (`documents`, `data`, `files`).
- Use one naming pattern across the whole skill collection.

## Description rules

- Required and non-empty; at most 1,024 characters (spec limit). Claude Code also truncates `description` + `when_to_use` at 1,536 characters in the skill listing.
- Write in third person. The description is injected into the system prompt, and a shifting point of view hurts discovery.
  - Good: "Processes Excel files and generates reports"
  - Avoid: "I can help you process Excel files" / "You can use this to process Excel files"
- State what the skill does and when to use it, with the specific terms users say. Claude picks among possibly 100+ skills using only this text.
- Put the key use case first: when the listing overflows its budget, descriptions get shortened.
- No XML tags. `<` and `>` display as `&lt;` and `&gt;`; use `[brackets]` or `argument-hint` for placeholders.
- Good examples:
  - "Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction."
  - "Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes."
- Bad examples: "Helps with documents", "Processes data", "Does stuff with files".

## Invocation control

| Frontmatter | User can invoke | Claude can invoke | Description in Claude's context |
| :- | :- | :- | :- |
| (default) | Yes | Yes | Always |
| `disable-model-invocation: true` | Yes | No | No |
| `user-invocable: false` | No | Yes | Always |

- Use `disable-model-invocation: true` for side effects the user should trigger: deploys, commits, messages.
- Use `user-invocable: false` for background knowledge that isn't a meaningful command.
- Never combine both: nobody could invoke the skill.
- A skill name typed at the start of a message runs it; typed mid-sentence it only grants Claude permission to run it.

## Arguments and string substitutions

| Variable | Meaning |
| :- | :- |
| `$ARGUMENTS` | All arguments. With no placeholder, arguments are appended as `ARGUMENTS: [value]`. |
| `$ARGUMENTS[N]` or `$N` | Argument by 0-based index. Quote multi-word values: `/my-skill "hello world" second`. |
| `$name` | Named argument declared in `arguments`, mapped by position. |
| `${CLAUDE_SKILL_DIR}` | The folder containing SKILL.md. Use it for bundled scripts and files. |
| `${CLAUDE_PROJECT_DIR}` | The project root. |
| `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}` | Current session ID and effort level. |
| `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` | Plugin skills only. |

- An indexed placeholder with no matching argument stays as literal text; a named one becomes empty.
- Escape a literal dollar sign with a backslash. Values are inserted literally and not re-expanded.
- These substitutions apply to SKILL.md only, so avoid writing these variables in SKILL.md prose unless you want them replaced.

## Dynamic context injection

An exclamation mark followed by a backtick-quoted command, at the start of a line or after whitespace, runs the command before Claude sees the skill and replaces the placeholder with its output. A fenced block opened with three backticks and `!` runs several commands.

- Runs once; output is not re-scanned.
- A non-zero exit aborts the whole invocation (exit 1 from search or compare commands excepted). Append `|| true` to commands expected to fail.
- Commands go through permission rules; outside auto mode anything not allowed aborts the skill. Pre-approve them with `allowed-tools`.
- Commands run in the session's working directory with a 2-minute default timeout; use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PROJECT_DIR}` for stable paths.
- Only SKILL.md is processed, so documenting the syntax in a reference file is safe.

## Body content rules

- Keep the SKILL.md body under 500 lines; split into reference files beyond that.
- Concise is key. Claude is already very smart: add only context it lacks, and challenge every paragraph ("Does this justify its token cost?"). Once loaded, every line costs context on every later turn.
- State what to do rather than narrating how or why.
- Write standing instructions that hold for the whole task. Claude doesn't re-read the file on later turns.
- Put the most important instructions near the top; after compaction only the start of the skill is re-attached.
- Set degrees of freedom by fragility:
  - High (text heuristics): many valid approaches, context-dependent decisions.
  - Medium (template or parameterized pseudocode): a preferred pattern with acceptable variation.
  - Low (exact script, no flags to change): fragile, error-prone, or strictly ordered operations.
- Provide one default with an escape hatch instead of many options ("Use pdfplumber; for scanned PDFs use pdf2image with pytesseract").
- Use consistent terminology: one term per concept ("field" everywhere, never mixing "box", "element", "control").
- Avoid time-sensitive information. Describe the current method; put deprecated behavior under an "Old patterns" heading inside `<details>`.
- Use concrete examples, as input/output pairs when output style matters.
- Templates: say "ALWAYS use this exact template" for strict formats, or "a sensible default; adapt as needed" for flexible ones.
- Guide decision points with a conditional workflow ("Creating new content? Follow the creation workflow").
- Always use forward slashes in paths; backslash paths break on Unix systems.
- Reference MCP tools by fully qualified name, `ServerName:tool_name`, so Claude finds the right server.
- Don't assume packages are installed: give the install command, then the usage.
- `context: fork` skills need an explicit task; a skill holding only guidelines returns nothing useful. The `Explore` and `Plan` agents don't load CLAUDE.md, so put everything the task needs in SKILL.md.
- Rules that must hold every time belong in a hook (the skill's `hooks` field or settings.json), not in prose.

## Progressive disclosure and supporting files

At startup only each skill's name and description load. SKILL.md loads when the skill triggers; other files load only when Claude reads them, so bundled material costs nothing until needed.

```text
my-skill/
├── SKILL.md          overview and navigation (required)
├── reference.md      loaded when needed
├── examples.md       loaded when needed
└── scripts/
    └── helper.py     executed, not loaded
```

- SKILL.md is the table of contents: link each file with a note on when to load it, for example `For complete API details, see [reference.md](reference.md)`.
- Keep references one level deep from SKILL.md. Files reached through other files may be read only partially (Claude may preview with `head`).
- Give reference files over 100 lines a contents list at the top.
- Organize by domain so Claude loads only what the task needs (`reference/finance.md`, `reference/sales.md`).
- Name files by content: `form_validation_rules.md`, not `doc2.md`.
- Bundle complete resources freely (API docs, large datasets): they cost nothing until read.
- Patterns: a high-level guide with links; domain-specific folders; basic content inline with advanced details linked.

## Scripts

- Say clearly whether Claude should run a script ("Run `analyze_form.py` to extract fields") or read it as reference ("See `analyze_form.py` for the algorithm"). Running is the default: only the output costs tokens.
- Solve, don't defer: handle errors in the script with explicit, helpful messages instead of failing and leaving Claude to guess.
- No voodoo constants: comment why each value was chosen.
- Prefer bundled scripts for deterministic operations; they are more reliable, cheaper, and more consistent than generated code.
- List required packages and verify they are available in the target environment.
- For batch, destructive, or high-stakes work use plan-validate-execute: write a plan file, validate it with a script, then apply it. Make validator errors specific ("Field 'signature_date' not found. Available fields: ...").
- Reference script paths through `${CLAUDE_SKILL_DIR}` so they work at personal, project, and plugin level.

## Workflows and feedback loops

- Break complex tasks into numbered steps. For long workflows, provide a checklist Claude copies into its response and ticks off.
- Add feedback loops for quality-critical work: run the validator, fix errors, repeat, and only proceed when it passes. The validator can be a script or a checklist file Claude compares against.
- Move very large workflows into separate files and tell Claude which one to read for which task.

## How skill content lives in a session

- Invoked skill content stays in the conversation; re-invoking identical content adds a note instead of a duplicate.
- Claude does not re-read SKILL.md on later turns.
- After auto-compaction, each skill's most recent invocation is re-attached with only its first 5,000 tokens; all re-attached skills share a 25,000-token budget, filled from the most recent. Invoke the skill again to restore it fully.
- The skill listing has a budget of about 1% of the context window. When it overflows, descriptions of the least-used skills are dropped first.

## Portability outside Claude Code

claude.ai uploads, the Skills API, and `package_skill.py` accept only `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`. Any other field is a hard error there:

```text
Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name
```

Claude Code-only fields are fine for skills used only in Claude Code. On the API there is no network access and no runtime package installation.

## Testing and evaluation

- Build evaluations before writing extensive documentation: run representative tasks without the skill, note the failures, then write at least three scenarios that test those gaps.
- Establish a baseline without the skill, write minimal instructions that close the gaps, and iterate.
- Compare runs with and without the skill in fresh sessions so leftover context doesn't hide gaps.
- Test with every model you plan to use: Haiku may need more guidance; Opus should not be over-explained to.
- Check triggering on prompts that should and should not activate the skill.
- Observe how Claude navigates the skill: unexpected reading order, missed links, files read repeatedly (move them into SKILL.md), or files never read (remove them or signal them better).
- Iterate with two instances: one helps refine the skill, a fresh one uses it on real tasks.
- The `skill-creator` plugin automates evals, benchmarks, and description tuning.

## Troubleshooting

- **Not triggering**: make the description contain the words users naturally say; confirm the skill appears in "What skills are available?"; invoke it with `/name`; if `paths` is set, confirm the files are inside the working directory. Malformed YAML loads the skill with empty metadata; run `claude --debug` to see the parse error, or `claude plugin validate .claude/skills`.
- **Triggers too often**: make the description more specific, or set `disable-model-invocation: true`.
- **Claude stops following it**: move must-hold rules into hooks; word guidance so it applies to the whole task; re-invoke after compaction and keep key instructions near the top.
- **Description cut short**: shorten `description` + `when_to_use` with the key use case first; `/doctor` estimates the listing cost.
- **Angle brackets show as entities**: use `[brackets]` or `argument-hint`.

## Final checklist

Core quality:
- [ ] Description is specific, includes key terms, and says both what the skill does and when to use it
- [ ] SKILL.md body is under 500 lines; extra detail lives in separate files
- [ ] No time-sensitive information (or it sits in an "Old patterns" section)
- [ ] Consistent terminology throughout
- [ ] Examples are concrete
- [ ] File references are one level deep; progressive disclosure is used where it helps
- [ ] Workflows have clear steps

Code and scripts:
- [ ] Scripts solve problems rather than defer to Claude, with explicit, helpful error handling
- [ ] Every constant is justified
- [ ] Required packages are listed and verified
- [ ] Scripts are documented
- [ ] Only forward-slash paths
- [ ] Validation steps for critical operations; feedback loops for quality-critical tasks

Testing:
- [ ] At least three evaluations
- [ ] Tested with every model it will run on
- [ ] Tested on real usage scenarios
- [ ] Team feedback incorporated, if applicable

## Sources

- Claude Code skills: https://code.claude.com/docs/en/skills
- Skill authoring best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Hooks: https://code.claude.com/docs/en/hooks
