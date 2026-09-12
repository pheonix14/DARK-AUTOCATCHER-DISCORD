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

self_id_cache = {}

def get_self_id(token):
    """Get the Discord user ID for a given token."""
    if token in self_id_cache:
        return self_id_cache[token]
    try:
        import requests
        r = requests.get("https://discord.com/api/v9/users/@me", headers={"Authorization": token}, timeout=5)
        if r.status_code == 200:
            self_id_cache[token] = str(r.json().get('id'))
            return self_id_cache[token]
    except:
        pass
    return ""

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

def send_image_to_discord(token, channel_id, file_path, content=""):
    """Uploads a generated image directly to Discord API."""
    import requests
    url = f"https://discord.com/api/v9/channels/{channel_id}/messages"
    headers = {"Authorization": token}
    try:
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {"content": content}
            r = requests.post(url, headers=headers, files=files, data=data, timeout=10)
            return r.status_code == 200
    except Exception as e:
        print(f"[DARK] Error sending image file to Discord: {e}")
        return False
