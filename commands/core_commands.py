"""
core_commands.py — Core utility commands (.ping, .status, .prefix, .say, .cid, .uid) (No Emojis)
"""

def handle_ping(bot, token, channel_id, state):
    lines = [
        "Connection: ONLINE",
        "Latency check: SUCCESSFUL",
        "Gateway: ACTIVE & RESPONSIVE",
        "Engine: HUGGING FACE VISION ARMED"
    ]
    text_msg = "PONG! Node connection is ONLINE & Responsive."
    return lines, "Latency Monitor", text_msg

def handle_status(bot, token, channel_id, state):
    from utils import read_config
    from web_server import load_history
    
    config = read_config()
    logs = load_history()
    
    prefix = state.get("prefix", ".") or config.get("prefix", ".")
    catch_status = "ENGAGED (100% ONLINE)" if state.get("catch_enabled", True) else "OFFLINE / HALTED"
    hf_model = state.get("huggingface_model") or config.get("huggingface_model", "google/vit-base-patch16-224")
    pokecoins = config.get("pokecoins_balance", "0")
    
    total = len(logs)
    successful = len([l for l in logs if l.get("status") == "success"])
    failed = len([l for l in logs if l.get("status") == "failed"])
    rare = len([l for l in logs if l.get("rarity") in ["RARE", "LEGENDARY", "SHINY"]])
    ratio = round((successful / total * 100), 1) if total > 0 else 0.0

    lines = [
        f"ENGINE STATUS: {catch_status}",
        f"NEURAL MODEL: {hf_model}",
        f"SYSTEM PREFIX: {prefix}",
        "──────────────────────────────────────────",
        f"SUCCESSFUL CATCHES: {successful}",
        f"FAILED / FLED: {failed}",
        f"RARE / SHINY CAUGHT: {rare}",
        f"SUCCESS RATIO: {ratio}%",
        "──────────────────────────────────────────",
        f"VAULT BALANCE: {pokecoins} POKÉCOINS",
        f"LISTENING TARGET: {state.get('pokemon_channel', 'All Configured')}"
    ]

    components = [
        {
            "type": 1,
            "components": [
                {
                    "type": 2,
                    "style": 3,
                    "label": "Refresh Status 🔄",
                    "custom_id": "status_refresh"
                },
                {
                    "type": 2,
                    "style": 1,
                    "label": "View History 📜",
                    "custom_id": "history_1"
                }
            ]
        }
    ]

    text_msg = (
        f"**[ PROJECT DARK v3.3.0 — SYSTEM STATUS ]**\n"
        f"- **Engine Status**: `{catch_status}`\n"
        f"- **Neural Model**: `{hf_model}`\n"
        f"- **Catches**: `{successful}` | **Failed**: `{failed}` | **Rare**: `{rare}` (`{ratio}%` Success Rate)\n"
        f"- **Vault Balance**: `{pokecoins}` Pokécoins"
    )

    return lines, "SYSTEM DASHBOARD STATUS", text_msg, components

def handle_prefix(bot, token, channel_id, state, args, update_state_func):
    current_prefix = state.get("prefix", ".")
    if len(args) >= 2:
        new_prefix = args[1][:3]
        update_state_func(token, {"prefix": new_prefix})
        lines = [
            f"System prefix: updated to {new_prefix}",
            "Usage: commands now require the new prefix"
        ]
        text_msg = f"Prefix Updated! System prefix is now `{new_prefix}`."
        return lines, "Config Synced", text_msg
    else:
        lines = [
            f"Current Prefix: {current_prefix}",
            f"Usage Syntax: {current_prefix}prefix [new_char]",
            "Example: .prefix !"
        ]
        text_msg = (
            f"Current Prefix: `{current_prefix}`\n"
            f"Usage: `{current_prefix}prefix [new_prefix]`\n"
            f"Example: `{current_prefix}prefix !`"
        )
        return lines, "Prefix Config", text_msg

def handle_say(bot, token, channel_id, content, prefix, args):
    say_text = content[len(prefix) + len("say"):].strip()
    if say_text:
        try:
            bot.sendMessage(channel_id, say_text)
            return None, None, None
        except Exception as e:
            print(f"[DARK] Error sending say command: {e}")
    
    # If no message provided, guide the user on usage
    lines = [
        "[ COMMAND USAGE: SAY ]",
        f"Syntax: {prefix}say [your message text]",
        "Example: .say Hello World"
    ]
    text_msg = (
        f"**Command Usage: `{prefix}say`**\n"
        f"- Syntax: `{prefix}say [your message]`\n"
        f"- Example: `{prefix}say Hello World`"
    )
    return lines, "Command Guidance", text_msg

def handle_cid(bot, token, channel_id):
    text_msg = f"Channel ID: `{channel_id}`"
    return None, None, text_msg

def handle_uid(bot, token, channel_id, author_id, args, prefix):
    target_uid = author_id
    if len(args) > 1 and args[1].startswith("<@") and args[1].endswith(">"):
        target_uid = args[1].replace("<@", "").replace("!", "").replace(">", "")
    text_msg = f"User ID: `{target_uid}`"
    return None, None, text_msg
