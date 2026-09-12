import os
import json
import time
import asyncio
import http.server
import socketserver
import threading
import webbrowser
from utils import read_config

# SIGNATURE: DEPLOYED_BY_PHEONIX14_SECURE_HASH_8F3B92

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(BASE_DIR, "pages", "index.html")

WS_CLIENTS = set()
LOGS = []
HISTORY_FILE = os.path.join(BASE_DIR, "history.json")

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: pass
    return []

def save_history():
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(STRUCTURED_LOGS, f)
    except: pass

STRUCTURED_LOGS = load_history()

_loop = None

def get_sf_time_str():
    from datetime import datetime, timezone, timedelta
    now_utc = datetime.now(timezone.utc)
    sf_time = now_utc - timedelta(hours=8)
    return sf_time.strftime("%H:%M:%S")

def add_log(msg):
    """Append a log entry and broadcast to all connected WebSocket clients."""
    global _loop
    t_str = get_sf_time_str()
    log_entry = {"time": t_str, "msg": msg}
    LOGS.append(log_entry)
    if len(LOGS) > 500:
        LOGS.pop(0)
    
    _broadcast(json.dumps({"type": "log", "data": log_entry}))

def add_log_structured(name, rarity, image_url="", details="", bot_source="POKETWO", status="success"):
    """Log a structured Pokétwo catch event and broadcast to clients."""
    t_str = get_sf_time_str()
    log_entry = {
        "time": t_str,
        "name": name,
        "rarity": rarity,
        "image_url": image_url,
        "details": details,
        "bot_source": bot_source,
        "status": status
    }
    STRUCTURED_LOGS.insert(0, log_entry) # Put new ones at the top
    if len(STRUCTURED_LOGS) > 1000:
        STRUCTURED_LOGS.pop()
        
    save_history()
    _broadcast(json.dumps({"type": "structured_log", "data": log_entry}))

def clear_history():
    global STRUCTURED_LOGS
    STRUCTURED_LOGS = []
    save_history()
    _broadcast(json.dumps({"type": "history_cleared"}))

def broadcast_engine_state(state, image_url=""):
    """Broadcast engine state to UI (detected, catch_sent, caught)"""
    _broadcast(json.dumps({"type": "engine_state", "data": state, "image_url": image_url}))

def _broadcast(message):
    global _loop
    if _loop and WS_CLIENTS:
        try:
            asyncio.run_coroutine_threadsafe(_async_broadcast(message), _loop)
        except Exception:
            pass

async def _async_broadcast(message):
    global WS_CLIENTS
    disconnected = set()
    for ws in WS_CLIENTS.copy():
        try:
            await ws.send(message)
        except Exception:
            disconnected.add(ws)
    if disconnected:
        WS_CLIENTS -= disconnected

async def _ws_handler(websocket):
    global WS_CLIENTS
    WS_CLIENTS.add(websocket)
    add_log("Dashboard client connected. developed by pheonix14 (v3.0.0)")
    try:
        config = read_config()
        await websocket.send(json.dumps({"type": "config", "data": config}))
        await websocket.send(json.dumps({"type": "logs", "data": LOGS[-50:]}))
        await websocket.send(json.dumps({"type": "structured_logs", "data": STRUCTURED_LOGS}))

        async for message in websocket:
            try:
                msg = json.loads(message)
                msg_type = msg.get("type")

                if msg_type == "update_config":
                    config = read_config()
                    config.update(msg.get("data", {}))
                    write_config(config)
                    add_log(f"Config updated: {list(msg.get('data', {}).keys())}")
                    await _async_broadcast(json.dumps({"type": "config", "data": config}))

                elif msg_type == "get_config":
                    config = read_config()
                    await websocket.send(json.dumps({"type": "config", "data": config}))

                elif msg_type == "react":
                    from interaction_handler import react_to_message
                    channel_id = msg.get("channel_id")
                    message_id = msg.get("message_id")
                    emoji = msg.get("emoji")
                    result = react_to_message(channel_id, message_id, emoji)
                    await websocket.send(json.dumps({"type": "action_result", "data": result}))

                elif msg_type == "click_button":
                    from interaction_handler import click_button
                    channel_id = msg.get("channel_id")
                    message_id = msg.get("message_id")
                    button_label = msg.get("button_label", "")
                    custom_id = msg.get("custom_id", "")
                    result = click_button(channel_id, message_id, button_label, custom_id)
                    await websocket.send(json.dumps({"type": "action_result", "data": result}))

                elif msg_type == "clear_history":
                    clear_history()

            except Exception as e:
                add_log(f"WS message error: {e}")
    except Exception:
        pass
    finally:
        WS_CLIENTS.discard(websocket)

