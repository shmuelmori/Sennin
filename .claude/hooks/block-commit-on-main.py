"""PreToolUse hook: block `git commit` while the repository is on `main`.

Claude Code runs this before every Bash and PowerShell tool call and pipes the
hook payload (JSON) to stdin. If the command runs `git commit` and the current
branch is protected, the script exits with code 2: Claude Code blocks the call
and shows the stderr message to Claude.

Anything unexpected (bad payload, git missing, not a repository) exits 0, so a
broken hook never blocks unrelated work.

Requires: Python 3 standard library, and git on PATH.
"""
import json
import re
import subprocess
import sys

# Branches that must never receive commits directly (see CLAUDE.md, Git workflow).
PROTECTED_BRANCHES = {"main"}

# `git`, then any global options (-C <path>, -c <key=value>, --flag[=value]), then `commit`.
GIT_COMMIT = re.compile(r"\bgit(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+commit\b")

# Seconds to wait for `git rev-parse` before giving up and allowing the call.
GIT_TIMEOUT = 10


def current_branch(cwd):
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=GIT_TIMEOUT,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def main():
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        command = (payload.get("tool_input") or {}).get("command") or ""
        if not GIT_COMMIT.search(command):
            return 0
        branch = current_branch(payload.get("cwd") or None)
    except Exception:
        return 0

    if branch in PROTECTED_BRANCHES:
        sys.stderr.write(
            f"Blocked by project hook: the current branch is '{branch}'. "
            f"CLAUDE.md forbids committing directly to {branch}. "
            "Create a branch first as a separate command "
            "(e.g. `git switch -c feature/<short-name>`), then commit there.\n"
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
