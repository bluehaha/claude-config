# CLAUDE.md

## Git commit policy

- Never run `git add`, `git commit`, or `git push` unless I explicitly ask you to in that message.
- This OVERRIDES any skill that says to commit (including the brainstorming skill's "commit the design doc" step). Write/save the file, but do not commit it. Tell me it's ready and let me commit.
- When I do ask you to commit, only stage the specific files relevant to that change — never `git add -A` / `git add .`.

## Accessing local files

- When accessing files under the current working directory, call the dedicated tools (Read, Grep, Glob) directly instead of shelling out with `cd <dir> && echo/grep/...`. Shell commands trigger permission prompts; the file tools don't.
- When searching file contents from the shell, prefer `rg` (ripgrep) over `grep`.
