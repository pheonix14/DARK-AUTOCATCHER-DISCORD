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
    prefix = state.get("prefix", ".")
    catch_status = "ENGAGED" if state.get("catch_enabled") else "OFFLINE"
    lines = [
        f"System Prefix: {prefix}",
        f"Catcher: {catch_status}",
        f"Catch Delay: 3.0s (Fixed)",
        f"Cooldown: 120s (2 minutes)",
        f"HF Model: {state.get('huggingface_model')}",
        f"Listener ID: {state.get('listener_id', 'self')}"
    ]
    text_msg = (
        f"**[ SYSTEM STATUS ]**\n"
        f"- Prefix: `{prefix}`\n"
        f"- Catcher: `{catch_status}`\n"
        f"- Catch Delay: `3.0s`\n"
        f"- HF Model: `{state.get('huggingface_model')}`\n"
        f"- Listener: `{state.get('listener_id', 'self')}`\n"
        f"- Usage Hint: Type `{prefix}help` to view all submenus."
    )
    return lines, "Dark System Status", text_msg

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
