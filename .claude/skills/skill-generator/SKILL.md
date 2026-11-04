---
name: skill-generator
description: Creates, updates, and audits Claude Code skills so every SKILL.md follows the official authoring rules - folder layout, frontmatter fields, naming, third-person descriptions, the 500-line limit, and one-level-deep reference files. Use when creating, editing, renaming, moving, or reviewing a skill, when any file under .claude/skills/ changes, when a stray Skill.md needs converting into a proper skill, or when the user mentions skills, SKILL.md, or skill frontmatter.
argument-hint: "[skill-name or path]"
---

# Skill generator

Target: $ARGUMENTS

If no target is given above, use the skill being created or changed in this conversation; if there is none, audit every skill in `.claude/skills/`.

Apply this workflow to every skill you create or change for the rest of the task, not only the first one. A project hook runs the validator after each change to a skill file and posts a `[skill-generator]` report; when one appears, resume this workflow.

## Workflow

Copy this checklist and tick it off as you go:

```
Skill progress:
- [ ] 1. Classify the job
- [ ] 2. Frontmatter
- [ ] 3. Body
- [ ] 4. Supporting files
- [ ] 5. Validate until clean
- [ ] 6. Judgment review
- [ ] 7. Report
```

### 1. Classify the job

- **New skill**: create `.claude/skills/[name]/SKILL.md` from the template below. Use `~/.claude/skills/[name]/` only when the user wants the skill in every project.
- **Change to a skill**: read the whole skill folder first. Keep the author's intent; change wording and structure, not meaning.
- **Stray file** (a skill anywhere other than `.claude/skills/[name]/SKILL.md`, such as `.claude/Skill.md`): create the proper folder, move the file there, fix it, and make sure no copy is left at the old location.

### 2. Frontmatter

- The opening `---` is line 1 of the file; a closing `---` follows the fields.
- `name`: identical to the folder name. Lowercase letters, digits, and single hyphens; at most 64 characters; never containing `anthropic` or `claude`. Specific, never `helper`, `utils`, `tools`, `data`, or `files`. Use a gerund (`processing-pdfs`) or a noun phrase (`pdf-processing`), matching the pattern the other skills in the folder use.
- `description`: third person ("Processes...", never "I..." or "You can..."). First what the skill does, then "Use when..." with the situations and words a user would actually type. Key use case first. At most 1,024 characters. No angle brackets; write placeholders as `[name]`.
- Wrap a value in double quotes when it contains `: ` or ` #`, or starts with `[`, `{`, `>`, `|`, `*`, `&`, `%`, `@`, or a backtick.
- Add other fields only when they change behavior (full list in [reference/rules.md](reference/rules.md)):
  - side effects the user should trigger (deploy, commit, send) → `disable-model-invocation: true`
  - background knowledge that is not a command → `user-invocable: false`
  - a self-contained task that should run in isolation → `context: fork`, and the body must state the task explicitly

### 3. Body

- Under 500 lines. Put the instructions that matter most at the top; after context compaction only the start of a skill is kept.
- Write only what Claude doesn't already know. Cut background explanations, definitions of common terms, and motivational text.
- Write imperative, standing instructions that hold for the whole task ("Run the tests after every edit", not "Run the tests").
- Match freedom to fragility: heuristics for open-ended work, a template where a pattern is preferred, an exact command for fragile operations.
- Give one default approach (plus an escape hatch), not a menu of options.
- Use one term per concept throughout.
- Show concrete examples, as input → output pairs when style matters.
- Multi-step tasks get numbered steps and a copyable checklist; quality-critical steps get a validate → fix → repeat loop.
- No dated statements; put legacy behavior in an "Old patterns" `<details>` block.
- Forward slashes in every path. Point at bundled files with a path relative to the skill folder or the skill-directory variable (see [reference/rules.md](reference/rules.md)), never an absolute machine path.
- Name MCP tools in full (`ServerName:tool_name`).
- A rule that must hold every time, even when Claude would skip it, belongs in a hook, not in prose.

### 4. Supporting files

- Move material that isn't needed on every run into separate files. Link each one directly from SKILL.md with a line saying when to read or run it.
- Keep references one level deep: a reference file never sends Claude on to another reference file.
- Start any reference file over 100 lines with a `## Contents` list.
- Name files by content (`reference/billing.md`, not `doc2.md`).
- For each script, say whether Claude should run it or read it. Scripts handle their own errors with clear messages, explain every constant, and list the packages they need.

### 5. Validate until clean

Run the validator on the skill folder (or a stray file):

```bash
python "${CLAUDE_SKILL_DIR}/scripts/validate_skill.py" ".claude/skills/[name]"
```

With no path it checks every skill in `.claude/skills/` plus stray skill files. Fix every ERROR (breaks loading or the spec) and every WARN (breaks a best practice), then run it again. Repeat until it reports 0 errors and 0 warnings. Keep a WARN only as a deliberate choice, and say why in the report. NOTE lines are information only.

### 6. Judgment review

The validator can't judge these; check each one:

- Would the description make Claude pick this skill for the requests it should handle, and skip it for the rest?
- Does every paragraph earn its tokens?
- Is terminology consistent, and do the instructions agree with the other skills in `.claude/skills/`?
- Are the examples concrete?
- Does the name follow the same pattern as the other skills?

### 7. Report

Tell the user: the files created, moved, or changed; the final validator result; any WARN kept on purpose; and, for a new skill, three realistic prompts to try in a fresh session (two that should trigger it, one that should not).

## New skill template

```markdown
---
name: [skill-name]
description: [Does X and Y for Z]. Use when [situations and words that should trigger it].
---

# [Skill title]

[Core instructions: imperative, standing, most important first.]

## [Workflow or rules]

1. [Step]

## Additional resources

- For [topic], see [reference/topic.md](reference/topic.md).
```

## Full rules

Field reference, string substitutions, invocation control, portability, testing, and troubleshooting: [reference/rules.md](reference/rules.md). Read it when a field, limit, or edge case isn't covered above.
