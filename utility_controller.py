import os
import time
from dotenv import load_dotenv
from utils import is_authorized, read_config, send_image_to_discord
from image_renderer import generate_glass_card

load_dotenv()

PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Config-based State ──────────────────────────────────────────────────────

def get_node_state(token=None):
    """Read current state from config.txt."""
    config = read_config()
    return {
        "prefix": config.get("prefix", "."),
        "catch_enabled": config.get("catch_enabled", "true") == "true",
        "pokemon_channel": config.get("pokemon_channel", ""),
        "listener_id": config.get("listener_id", "self"),
        "token": config.get("token", ""),
        "huggingface_token": config.get("huggingface_token", ""),
        "huggingface_model": config.get("huggingface_model", "imjeffharris/pokemon_classifier"),
    }

def update_node_state(token, data):
    """Write updated values back to config.txt."""
    config = read_config()
    # Map state keys to config keys
    key_map = {
        "catch_enabled": lambda v: "true" if v else "false",
        "prefix": str,
        "pokemon_channel": str,
        "listener_id": str,
        "huggingface_token": str,
        "huggingface_model": str,
    }
    for k, v in data.items():
        if k in key_map:
            config[k] = key_map[k](v)
        else:
            config[k] = str(v)
    
    # Write back
    config_path = os.path.join(BASE_DIR, "config.txt")
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            for key, val in config.items():
                f.write(f"{key}={val}\n")
    except Exception as e:
        print(f"[{PROJECT_NAME}] Config write error: {e}")

# ── Commands System ──────────────────────────────────────────────────────────
import commands

def on_message(resp, bot, token):
    if resp.event.message:
        msg = resp.parsed.auto()
        author = msg.get("author", {})
        author_id = author.get("id")
        author_name = author.get("username", "Unknown")
        channel_id = msg.get("channel_id")
        guild_id = msg.get("guild_id")
        content = msg.get("content", "").strip()
        
        # ── AFK Auto-Responder ──
        config = read_config()
        if config.get("afk_enabled", "false") == "true" and not guild_id:
            try:
                bot_id = bot.gateway.session.user.get('id')
                if bot_id and author_id != bot_id:
                    token1 = config.get("token", "")
                    token2 = config.get("token2", "")
                    afk_msg = ""
                    if token == token1: afk_msg = config.get("afk_msg1", "")
                    elif token == token2: afk_msg = config.get("afk_msg2", "")
                    
                    if afk_msg:
                        # Prevent loops/spam (once per 5 mins per user)
                        global AFK_COOLDOWNS
                        if 'AFK_COOLDOWNS' not in globals():
                            AFK_COOLDOWNS = {}
                        last_afk = AFK_COOLDOWNS.get(author_id, 0)
                        if time.time() - last_afk > 300:
                            bot.sendMessage(channel_id, afk_msg)
                            AFK_COOLDOWNS[author_id] = time.time()
                            from web_server import add_log
                            add_log(f"[{bot_id[:5]}...] AFK auto-responded to DM from {author_name}")
            except Exception: pass
        
        state = get_node_state(token)
        prefix = state.get("prefix", ".")

        if not content.startswith(prefix):
            return

        if not is_authorized(author_id, token):
            return

        from web_server import add_log
        add_log(f"CMD: '{content}' by {author_name}")

        commands.execute(
            content=content,
            prefix=prefix,
            state=state,
            token=token,
            channel_id=channel_id,
            author_id=author_id,
            author_name=author_name,
            bot=bot,
            update_state_func=update_node_state
        )

def setup(bot, token=None):
    bot.gateway.command({"function": lambda resp: on_message(resp, bot, token), "name": "MESSAGE_CREATE"})

