# Connect GitHub in Claude Code → push the Kokeba repo

Verified against GitHub's official install guide (github/github-mcp-server) and Claude Code MCP docs.

## 0. Prereqs
- Claude Code CLI installed, opened **inside your project folder** (`cd kokeba` after unzipping the scaffold).
- A GitHub **Personal Access Token (PAT)** with the `repo` scope: https://github.com/settings/personal-access-tokens/new
- Keep the token out of git:
  ```bash
  echo "GITHUB_PAT=your_token_here" > .env
  printf ".env\n.mcp.json\n" >> .gitignore
  ```

## 1. Add the GitHub MCP server (run in your terminal, NOT inside Claude Code)

**Remote / hosted (Claude Code 2.1.1+, recommended — no Docker):**
```bash
claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer '"$(grep GITHUB_PAT .env | cut -d= -f2)"'"}}'
```

**Older Claude Code (2.1.0 or earlier):**
```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp \
  -H "Authorization: Bearer $(grep GITHUB_PAT .env | cut -d= -f2)"
```

**Local via Docker (alternative):**
```bash
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=$(grep GITHUB_PAT .env | cut -d= -f2) \
  -- docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server
```

**Scope (optional, append to any command above):**
- `--scope local` (default) — just you, this project
- `--scope project` — shared via a committed `.mcp.json`
- `--scope user` — you, across all projects

## 2. Verify the connection
```bash
claude mcp list          # github should be listed
claude mcp get github
```
Then start Claude Code and run `/mcp` — `github` should show as connected (authenticate there if prompted).

## 3. Push the repo
Inside Claude Code, either run the custom command (next file) :
```
/push-kokeba kokeba private
```
…or just prompt it in plain English:
> Initialize git here, create a new private GitHub repo named "kokeba" using the github MCP server, then push everything to the main branch and give me the URL.

## Notes / caveats
- The npm package `@modelcontextprotocol/server-github` is deprecated (April 2025) — use the server above.
- Remote server needs Streamable HTTP support (current Claude Code).
- The actual file upload happens over `git push` (fast, all files at once). The MCP server is used to create the repo and for GitHub operations — not to upload 100+ files one by one.
- Token security: never commit `.env` or `.mcp.json`.
