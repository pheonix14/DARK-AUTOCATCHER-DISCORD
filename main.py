import threading
import os
import time
import sys
import subprocess
from dotenv import load_dotenv

os.system("color")  # Enable ANSI colors on Windows

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
# Load environment variables
load_dotenv()
PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    WATCHDOG_INSTALLED = True
except ImportError:
    WATCHDOG_INSTALLED = False

try:
    import requests
    import discum
    DEPENDENCIES_INSTALLED = True
except ImportError as e:
    DEPENDENCIES_INSTALLED = False
    DEPENDENCY_ERROR = e

# Project Modules
if DEPENDENCIES_INSTALLED:
    import utility_controller
    import i_catch
    import spawner
    import interaction_handler
    import web_server

def run_supervisor():
    print(r"""
    ██████╗  █████╗ ██████╗ ██╗  ██╗
    ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝
    ██║  ██║███████║██████╔╝█████╔╝ 
    ██║  ██║██╔══██║██╔══██╗██╔═██╗ 
    ██████╔╝██║  ██║██║  ██║██║  ██╗
    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
    """)
    print(f"[{PROJECT_NAME}] SYSTEM OVERRIDE INITIATED... developed by pheonix14")
    print(f"[{PROJECT_NAME}] SUPERVISOR MODE: Watchdog is actively monitoring files for seamless updates.")
    
    if not WATCHDOG_INSTALLED:
        print("[!] Watchdog not installed. Please run: pip install watchdog")
        sys.exit(1)

    class Reloader(FileSystemEventHandler):
        def __init__(self):
            self.process = None
            self.last_reload = time.time()
            self.start_worker()

        def start_worker(self):
            env = os.environ.copy()
            env["DARK_WORKER"] = "1"
            self.process = subprocess.Popen([sys.executable, __file__], env=env)

        def restart_worker(self):
            if self.process:
                self.process.terminate()
                self.process.wait()
            self.start_worker()

        def on_modified(self, event):
            if event.src_path.endswith('.py') and time.time() - self.last_reload > 2.0:
                print(f"\n[{PROJECT_NAME}] WATCHDOG: File {os.path.basename(event.src_path)} changed. Seamlessly applying updates...")
                self.last_reload = time.time()
                self.restart_worker()

    handler = Reloader()
    observer = Observer()
    observer.schedule(handler, path=".", recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n[{PROJECT_NAME}] SHUTDOWN SIGNAL RECEIVED.")
        observer.stop()
        if handler.process:
            handler.process.terminate()
    observer.join()

def main_worker():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

    # Dependency Health Check
    if not DEPENDENCIES_INSTALLED:
        print(f"[!] CRITICAL: Missing dependency: {DEPENDENCY_ERROR}")
        print("[!] Please run: pip install -r requirements.txt")
        sys.exit(1)

    def start_instance(token):
        try:
            web_server.add_log(f"Booting node: {token[:10]}...")
            bot = discum.Client(token=token, log=False)
            
            interaction_handler.set_bot(bot)
            utility_controller.setup(bot, token)
            i_catch.setup(bot, token)
            spawner.setup(bot, token)
            
            web_server.add_log(f"Node {token[:10]} SECURED AND ONLINE.")
            bot.gateway.run()
        except Exception as e:
            web_server.add_log(f"NODE CRASHED ({token[:10]}): {e}")

    # 1. Start Dashboard
    is_cloud = os.environ.get("RENDER") == "true" or os.environ.get("DOCKER") == "1" or "PORT" in os.environ
    http_port = int(os.environ.get("PORT", 8085))
    web_server.start_server(http_port=http_port, ws_port=8086, open_browser=not is_cloud)

    # 2. Read Configuration
    config = web_server.read_config()
    print(f"[{PROJECT_NAME}] [CONFIG SYNCED] Successfully read configuration from config.txt")

    # 3. Boot the bots dynamically
    tokens_to_boot = []
    for k, v in config.items():
        if k.startswith("token") and not k.startswith("token_status") and isinstance(v, str):
            val = v.strip()
            if val and val != "YOUR_TOKEN_HERE" and val not in tokens_to_boot:
                status_key = "token_status" + k[len("token"):]
                if config.get(status_key, "enabled") == "enabled":
                    tokens_to_boot.append(val)

    if not tokens_to_boot:
        web_server.add_log("No valid token configured or all accounts are on HOLD! Open the dashboard Settings tab to set your tokens.")
        wait_printed = False
        while True:
            if not wait_printed:
                print(f"[{PROJECT_NAME}] Waiting for token to be configured in config.txt...")
                wait_printed = True
            try:
                config = web_server.read_config()
                for k, v in config.items():
                    if k.startswith("token") and not k.startswith("token_status") and isinstance(v, str):
                        val = v.strip()
                        if val and val != "YOUR_TOKEN_HERE" and val not in tokens_to_boot:
                            status_key = "token_status" + k[len("token"):]
                            if config.get(status_key, "enabled") == "enabled":
                                tokens_to_boot.append(val)
                if tokens_to_boot:
                    break
                time.sleep(3)
            except KeyboardInterrupt:
                return

    web_server.add_log(f"Detected {len(tokens_to_boot)} token account(s). Launching Pokétwo engine instances...")
    web_server.add_log("⭐ Like the bot? Consider buying Premium to support its development! Check the Premium tab.")
    for idx, tok in enumerate(tokens_to_boot, start=1):
        web_server.add_log(f"Launching bot instance #{idx}...")
        threading.Thread(target=start_instance, args=(tok,), daemon=True).start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

if __name__ == "__main__":
    if os.environ.get("DARK_WORKER") == "1":
        main_worker()
    else:
        run_supervisor()
