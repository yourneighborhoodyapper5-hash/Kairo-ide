#!/usr/bin/env python3
"""Local-only static server and Ollama chat proxy for Kairo IDE."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json
import os

HOST = "100.78.110.95"
PORT = int(os.environ.get("KAIRO_IDE_PORT", "8090"))
OLLAMA_URL = os.environ.get("KAIRO_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
MODEL = os.environ.get("KAIRO_MODEL", "kairo:latest")


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404, "Not found")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 1_000_000:
                self.send_error(400, "Invalid request size")
                return
            payload = json.loads(self.rfile.read(length))
            messages = payload.get("messages")
            if not isinstance(messages, list) or not messages:
                self.send_error(400, "messages must be a non-empty list")
                return
            upstream = {
                "model": MODEL,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.4}
            }
            req = Request(
                OLLAMA_URL + "/api/chat",
                data=json.dumps(upstream).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(req, timeout=180) as response:
                result = json.loads(response.read().decode("utf-8"))
            answer = result.get("message", {}).get("content", "")
            body = json.dumps({"answer": answer}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (ValueError, json.JSONDecodeError):
            self.send_error(400, "Invalid JSON")
        except (URLError, HTTPError, TimeoutError) as exc:
            body = json.dumps({
                "error": "Could not reach Ollama. Check that Ollama is running.",
                "detail": str(exc)[:300]
            }).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[Kairo IDE] " + (fmt % args))


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Kairo IDE: http://{HOST}:{PORT}")
    print(f"Ollama endpoint: {OLLAMA_URL} (model: {MODEL})")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
