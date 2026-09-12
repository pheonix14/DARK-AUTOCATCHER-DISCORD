"""
help_command.py — Structured Help Manifest with Headings and Submenus (No Emojis)
"""

COMMANDS_DOC = {
    "core": {
        "title": "CORE MODULES",
        "tag": "[CORE]",
        "description": "Essential system utilities & channel controls",
        "commands": {
            "help": ("Display command list, submenus, or detailed usage.", ".help [category | command]"),
            "ping": ("Check node connection latency and gateway health.", ".ping"),
            "status": ("View Poketwo catcher status, neural model, and metrics.", ".status"),
            "history": ("View paginated catch history log entries.", ".history [page]"),
            "allow": ("Enable bot listening and commands in a channel.", ".allow [channel_id]"),
            "block": ("Disable bot listening and commands in a channel.", ".block [channel_id]"),
            "purge": ("Delete sent messages in channel or across servers.", ".purge [count | all]"),
            "prefix": ("Change system command prefix.", ".prefix [char]"),
            "say": ("Send a custom message to the current channel.", ".say [text]"),
            "cid": ("Display the current channel ID.", ".cid"),
            "uid": ("Get user ID of yourself or a mentioned user.", ".uid [@user]")
        }
    },
    "autocatcher": {
        "title": "AUTOCATCHER MODULES",
        "tag": "[AUTOCATCHER]",
        "description": "AI Catcher automation & failsafe controls",
        "commands": {
            "dark": ("Toggle AI Poketwo catcher (ON/OFF).", ".dark"),
            "cooldown": ("Display active catch rate-limit & cooldown status.", ".cooldown"),
            "stop": ("Emergency halt AI catcher.", ".stop")
        }
    },
    "prompts": {
        "title": "PROMPT MODULES",
        "tag": "[PROMPTS]",
        "description": "Interactive confirmation prompts for Poketwo",
        "commands": {
            "yes / accept": ("Confirm active Poketwo release/sell prompt.", ".yes OR .accept"),
            "no / disagree": ("Cancel active Poketwo release/sell prompt.", ".no OR .disagree")
        }
    },
    "premium": {
        "title": "PREMIUM MODULES",
        "tag": "[PREMIUM]",
        "description": "Exclusive upgrades & enterprise capabilities",
        "commands": {
            "premium": ("List all available premium features and license info.", ".premium")
        }
    }
}

# Common typos / aliases mapped to correct commands
COMMAND_SUGGESTIONS = {
    "catch": "dark",
    "autocatch": "dark",
    "on": "dark",
    "off": "dark",
    "start": "dark",
    "cmds": "help",
    "menu": "help",
    "helpp": "help",
    "info": "status",
    "hist": "history",
    "catches": "history",
    "clear": "purge",
    "del": "purge",
    "delete": "purge",
    "purgeall": "purge",
    "channel": "cid",
    "user": "uid",
    "buy": "premium",
    "upgrade": "premium",
    "donate": "premium"
}

