# Kairo IDE — starter

A browser-based coding workspace starter for the `Kairo-ide` repository.

## Included
- Monaco code editor (loaded from a CDN)
- File explorer with create/rename/delete
- Local browser storage for edits
- HTML preview
- AI chat panel proxied to local Ollama
- No arbitrary shell/terminal execution

## Run on Vega (Debian)
From this folder:

```bash
python3 server.py
```

Then open `http://127.0.0.1:8090` in a browser on Vega.

The server binds to **127.0.0.1 only** by default. This is intentional: do not expose it to the public internet before adding authentication and access controls.

## AI setup
The proxy expects Ollama at `http://127.0.0.1:11434` and uses model `qwen3:4b` by default.
Override with environment variables if needed:

```bash
KAIRO_OLLAMA_URL=http://127.0.0.1:11434 \
KAIRO_MODEL=qwen3:4b \
python3 server.py
```

The AI proxy endpoint is `/api/chat`. If Ollama is not running, the editor still works; only AI chat will fail.

## Push to GitHub
Copy these files into your cloned repo, inspect them, then commit and push normally. This ZIP does not contain Git credentials or tokens.

```bash
git status
git add README.md index.html styles.css app.js server.py
git commit -m "Add Kairo IDE starter"
git push
```

## Notes
- Monaco is loaded from a CDN, so the first load needs internet access.
- This is a starter, not a full Replit replacement.
- Browser storage is per browser/device. Use the download/export feature to back up project files.
