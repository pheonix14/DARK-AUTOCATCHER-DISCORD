"""
commands/__init__.py — Central Command Router & Dispatcher for Project Dark (No Emojis + Guidance)
"""
import os
from utils import send_image_to_discord
from image_renderer import generate_glass_card

from .help_command import get_help_manifest, handle_unknown_command
from .core_commands import (
    handle_ping, handle_status, handle_prefix, handle_say, handle_cid, handle_uid
)
from .catcher_commands import handle_dark, handle_cooldown, handle_stop
from .prompt_commands import handle_prompt_action
from .premium_commands import handle_premium
from .purge_commands import handle_purge
from .history_command import handle_history
from .channel_commands import handle_allow, handle_block

def dispatch_command(cmd, args, content, prefix, state, token, channel_id, author_id, author_name, bot, update_state_func):
    """
    Routes incoming text command to the corresponding specialized command handler.
    Returns: tuple (lines, card_title, text_msg) or (lines, card_title, text_msg, components)
    """
    cmd = cmd.lower()

    if cmd == "help":
        query = args[1] if len(args) > 1 else None
        return get_help_manifest(prefix, query)

    elif cmd == "ping":
        return handle_ping(bot, token, channel_id, state)

    elif cmd == "status":
        return handle_status(bot, token, channel_id, state)

    elif cmd in ["history", "hist", "logs", "catches"]:
        return handle_history(bot, token, channel_id, args, state)

    elif cmd == "allow":
        return handle_allow(bot, token, channel_id, args, state, update_state_func)

    elif cmd == "block":
        return handle_block(bot, token, channel_id, args, state, update_state_func)

    elif cmd == "prefix":
        return handle_prefix(bot, token, channel_id, state, args, update_state_func)

    elif cmd == "say":
        return handle_say(bot, token, channel_id, content, prefix, args)

    elif cmd == "cid":
        return handle_cid(bot, token, channel_id)

    elif cmd == "uid":
        return handle_uid(bot, token, channel_id, author_id, args, prefix)

    elif cmd == "dark":
        return handle_dark(bot, token, channel_id, state, update_state_func)

    elif cmd == "cooldown":
        return handle_cooldown(bot, token, channel_id, prefix)

    elif cmd == "stop":
        return handle_stop(bot, token, channel_id, update_state_func, prefix)

    elif cmd in ["purge", "purgeall"]:
        return handle_purge(bot, token, channel_id, author_id, args, state)

    elif cmd in ["yes", "accept"]:
        return handle_prompt_action("yes", bot, channel_id, prefix)

    elif cmd in ["no", "disagree"]:
        return handle_prompt_action("no", bot, channel_id, prefix)

    elif cmd == "premium":
        return handle_premium(prefix)

    # Unknown or mistyped command -> Provide clear usage guidance & suggestion
    return handle_unknown_command(cmd, prefix)


def execute(content, prefix, state, token, channel_id, author_id, author_name, bot, update_state_func):
    """
    Parses command content, dispatches execution, renders Wukong Glass Card, and sends to Discord.
    """
    args = content[len(prefix):].split()
    if not args:
        return

    cmd = args[0]
    res = dispatch_command(
        cmd, args, content, prefix, state, token, channel_id, author_id, author_name, bot, update_state_func
    )
    
    components = None
    auto_delete_delay = 0
    if len(res) == 5:
        lines, card_title, text_msg, components, auto_delete_delay = res
    elif len(res) == 4:
        lines, card_title, text_msg, components = res
    elif len(res) == 3:
        lines, card_title, text_msg = res
    else:
        return

    if lines and card_title:
        try:
            # Generate premium glass card image
            file_path = generate_glass_card(card_title, lines)
            # Send image file to Discord WITHOUT duplicating text content (text_msg is only fallback)
            sent = send_image_to_discord(token, channel_id, file_path, content="", components=components, auto_delete_delay=auto_delete_delay)
            
            # Fallback to plain text message if image sending fails
            if not sent and text_msg:
                bot.sendMessage(channel_id, text_msg)
        except Exception as e:
            print(f"[DARK COMMANDS] Execution error: {e}")
            if text_msg:
                try:
                    bot.sendMessage(channel_id, text_msg)
                except Exception:
                    pass
    elif text_msg:
        try:
            bot.sendMessage(channel_id, text_msg)
        except Exception as e:
            print(f"[DARK COMMANDS] Text send error: {e}")
