# Sync model (how this repo stays current)
- **Source of truth:** this folder — `/Users/aabebe/Documents/kokeba` (git-connected to github.com/nsd23387/kokeba).
- **Cowork (me):** writes/edits files DIRECTLY here. No more zips.
- **You / Codex:** run git — commit + push (Cowork can't access your GitHub credentials).

## Each time after I make changes
```bash
cd ~/Documents/kokeba
rm -f .git/index.lock      # only if a stale lock appears
git add -A
git commit -m "describe the change"
git push
```
Codex then picks up the latest from the repo (it reads AGENTS.md at the root).
