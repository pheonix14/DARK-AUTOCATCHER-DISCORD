"""
commands/history_command.py — Paginated Catch History Command with Interactive Buttons
"""
import math
from web_server import load_history

def handle_history(bot, token, channel_id, args, state):
    """
    Renders paginated catch history glass card with interactive button components.
    Usage:
      .history      -> Page 1
      .history 2    -> Page 2
    """
    prefix = state.get("prefix", ".")
    logs = load_history()

    page = 1
    if len(args) > 1:
        try:
            page = int(args[1])
        except ValueError:
            page = 1

    per_page = 5
    total_logs = len(logs)
    total_pages = max(1, math.ceil(total_logs / per_page))
    page = max(1, min(page, total_pages))

    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    page_logs = logs[start_idx:end_idx]

    lines = [
        f"Total Records: {total_logs} | Page: {page}/{total_pages}",
        "──────────────────────────────────────────"
    ]

    if not page_logs:
        lines.append("No catch records found in history database.")
    else:
        for idx, entry in enumerate(page_logs, start=start_idx + 1):
            name = entry.get("name", "Unknown").upper()
            rarity = entry.get("rarity", "COMMON").upper()
            status = entry.get("status", "success").upper()
            t_str = entry.get("time", "")
            details = entry.get("details", "")
            lvl_str = f"Lvl {details}" if details and str(details).isdigit() else "Lvl ?"
            
            lines.append(f"{idx}. {name} ({rarity}, {lvl_str}) - {status} [{t_str}]")

    lines.append("──────────────────────────────────────────")
    lines.append(f"Nav: {prefix}history <page> (e.g. {prefix}history {min(total_pages, page+1)})")

    # Interactive Button Components
    prev_page = max(1, page - 1)
    next_page = min(total_pages, page + 1)
    
    components = [
        {
            "type": 1,
            "components": [
                {
                    "type": 2,
                    "style": 2,
                    "label": "◀ Prev",
                    "custom_id": f"history_{prev_page}",
                    "disabled": page == 1
                },
                {
                    "type": 2,
                    "style": 1,
                    "label": f"Page {page}/{total_pages}",
                    "custom_id": f"history_{page}"
                },
                {
                    "type": 2,
                    "style": 2,
                    "label": "Next ▶",
                    "custom_id": f"history_{next_page}",
                    "disabled": page == total_pages
                },
                {
                    "type": 2,
                    "style": 3,
                    "label": "Refresh 🔄",
                    "custom_id": f"history_{page}"
                }
            ]
        }
    ]

    card_title = f"CATCH HISTORY (PAGE {page}/{total_pages})"
    text_msg = f"**[ CATCH HISTORY — PAGE {page}/{total_pages} ]**\nShowing records {start_idx+1}-{min(end_idx, total_logs)} of {total_logs}. Use buttons below or `{prefix}history <page>` to turn pages."

    return lines, card_title, text_msg, components