def write_config(config_dict):
    """Save the updated configuration config back to file."""
    config_path = os.path.join(BASE_DIR, "config.txt")
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            for k, v in config_dict.items():
                f.write(f"{k}={v}\n")
    except Exception as e:
        add_log(f"Config write error: {e}")

# ── Watchdog — Monitor config.txt ────────────────────────────────────────────

def _start_watchdog():
    """Watch config.txt for changes and broadcast updates."""
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler

        class ConfigWatcher(FileSystemEventHandler):
            def __init__(self):
                self._last_push = 0

            def on_modified(self, event):
                if event.src_path.replace("\\", "/").endswith("config.txt"):
                    now = time.time()
                    if now - self._last_push < 0.5:
                        return
                    self._last_push = now
                    time.sleep(0.1)
                    config = read_config()
                    _broadcast(json.dumps({"type": "config", "data": config}))

        observer = Observer()
        observer.schedule(ConfigWatcher(), BASE_DIR, recursive=False)
        observer.start()
        add_log("Watchdog monitoring config.txt for live changes.")
    except ImportError:
        add_log("WARNING: watchdog not installed. Live config reload disabled.")

# ── HTTP Server — Serve pages/ and static assets ─────────────────────────────

class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            try:
                with open(INDEX_FILE, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            except FileNotFoundError:
                self.wfile.write(b"<h1>pages/index.html not found</h1>")
        elif self.path == "/api/logs":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(LOGS[-50:]).encode())
        elif self.path == "/api/config":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(read_config()).encode())
        elif self.path.startswith("/api/discord/user?id="):
            user_id = self.path.split("=")[1]
            token = read_config().get("token", "")
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                import requests
                r = requests.get(f"https://discord.com/api/v9/users/{user_id}", headers={"Authorization": token}, timeout=5)
                self.wfile.write(r.content)
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif self.path.startswith("/api/discord/me"):
            # Supports /api/discord/me?token=...
            from urllib.parse import urlparse, parse_qs
            query = parse_qs(urlparse(self.path).query)
            token = query.get("token", [""])[0]
            if not token:
                token = read_config().get("token", "")
                
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                import requests
                r = requests.get("https://discord.com/api/v9/users/@me", headers={"Authorization": token}, timeout=5)
                self.wfile.write(r.content)
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif self.path == "/api/discord/guilds":
            token = read_config().get("token", "")
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                import requests
                r = requests.get("https://discord.com/api/v9/users/@me/guilds", headers={"Authorization": token}, timeout=5)
                self.wfile.write(r.content)
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif self.path.startswith("/api/discord/channels?guild_id="):
            guild_id = self.path.split("=")[1]
            token = read_config().get("token", "")
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                import requests
                r = requests.get(f"https://discord.com/api/v9/guilds/{guild_id}/channels", headers={"Authorization": token}, timeout=5)
                self.wfile.write(r.content)
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.directory = BASE_DIR
            super().do_GET()

    def log_message(self, format, *args):
        pass

# ── Start Everything ─────────────────────────────────────────────────────────

def start_server(http_port=8085, ws_port=8086, open_browser=True):
    """Start HTTP server, WebSocket server, and watchdog. Opens browser."""
    global _loop

    # 1. Start watchdog
    _start_watchdog()

    # 2. Start HTTP server
    def run_http():
        for attempt in range(10):
            try:
                httpd = http.server.HTTPServer(("0.0.0.0", http_port), DashboardHandler)
                add_log(f"Dashboard live at http://localhost:{http_port}")
                httpd.serve_forever()
                break
            except Exception as e:
                add_log(f"HTTP start failed (attempt {attempt+1}/10): {e}. Retrying in 2s...")
                time.sleep(2)

    threading.Thread(target=run_http, daemon=True).start()

    # 3. Start WebSocket server
    async def run_ws():
        global _loop
        _loop = asyncio.get_event_loop()
        import websockets
        async with websockets.serve(_ws_handler, "0.0.0.0", ws_port):
            add_log(f"WebSocket live at ws://localhost:{ws_port}")
            await asyncio.Future()  # Run forever

    def ws_thread():
        for attempt in range(10):
            try:
                asyncio.run(run_ws())
                break
            except Exception as e:
                add_log(f"WebSocket start failed (attempt {attempt+1}/10): {e}. Retrying in 2s...")
                time.sleep(2)

    threading.Thread(target=ws_thread, daemon=True).start()

    # 4. Open browser
    if open_browser:
        time.sleep(0.5)
        webbrowser.open(f"http://localhost:{http_port}")
        add_log("Browser opened automatically.")
