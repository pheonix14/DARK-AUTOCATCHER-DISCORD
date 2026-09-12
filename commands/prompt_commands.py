"""
prompt_commands.py — Interactive confirmation prompt commands (.yes, .accept, .no, .disagree) (No Emojis)
"""

def handle_prompt_action(action_type, bot, channel_id, prefix):
    from i_catch import ACTIVE_CONFIRMATIONS
    from interaction_handler import get_bot

    confirm_info = ACTIVE_CONFIRMATIONS.get(channel_id)
    btn_key = "yes_id" if action_type == "yes" else "no_id"

    if confirm_info and confirm_info.get(btn_key):
        ACTIVE_CONFIRMATIONS.pop(channel_id, None)
        b = get_bot() or bot
        b.click(
            confirm_info["author_id"],
            channel_id,
            confirm_info["message_id"],
            confirm_info["flags"],
            confirm_info[btn_key],
            2
        )
        action_name = "YES / ACCEPT" if action_type == "yes" else "NO / CANCEL"
        lines = [
            f"Selection: {action_name}",
            "Status: INTERACTIVE COMPONENT CLICKED",
            "Event: PROMPT CAPTURED & EXECUTED"
        ]
        text_msg = f"Prompt Executed: Clicked **{action_name}** component button."
    else:
        lines = [
            "Error: NO ACTIVE CONFIRMATION FOUND",
            "Details: No capture records for this channel.",
            f"Usage Syntax: {prefix}yes OR {prefix}no when Poketwo asks a prompt."
        ]
        text_msg = (
            f"No Active Prompt: Found no active Poketwo confirmation prompt in this channel.\n"
            f"Usage: Type `{prefix}yes` or `{prefix}no` when Poketwo asks to confirm a release/sell."
        )

    return lines, "Prompt Action", text_msg
