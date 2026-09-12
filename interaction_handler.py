"""
interaction_handler.py — Button clicks and reactions via discum.
"""
import os

PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")

# Global bot reference — set by main.py after bot is created
_bot = None

def set_bot(bot):
    global _bot
    _bot = bot

def get_bot():
    return _bot

def react_to_message(channel_id, message_id, emoji):
    """Add a reaction to a Discord message."""
    bot = get_bot()
    if not bot:
        return {"success": False, "error": "Bot not connected"}
    try:
        bot.addReaction(channel_id, message_id, emoji)
        from web_server import add_log
        add_log(f"Reacted with {emoji} on message {message_id}")
        return {"success": True, "action": "react", "emoji": emoji}
    except Exception as e:
        return {"success": False, "error": str(e)}

def click_button(channel_id, message_id, button_label="", custom_id=""):
    """Click a button component on a Discord message."""
    bot = get_bot()
    if not bot:
        return {"success": False, "error": "Bot not connected"}
    try:
        # Fetch the message to find the button
        msgs = bot.getMessages(channel_id, 1, aroundMessage=message_id).json()
        target_msg = None
        for m in msgs:
            if m.get("id") == message_id:
                target_msg = m
                break

        if not target_msg:
            return {"success": False, "error": "Message not found"}

        components = target_msg.get("components", [])
        if not components:
            return {"success": False, "error": "No buttons found on this message"}

        # Search for the button
        for action_row in components:
            for component in action_row.get("components", []):
                comp_type = component.get("type")
                comp_label = component.get("label", "")
                comp_custom_id = component.get("custom_id", "")

                if comp_type == 2:  # Button type
                    if (custom_id and comp_custom_id == custom_id) or \
                       (button_label and comp_label.lower() == button_label.lower()) or \
                       (not custom_id and not button_label):  # Click first button
                        
                        # Build interaction payload
                        bot.click(
                            target_msg.get("author", {}).get("id", ""),
                            channel_id,
                            message_id,
                            target_msg.get("flags", 0),
                            comp_custom_id,
                            comp_type
                        )
                        from web_server import add_log
                        add_log(f"Clicked button '{comp_label or comp_custom_id}' on msg {message_id}")
                        return {"success": True, "action": "click", "label": comp_label}

        return {"success": False, "error": f"Button not found (label='{button_label}', custom_id='{custom_id}')"}
    except Exception as e:
        return {"success": False, "error": str(e)}
