import threading
import os
import time
import sys
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")

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
    
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
    except ImportError:
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
    try:
        import requests
        import discum
    except ImportError as e:
        print(f"[!] CRITICAL: Missing dependency: {e}")
        print("[!] Please run: pip install -r requirements.txt")
        sys.exit(1)

    # Project Modules
    import utility_controller
    import i_catch
    import interaction_handler
    import web_server

    def start_instance(token):
        try:
            web_server.add_log(f"Booting node: {token[:10]}...")
            bot = discum.Client(token=token, log=False)
            
            interaction_handler.set_bot(bot)
            utility_controller.setup(bot, token)
            i_catch.setup(bot, token)
            
            web_server.add_log(f"Node {token[:10]} SECURED AND ONLINE.")
            bot.gateway.run()
        except Exception as e:
            web_server.add_log(f"NODE CRASHED ({token[:10]}): {e}")

    # 1. Start Dashboard
    web_server.start_server(http_port=8085, ws_port=8086, open_browser=True)

    # 2. Read token
    config = web_server.read_config()
    token = config.get("token", "").strip()
    
    if not token or token == "YOUR_TOKEN_HERE":
        web_server.add_log("No token configured! Open the dashboard Settings tab to set your token.")
        print(f"[{PROJECT_NAME}] Waiting for token to be configured in config.txt...")
        while True:
            try:
                config = web_server.read_config()
                token = config.get("token", "").strip()
                if token and token != "YOUR_TOKEN_HERE":
                    break
                time.sleep(3)
            except KeyboardInterrupt:
                return

    # 3. Boot the bot
    web_server.add_log(f"Token detected. Launching Pokétwo engine...")
    threading.Thread(target=start_instance, args=(token,), daemon=True).start()
    
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
