import threading
import os
import time
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Dependency Health Check
try:
    import requests
    import discum
except ImportError as e:
    print(f"[!] CRITICAL: Missing dependency: {e}")
    print("[!] Please run: pip install -r requirements.txt")

# Project Modules — Pokétwo Only
import utility_controller
import i_catch
import interaction_handler
import web_server

PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")

def start_instance(token):
    try:
        web_server.add_log(f"Booting node: {token[:10]}...")
        bot = discum.Client(token=token, log=False)
        
        # Store bot globally for interaction_handler
        interaction_handler.set_bot(bot)
        
        # Inject Pokétwo modules into this node's gateway
        utility_controller.setup(bot, token)
        i_catch.setup(bot, token)
        
        web_server.add_log(f"Node {token[:10]} SECURED AND ONLINE.")
        bot.gateway.run()
    except Exception as e:
        web_server.add_log(f"NODE CRASHED ({token[:10]}): {e}")

def watch_files():
    files_mtime = {}
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    def get_mtimes():
        mtimes = {}
        for root, _, files in os.walk(base_dir):
            if "node_modules" in root or "__pycache__" in root or ".git" in root or ".venv" in root:
                continue
            for file in files:
                if file.endswith('.py'):
                    path = os.path.join(root, file)
                    mtimes[path] = os.path.getmtime(path)
        return mtimes

    files_mtime = get_mtimes()
    
    while True:
        time.sleep(2)
        current_mtimes = get_mtimes()
        for path, mtime in current_mtimes.items():
            if path in files_mtime and mtime > files_mtime[path]:
                print(f"\n[{PROJECT_NAME}] HOT-RELOAD: File change detected in {os.path.basename(path)}. Restarting...")
                os.execv(sys.executable, ['python'] + sys.argv)
        files_mtime = current_mtimes

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
        
# SIGNATURE: DEPLOYED_BY_PHEONIX14_SECURE_HASH_8F3B92
    print(r"""
    ██████╗  █████╗ ██████╗ ██╗  ██╗
    ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝
    ██║  ██║███████║██████╔╝█████╔╝ 
    ██║  ██║██╔══██║██╔══██╗██╔═██╗ 
    ██████╔╝██║  ██║██║  ██║██║  ██╗
    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
    """)
    print(f"[{PROJECT_NAME}] SYSTEM OVERRIDE INITIATED... developed by pheonix14")
    
    # 0. Start hot-reload watcher thread
    threading.Thread(target=watch_files, daemon=True).start()
    
    # 1. Start Dashboard (HTTP + WebSocket + auto-open browser)
    web_server.start_server(http_port=8085, ws_port=8086, open_browser=True)

    # 2. Read token from config.txt
    config = web_server.read_config()
    token = config.get("token", "").strip()
    
    if not token or token == "YOUR_TOKEN_HERE":
        web_server.add_log("No token configured! Open the dashboard Settings tab to set your token.")
        print(f"[{PROJECT_NAME}] Waiting for token to be configured in config.txt...")
        # Poll until token is configured
        while True:
            try:
                config = web_server.read_config()
                token = config.get("token", "").strip()
                if token and token != "YOUR_TOKEN_HERE":
                    break
                time.sleep(3)
            except KeyboardInterrupt:
                print(f"[{PROJECT_NAME}] SHUTDOWN SIGNAL RECEIVED.")
                return
    
    # 3. Boot the bot
    web_server.add_log(f"Token detected. Launching Pokétwo engine...")
    threading.Thread(target=start_instance, args=(token,), daemon=True).start()
    
    # 4. Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n[{PROJECT_NAME}] SHUTDOWN SIGNAL RECEIVED.")

if __name__ == "__main__":
    main()
