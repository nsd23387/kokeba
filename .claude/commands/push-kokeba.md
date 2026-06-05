---
description: Create a GitHub repo and push the current project to it
argument-hint: [repo-name] [public|private]
allowed-tools: Bash(git*), Bash(gh*), mcp__github__*
---

You are connecting this project to GitHub and pushing it.

Arguments: `$ARGUMENTS`
- First word = repository name (default: `kokeba` if omitted)
- Second word = visibility, `public` or `private` (default: `private`)

Do the following, stopping and reporting if any step fails:

1. If this folder is not yet a git repo, initialize it:
   `git init && git add -A && git commit -m "Initial commit: Kokeba platform scaffold" && git branch -M main`
   If it is already a repo, just stage and commit any uncommitted changes.

2. Create a new GitHub repository with the requested name and visibility using the **github MCP server** (the `create_repository` tool). Capture the returned clone URL / owner.

3. Add it as the `origin` remote (use the authenticated HTTPS URL) and push:
   `git remote add origin <repo-url> && git push -u origin main`

4. Report back the repository URL and confirm the push succeeded (branch `main`).

Notes:
- Do not print the PAT or any secrets.
- Never commit `.env` or `.mcp.json` — confirm they are gitignored before the first push.
