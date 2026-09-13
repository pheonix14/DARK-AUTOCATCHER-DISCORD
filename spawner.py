import os
import time
import random
from utils import read_config
from web_server import add_log

# SIGNATURE: DEPLOYED_BY_RAYZIEN_SPECIALIZED_SPAWNER_8F3B92

PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")

def run_spammer(bot, token):
    """
    Dedicated Spammer / Spawner Module.
    Continuously syncs with config.txt to handle custom messages, infinity count, delays, and channel targets.
    """
    wordlist = []
    messages_file = os.path.join("messages", "spam_messages.txt")
    if os.path.exists(messages_file):
        try:
            with open(messages_file, "r", encoding="utf-8") as f:
                wordlist = [line.strip() for line in f if line.strip()]
        except Exception:
            wordlist = []
            
    if not wordlist:
        wordlist = [
            "is anyone here?", "hello", "wow this is cool", "what pokemon are you looking for?",
            "catching legends!", "almost level up", "keep spamming guys", "nice caught",
            "let us spawn something", "hope it is shiny", "poketwo spawn rate is high today"
        ]
    
    initial_config = read_config()
    try:
        sent_count = int(initial_config.get("spam_sent_count", "0") or 0)
    except ValueError:
        sent_count = 0
        
    print(f"\033[95m[{PROJECT_NAME}] [SPAWNER] Dedicated Spammer Thread Initialized at sent_count={sent_count}. Loaded {len(wordlist)} fallback dictionary messages.\033[0m")
    add_log(f"[{PROJECT_NAME}] [SPAWNER] Thread Online (Resumed at count: {sent_count}).")

    while True:
        try:
            config = read_config()
            spam_enabled = config.get("spam_enabled", "false").lower() == "true"
            spam_chan_raw = config.get("spam_channel_id", "").strip()
            delay_raw = config.get("spam_delay", "45.0")
            try:
                delay = max(1.0, float(delay_raw))
            except ValueError:
                delay = 45.0
                
            custom_msg = config.get("spam_custom_message", "").strip()
            spam_infinity = config.get("spam_infinity", "false").lower() == "true"

            try:
                max_count = int(config.get("spam_count", "0") or 0)
            except ValueError:
                max_count = 0

            # Infinity toggle overrides max_count to 0 (unlimited)
            if spam_infinity:
                max_count = 0

            if spam_enabled and spam_chan_raw:
                # Check if count limit reached (only when not infinite)
                if max_count > 0 and sent_count >= max_count:
                    time.sleep(5)
                    continue

                # Parse multiple channels if comma-separated
                target_channels = [c.strip() for c in spam_chan_raw.split(",") if c.strip()]
                if not target_channels:
                    time.sleep(3)
                    continue

                # Prepare content
                if custom_msg:
                    # Support comma or newline delimited custom messages
                    custom_list = [m.strip() for m in custom_msg.replace('\n', ',').split(',') if m.strip()]
                    msg_content = random.choice(custom_list) if custom_list else custom_msg
                else:
                    msg_content = random.choice(wordlist)

                # Send message to configured channels
                for chan_id in target_channels:
                    try:
                        bot.sendMessage(chan_id, msg_content)
                        sent_count += 1
                        
                        # Save sent_count back to config.txt for full restart persistence
                        try:
                            from utils import write_config
                            cur_cfg = read_config()
                            cur_cfg["spam_sent_count"] = str(sent_count)
                            write_config(cur_cfg)
                        except Exception: pass
                        
                        limit_str = "∞" if (spam_infinity or max_count == 0) else f"{max_count}"
                        log_msg = f"[{PROJECT_NAME}] [SPAWNER] Sent msg #{sent_count} ({limit_str}): {msg_content[:35]}"
                        print(f"\033[95m{log_msg}\033[0m")
                        add_log(log_msg)
                    except Exception as send_err:
                        print(f"\033[91m[{PROJECT_NAME}] [SPAWNER] Dispatch error to channel {chan_id}: {send_err}\033[0m")
                
                time.sleep(delay)
            else:
                time.sleep(3)
        except Exception as loop_err:
            print(f"\033[91m[{PROJECT_NAME}] [SPAWNER] Cycle exception: {loop_err}\033[0m")
            time.sleep(5)

def setup(bot, token=None):
    import threading
    print(f"\033[96m[{PROJECT_NAME}] SPAWNER MODULE ARMED & SYNCED WITH CONFIG.TXT.\033[0m")
    threading.Thread(target=run_spammer, args=(bot, token), daemon=True).start()
