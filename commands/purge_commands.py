"""
commands/purge_commands.py — Direct Discord REST API Purge Handler for Project Dark
"""
import time
import requests
from utils import get_self_id

def handle_purge(bot, token, channel_id, author_id, args, state):
    """
    Deletes user's sent messages using direct Discord REST API.
    Usage:
      .purge 10   -> deletes last 10 user messages in current channel
      .purge all  -> deletes last 50 user messages across all target channels
    """
    self_id = get_self_id(token) or author_id
    target = args[1].lower() if len(args) > 1 else "10"
    headers = {"Authorization": token, "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    purged_count = 0

    if target == "all":
        # Delete user messages across all allowed target channels
        target_chans = state.get("pokemon_channel", "").split(",")
        channels_to_purge = [c.strip() for c in target_chans if c.strip()]
        if channel_id not in channels_to_purge:
            channels_to_purge.append(channel_id)
            
        for c_id in channels_to_purge:
            try:
                r = requests.get(f"https://discord.com/api/v9/channels/{c_id}/messages?limit=100", headers=headers, timeout=10)
                if r.status_code == 200:
                    messages = r.json()
                    for msg in messages:
                        if msg.get("author", {}).get("id") == self_id:
                            m_id = msg.get("id")
                            del_r = requests.delete(f"https://discord.com/api/v9/channels/{c_id}/messages/{m_id}", headers=headers, timeout=5)
                            if del_r.status_code in [200, 204]:
                                purged_count += 1
                                time.sleep(0.3)
            except Exception as e:
                print(f"[PURGE] Error purging channel {c_id}: {e}")
                
        lines = [
            f"Mode: PURGE ALL CHANNELS",
            f"Total Messages Deleted: {purged_count}",
            f"Status: COMPLETED (Auto-clearing in 3s)"
        ]
        return lines, "PURGE ALL", f"Purged {purged_count} messages across all servers/channels.", None, 3.5

    else:
        # Delete N messages in current channel (+ the trigger command)
        try:
            limit = int(target)
        except ValueError:
            limit = 10

        try:
            r = requests.get(f"https://discord.com/api/v9/channels/{channel_id}/messages?limit=100", headers=headers, timeout=10)
            if r.status_code == 200:
                messages = r.json()
                for msg in messages:
                    if msg.get("author", {}).get("id") == self_id:
                        m_id = msg.get("id")
                        del_r = requests.delete(f"https://discord.com/api/v9/channels/{channel_id}/messages/{m_id}", headers=headers, timeout=5)
                        if del_r.status_code in [200, 204]:
                            purged_count += 1
                            if purged_count >= limit + 1:
                                break
                            time.sleep(0.3)
        except Exception as e:
            print(f"[PURGE] Error deleting messages in {channel_id}: {e}")

        lines = [
            f"Channel: {channel_id}",
            f"Requested: {limit}",
            f"Purged: {purged_count} messages",
            f"Status: SUCCESS (Auto-clearing in 3s)"
        ]
        return lines, "PURGE MESSAGES", f"Successfully purged {purged_count} messages in this channel.", None, 3.5
