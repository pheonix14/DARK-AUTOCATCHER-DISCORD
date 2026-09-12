import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_pokemon_list():
    """Load Pokémon names from local pokemon_list.txt."""
    try:
        list_path = os.path.join(BASE_DIR, "pokemon_list.txt")
        with open(list_path, "r", encoding="utf-8") as f:
            return [line.strip().lower() for line in f.readlines() if line.strip()]
    except FileNotFoundError:
        return []

def read_config():
    """Read config.txt into a dict."""
    config = {}
    config_path = os.path.join(BASE_DIR, "config.txt")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        config[key.strip()] = val.strip()
        except Exception:
            pass
    return config

def write_config(config_dict):
    """Save updated configuration dictionary back to config.txt, preserving all existing keys."""
    config_path = os.path.join(BASE_DIR, "config.txt")
    current = read_config()
    current.update(config_dict)
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            for k, v in current.items():
                f.write(f"{k}={v}\n")
    except Exception as e:
        print(f"[{PROJECT_NAME}] Config write error: {e}")

self_info_cache = {}

def get_self_info(token):
    """Get Discord user details (id, username, global_name) for a given token."""
    if not token:
        return {"id": "", "username": "", "global_name": ""}
    if token in self_info_cache:
        return self_info_cache[token]
    try:
        import requests
        headers = {"Authorization": token, "User-Agent": "Mozilla/5.0"}
        r = requests.get("https://discord.com/api/v9/users/@me", headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            info = {
                "id": str(data.get('id', '')),
                "username": str(data.get('username', '')),
                "global_name": str(data.get('global_name', '') or data.get('username', ''))
            }
            self_info_cache[token] = info
            return info
    except Exception:
        pass
    return {"id": "", "username": "", "global_name": ""}

def get_self_id(token):
    """Get the Discord user ID for a given token."""
    return get_self_info(token).get("id", "")

def is_authorized(user_id, token=None):
    """
    Checks if a user is authorized based on config.txt listener_id setting.
    - listener_id=self → only the bot's own user ID
    - listener_id=ID1,ID2 → those specific IDs
    - listener_id= (empty) → nobody (bot ignores all commands)
    """
    config = read_config()
    listener_id = config.get("listener_id", "self").strip()
    
    # Always allow the self user
    self_id = get_self_id(token) if token else ""
    
    user_id = str(user_id)
    
    if listener_id == "self":
        # Only the bot's own account
        return user_id == self_id
    elif listener_id == "":
        # Listen to no one
        return False
    else:
        # Custom listener IDs (comma-separated)
        allowed = [i.strip() for i in listener_id.split(",") if i.strip()]
        # Also include self if it's explicitly in the list
        if "self" in allowed and self_id:
            allowed.append(self_id)
        return user_id in allowed

def is_developer(user_id):
    """Checks if a user is the Developer."""
    return str(user_id) == os.getenv("DEVELOPER_ID", "")

def log_to_nexus(name, rarity, account_id, image_url="", details="", bot_source="POKETWO", status="success"):
    """Dispatches a structured log entry to the WebSocket dashboard."""
    try:
        from web_server import add_log_structured
        add_log_structured(name, rarity, image_url, details, bot_source, status)
    except Exception:
        pass

def send_image_to_discord(token, channel_id, file_path, content="", components=None, auto_delete_delay=0):
    """Uploads a generated image directly to Discord API with optional interactive button components and auto-delete timer."""
    import requests, json, threading, time
    url = f"https://discord.com/api/v9/channels/{channel_id}/messages"
    headers = {"Authorization": token}
    try:
        with open(file_path, "rb") as f:
            files = {"file": ("response.png", f, "image/png")}
            payload = {}
            if content:
                payload["content"] = content
            if components:
                payload["components"] = components
            
            data = {"payload_json": json.dumps(payload)} if components else {"content": content}
            r = requests.post(url, headers=headers, files=files, data=data, timeout=10)
            if r.status_code not in [200, 201]:
                # Fallback simple POST
                f.seek(0)
                r = requests.post(url, headers=headers, files={"file": ("response.png", f, "image/png")}, data={"content": content}, timeout=10)
            
            if r.status_code in [200, 201] and auto_delete_delay > 0:
                try:
                    msg_id = r.json().get("id")
                    if msg_id:
                        def delayed_del():
                            time.sleep(auto_delete_delay)
                            try:
                                requests.delete(f"https://discord.com/api/v9/channels/{channel_id}/messages/{msg_id}", headers=headers, timeout=5)
                            except Exception: pass
                        threading.Thread(target=delayed_del, daemon=True).start()
                except Exception: pass

            return r.status_code in [200, 201]
    except Exception as e:
        print(f"[DARK] Error sending image file to Discord: {e}")
        return False
