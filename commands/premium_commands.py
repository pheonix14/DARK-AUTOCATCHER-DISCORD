"""
premium_commands.py — Premium feature list & upgrade details (.premium) (No Emojis)
"""

def handle_premium(prefix):
    lines = [
        "- Web notifications on rare Pokemon",
        "- Multi-channel integration",
        "- Custom Cooldowns",
        "- More than 2 Discord accounts",
        "- Hint Fallback Mode",
        "- 24-hour hosting: host it unlimitedly with no sleep",
        "- Secure Credentials Storage",
        "- Captcha Guard Security Auto-Halt",
        "",
        "Cost: $20 (50% OFF - Lifetime License + 3 updates)",
        "Payment Method: LITECOIN (LTC) ONLY",
        "Contact developer (phoenix14) for license."
    ]
    text_msg = (
        "**[ PROJECT DARK - PREMIUM UPGRADES ]**\n"
        "- Web notifications on rare Pokemon\n"
        "- Multi-channel integration & Custom Cooldowns\n"
        "- Support for unlimited Discord accounts\n"
        "- Hint Fallback Mode + 24/7 Hosting\n"
        "- Captcha Guard Auto-Halt Protection\n\n"
        "Cost: `$20` *(50% OFF Lifetime License)*\n"
        "Payment: Litecoin (LTC) Only\n"
        "Contact: `phoenix14` for license activation.\n"
        f"Usage Hint: Type `{prefix}help` to return to all submenus."
    )
    return lines, "Premium Upgrades", text_msg
