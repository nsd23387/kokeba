# Connect GitHub with Codex → push the Kokeba repo
Codex runs shell commands in your terminal, so the reliable path is plain git + the GitHub CLI.

## Prereqs
- Codex installed; open it in the project folder (`cd kokeba`).
- A GitHub Personal Access Token (PAT) with `repo` scope, OR `gh auth login`.

## Push (Codex can run this for you)
    bash ../push-to-github.sh          # remote already set to git@github.com:nsd23387/kokeba.git
…or step by step:
    git init && git add -A && git commit -m "Kokeba" && git branch -M main
    git remote add origin git@github.com:nsd23387/kokeba.git
    git push -u origin main

## Codex conventions used here
- Codex reads **AGENTS.md** at the repo root for project instructions (the Codex equivalent of a project guide).
- Reusable prompts: put markdown prompts in `~/.codex/prompts/` to invoke them as commands.
- MCP servers (optional, e.g. a GitHub MCP): configure under `[mcp_servers.<name>]` in `~/.codex/config.toml`
  — but for pushing, plain `git`/`gh` is simplest and Codex drives it directly.

Security: PAT needs `repo` scope; keep `.env` and any config with secrets gitignored.
