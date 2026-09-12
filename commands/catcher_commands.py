"""
catcher_commands.py — Autocatcher control commands (.dark, .cooldown, .stop) (No Emojis)
"""

def handle_dark(bot, token, channel_id, state, update_state_func):
    prefix = state.get("prefix", ".")
    new_val = not state.get('catch_enabled', True)
    update_state_func(token, {"catch_enabled": new_val})
    status_str = "ENGAGED" if new_val else "HALTED / OFFLINE"
    lines = [
        f"Catcher Status: {status_str}",
        f"Action: State saved in config.txt",
        f"Usage Hint: Type {prefix}dark again to toggle ON/OFF."
    ]
    text_msg = (
        f"**Autocatcher Toggled!** Catcher is now **{status_str}**.\n"
        f"Usage: Type `{prefix}dark` anytime to toggle ON or OFF."
    )
    return lines, "Module Toggled", text_msg

def handle_cooldown(bot, token, channel_id, prefix):
    lines = [
        "Mode: INSTANT ON SPAWN",
        "Rate Limit Cooldown: 120 seconds",
        "Status: PROTECTION SYSTEM ACTIVE",
        f"Usage Hint: Use {prefix}dark to pause or resume catching."
    ]
    text_msg = (
        f"**Cooldown Status:** Instant spawn detection | 120s anti-ban protection active.\n"
        f"Usage: Type `{prefix}dark` to pause or resume catching."
    )
    return lines, "Failsafe Monitor", text_msg

def handle_stop(bot, token, channel_id, update_state_func, prefix):
    update_state_func(token, {"catch_enabled": False})
    lines = [
        "Catcher status: OFF",
        "Failsafe: ENGAGED",
        "System: EMERGENCY HALT COMPLETE",
        f"Usage Hint: Type {prefix}dark to re-enable catching."
    ]
    text_msg = (
        f"**EMERGENCY HALT!** Autocatcher disabled immediately.\n"
        f"Usage: Type `{prefix}dark` when ready to resume catching."
    )
    return lines, "Emergency Halt", text_msg
