import asyncio
import json
import os
import time
import urllib.request
import urllib.error
from collections import defaultdict, deque

from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

HOST = "127.0.0.1"  # Cloudflare Tunnel connects locally
PORT = 8091
MODEL = os.environ.get("OLLAMA_MODEL", "kairo:latest")
OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
ALLOWED_ORIGIN = "https://yourneighborhoodyapper5-hash.github.io"
MAX_TEXT = 6000
MAX_REQUESTS_PER_MINUTE = 12
MAX_CONCURRENT_AI = 2

requests_by_ip = defaultdict(deque)
ai_slots = asyncio.Semaphore(MAX_CONCURRENT_AI)


def call_ollama(messages):
    body = json.dumps({
        "model": MODEL,
        "messages": messages[-12:],
        "stream": False,
    }).encode()
    req = urllib.request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as response:
        data = json.loads(response.read().decode())
    return data.get("message", {}).get("content", "")


def allowed_rate(ip):
    now = time.monotonic()
    q = requests_by_ip[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= MAX_REQUESTS_PER_MINUTE:
        return False
    q.append(now)
    return True


async def handler(ws):
    headers = ws.request.headers
    origin = headers.get("Origin", "")
    if origin != ALLOWED_ORIGIN:
        await ws.close(code=1008, reason="Origin not allowed")
        return

    # Cloudflare adds this header at the edge. Only trust it when traffic
    # reaches this service through your own Cloudflare Tunnel.
    ip = headers.get("CF-Connecting-IP", "unknown")
    try:
        async for raw in ws:
            if not allowed_rate(ip):
                await ws.send(json.dumps({
                    "error": "Rate limit reached. Try again in a minute."
                }))
                await ws.close(code=1008, reason="Rate limit")
                return

            if len(raw) > 32_000:
                await ws.send(json.dumps({"error": "Request too large"}))
                continue

            try:
                payload = json.loads(raw)
                messages = payload.get("messages", [])
                if not isinstance(messages, list) or not messages:
                    raise ValueError("Send a non-empty messages array")

                safe_messages = []
                for msg in messages[-12:]:
                    role = msg.get("role")
                    content = msg.get("content")
                    if role not in ("system", "user", "assistant"):
                        continue
                    if not isinstance(content, str) or len(content) > MAX_TEXT:
                        raise ValueError("Invalid or oversized message")
                    safe_messages.append({"role": role, "content": content})

                if not safe_messages:
                    raise ValueError("No valid messages")
            except (ValueError, TypeError, AttributeError, json.JSONDecodeError) as exc:
                await ws.send(json.dumps({"error": str(exc)}))
                continue

            try:
                async with ai_slots:
                    answer = await asyncio.wait_for(
                        asyncio.to_thread(call_ollama, safe_messages),
                        timeout=190,
                    )
                await ws.send(json.dumps({"content": answer}))
            except Exception:
                # Keep internal server details out of public responses.
                await ws.send(json.dumps({
                    "error": "AI request failed. Check Vega's Ollama service."
                }))
    except ConnectionClosed:
        pass


async def main():
    async with serve(
        handler,
        HOST,
        PORT,
        origins=[ALLOWED_ORIGIN],
        max_size=32_000,
        max_queue=4,
        ping_interval=20,
        ping_timeout=20,
        server_header=None,
    ):
        print(f"Kairo WebSocket backend listening on {HOST}:{PORT}")
        print(f"Model: {MODEL}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped.")