def get_help_manifest(prefix, query=None):
    """
    Generates structured help lines and text response based on query.
    No emojis used.
    """
    prefix = prefix or "."
    query = query.strip().lower() if query else ""

    # Case 1: Category Submenu requested (e.g. .help core or .help autocatcher)
    if query in COMMANDS_DOC:
        cat_data = COMMANDS_DOC[query]
        lines = [
            f"[ {cat_data['title']} ]",
            f"Description: {cat_data['description']}",
            "---------------------------------"
        ]
        text_lines = [
            f"**{cat_data['title']}** - *{cat_data['description']}*",
            "```"
        ]
        
        for cmd_name, (desc, usage) in cat_data["commands"].items():
            lines.append(f"{prefix}{cmd_name.split()[0]} : {desc}")
            lines.append(f"  Usage: {usage.replace('.', prefix)}")
            text_lines.append(f"{prefix}{cmd_name} - {desc}")
            text_lines.append(f"  Usage: {usage.replace('.', prefix)}")

        text_lines.append("```")
        text_lines.append(f"Type `{prefix}help` to return to the Main Menu.")
        
        card_title = f"Help - {cat_data['title']}"
        text_msg = "\n".join(text_lines)
        return lines, card_title, text_msg

    # Case 2: Specific Command requested (e.g. .help dark or .help status)
    if query:
        for cat_key, cat_data in COMMANDS_DOC.items():
            for cmd_name, (desc, usage) in cat_data["commands"].items():
                aliases = [a.strip() for a in cmd_name.split("/")]
                if query in aliases or query == cmd_name:
                    lines = [
                        f"[ COMMAND: {prefix}{query.upper()} ]",
                        f"Category: {cat_data['title']}",
                        f"Description: {desc}",
                        f"Syntax Usage: {usage.replace('.', prefix)}"
                    ]
                    text_msg = (
                        f"**Command Info: `{prefix}{query}`**\n"
                        f"- Category: {cat_data['title']}\n"
                        f"- Description: {desc}\n"
                        f"- Usage: `{usage.replace('.', prefix)}`"
                    )
                    return lines, f"Help - {query}", text_msg

        # Check for suggested alternative if user mistyped command name
        suggestion = COMMAND_SUGGESTIONS.get(query)
        if suggestion:
            lines = [
                f"[ UNKNOWN COMMAND: {prefix}{query} ]",
                f"Did you mean: {prefix}{suggestion} ?",
                f"Type {prefix}help to view all submenus."
            ]
            text_msg = (
                f"Unknown command `{prefix}{query}`.\n"
                f"Did you mean: `{prefix}{suggestion}`?\n"
                f"Type `{prefix}help` for the full command list."
            )
            return lines, "Help Suggestion", text_msg

        # Command not found fallback
        lines = [
            "[ ERROR: UNKNOWN COMMAND ]",
            f"No command or submenu found for: '{query}'",
            f"Type {prefix}help to view available submenus."
        ]
        text_msg = f"Command or Submenu `{query}` not found. Type `{prefix}help` for the main menu."
        return lines, "Help Error", text_msg

    # Case 3: Default Main Menu (Headings & Submenus overview)
    lines = [
        "[ PROJECT DARK - COMMAND SYSTEM ]",
        f"Active Prefix: {prefix}",
        "---------------------------------",
        "HEADINGS & SUBMENUS:"
    ]

    text_lines = [
        f"**[ PROJECT DARK - SYSTEM COMMANDS ]**",
        f"Active Prefix: `{prefix}`",
        "---------------------------------",
        "**AVAILABLE HEADINGS & SUBMENUS:**"
    ]

    for cat_key, cat_data in COMMANDS_DOC.items():
        lines.append(f"- {cat_data['title']} ({prefix}help {cat_key}):")
        lines.append(f"  {cat_data['description']}")
        
        text_lines.append(
            f"- **{cat_data['title']}** (`{prefix}help {cat_key}`)\n"
            f"  *{cat_data['description']}*"
        )

    lines.append("---------------------------------")
    lines.append(f"Submenu Usage: {prefix}help [category]")

    text_lines.append("---------------------------------")
    text_lines.append(f"**Submenu Navigation:** Type `{prefix}help <category>` (e.g. `{prefix}help core` or `{prefix}help autocatcher`)")
    text_lines.append(f"**Command Lookup:** Type `{prefix}help <command>` (e.g. `{prefix}help dark`)")

    return lines, "System Command Guide", "\n".join(text_lines)

def handle_unknown_command(cmd_name, prefix):
    """
    Guides the user when an unrecognized command is typed.
    """
    prefix = prefix or "."
    suggestion = COMMAND_SUGGESTIONS.get(cmd_name.lower())
    
    if suggestion:
        lines = [
            f"[ UNKNOWN COMMAND: {prefix}{cmd_name} ]",
            f"Did you mean: {prefix}{suggestion} ?",
            f"Type {prefix}help to view all commands."
        ]
        text_msg = (
            f"Unknown command `{prefix}{cmd_name}`.\n"
            f"Did you mean `{prefix}{suggestion}`?\n"
            f"Type `{prefix}help` to view all available commands and submenus."
        )
    else:
        lines = [
            f"[ UNKNOWN COMMAND: {prefix}{cmd_name} ]",
            "Command not recognized.",
            f"Type {prefix}help for command list."
        ]
        text_msg = (
            f"Unknown command `{prefix}{cmd_name}`.\n"
            f"Type `{prefix}help` to view all available commands and submenus."
        )
        
    return lines, "Command Guide", text_msg
