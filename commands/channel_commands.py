"""
commands/channel_commands.py — Channel Authorization (.allow / .block) Handler for Project Dark
"""
from utils import read_config, write_config

def handle_allow(bot, token, channel_id, args, state, update_state_func):
    """
    Adds a channel ID to the allowed pokemon_channel list.
    Usage:
      .allow             -> allows current channel
      .allow 1234567890  -> allows specified channel ID
    """
    target = args[1].strip() if len(args) > 1 else str(channel_id)
    config = read_config()
    
    current_chans_raw = state.get("pokemon_channel") or config.get("pokemon_channel", "")
    chans = [c.strip() for c in current_chans_raw.split(",") if c.strip()]
    
    if target not in chans:
        chans.append(target)
        new_chans_str = ", ".join(chans)
        
        # Update node state and config.txt
        update_state_func(token, {"pokemon_channel": new_chans_str})
        write_config({"pokemon_channel": new_chans_str})
        
        lines = [
            f"Allowed Channel: {target}",
            f"Active Target Channels: {len(chans)}",
            "Status: ALLOWED & SECURED"
        ]
        text_msg = f"Channel Allowed! Added `{target}` to active listening targets."
        return lines, "CHANNEL ALLOWED", text_msg
    else:
        lines = [
            f"Channel ID: {target}",
            "Status: ALREADY ALLOWED",
            f"Active Targets: {len(chans)}"
        ]
        text_msg = f"Channel `{target}` is already allowed and monitored."
        return lines, "CHANNEL PERMISSION", text_msg


def handle_block(bot, token, channel_id, args, state, update_state_func):
    """
    Removes a channel ID from the allowed pokemon_channel list.
    Usage:
      .block             -> blocks current channel
      .block 1234567890  -> blocks specified channel ID
    """
    target = args[1].strip() if len(args) > 1 else str(channel_id)
    config = read_config()
    
    current_chans_raw = state.get("pokemon_channel") or config.get("pokemon_channel", "")
    chans = [c.strip() for c in current_chans_raw.split(",") if c.strip()]
    
    if target in chans:
        chans.remove(target)
        new_chans_str = ", ".join(chans)
        
        # Update node state and config.txt
        update_state_func(token, {"pokemon_channel": new_chans_str})
        write_config({"pokemon_channel": new_chans_str})
        
        lines = [
            f"Blocked Channel: {target}",
            f"Remaining Active Targets: {len(chans)}",
            "Status: BLOCKED & HALTED"
        ]
        text_msg = f"Channel Blocked! Removed `{target}` from listening targets."
        return lines, "CHANNEL BLOCKED", text_msg
    else:
        lines = [
            f"Channel ID: {target}",
            "Status: NOT IN ALLOWED LIST",
            f"Remaining Targets: {len(chans)}"
        ]
        text_msg = f"Channel `{target}` is not in the active allowed targets list."
        return lines, "CHANNEL PERMISSION", text_msg
