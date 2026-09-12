import os
import requests
import time
import random
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from utils import log_to_nexus
from utility_controller import get_node_state, update_node_state

# SIGNATURE: DEPLOYED_BY_PHEONIX14_SECURE_HASH_8F3B92

load_dotenv()
POKETWO_ID = "716390085896962058"
PROJECT_NAME = os.getenv("PROJECT_NAME", "PROJECT DARK")

# Global cooldown tracker
LAST_CATCH_TIME = 0.0
LAST_SUCCESSFUL_CATCH_TIME = 0.0
LAST_HINT_TIME = 0.0
COOLDOWN_PERIOD = 0.0  # Allow sequential catches immediately
ACTIVE_CONFIRMATIONS = {}  # channel_id: {message_id, author_id, flags, yes_id, no_id, timestamp}
CHANNEL_IMAGES = {}

def print_and_log(msg, color_code=""):
    ui_msg = msg
    if color_code:
        print(f"{color_code}{msg}\033[0m")
    else:
        print(msg)
    try:
        from web_server import add_log
        add_log(ui_msg)
    except:
        pass


SPECIAL_SPECIES = ["mew", "celebi", "jirachi", "deoxys", "phione", "manaphy", "darkrai", "shaymin", "arceus", "victini", "keldeo", "meloetta", "genesect", "diancie", "hoopa", "volcanion", "magearna", "marshadow", "zeraora", "meltan", "melmetal", "zarude", "calyrex", "articuno", "zapdos", "moltres", "mewtwo", "raikou", "entei", "suicune", "lugia", "ho-oh", "regirock", "regice", "registeel", "latias", "latios", "kyogre", "groudon", "rayquaza", "uxie", "mesprit", "azelf", "dialga", "palkia", "heatran", "regigigas", "giratina", "cresselia", "cobalion", "terrakion", "virizion", "tornadus", "thundurus", "reshiram", "zekrom", "landorus", "kyurem", "xerneas", "yveltal", "zygarde", "type: null", "silvally", "tapu koko", "tapu lele", "tapu bulu", "tapu fini", "cosmog", "cosmoem", "solgaleo", "lunala", "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", "guzzlord", "necrozma", "poipole", "naganadel", "stakataka", "blacephalon", "zamazenta", "zacian", "eternatus", "kubfu", "urshifu", "regieleki", "regidrago", "glastrier", "spectrier", "enamorus"]

def get_rarity(name):
    name_lower = name.lower()
    if "shiny" in name_lower: return "SHINY"
    for s in SPECIAL_SPECIES:
        if s in name_lower: return "LEGENDARY"
    return "COMMON"

def query_huggingface(image_bytes, hf_token, model_id):
    """Queries Hugging Face inference endpoint for image classification with retry loop on model loading."""
    api_url = f"https://api-inference.huggingface.co/models/{model_id}"
    headers = {"Authorization": f"Bearer {hf_token}"}
    
    for attempt in range(5):
        try:
            response = requests.post(api_url, headers=headers, data=image_bytes, timeout=15)
            res = response.json()
            if isinstance(res, dict) and "error" in res:
                err_msg = res.get("error", "")
                if "loading" in err_msg.lower():
                    # Model loading cold-start, wait and retry
                    est_time = min(float(res.get("estimated_time", 6.0)), 12.0)
                    print(f"[{PROJECT_NAME}] Hugging Face model is loading. Waiting {est_time}s (Attempt {attempt+1}/5)...")
                    time.sleep(est_time)
                    continue
                else:
                    print(f"[{PROJECT_NAME}] Hugging Face API Error: {err_msg}")
                    return None
            return res
        except Exception as e:
            err_str = str(e)
            if "getaddrinfo failed" in err_str or "NameResolutionError" in err_str:
                print(f"\033[91m[{PROJECT_NAME}] DNS ERROR: Cannot reach Hugging Face. Your internet provider might be blocking it, or your DNS is failing. Try a VPN or changing DNS to 8.8.8.8.\033[0m")
                return None
            print(f"[{PROJECT_NAME}] HF request failed: {err_str}")
            time.sleep(2)
    return None

def classify_pokemon(image_url, hf_token, primary_model):
    """Downloads spawn image and classifies it using Hugging Face."""
    try:
        response = requests.get(image_url, timeout=10)
        if response.status_code != 200:
            return None
        
        img_bytes = response.content
        
        # Build model fallback list with the best Pokemon classifiers
        models_to_try = [primary_model]
        backup_models = [
            "imjeffharris/pokemon_classifier",
            "aaraki/vit-base-patch16-224-in21k-finetuned-pokemon",
            "dima806/pokemon-image-classification",
            "mtmptr/pokemon_classifier"
        ]
        for m in backup_models:
            if m not in models_to_try:
                models_to_try.append(m)
                
        for model_id in models_to_try:
            print(f"\033[96m[{PROJECT_NAME}] Attempting classification with model: {model_id}...\033[0m")
            res = query_huggingface(img_bytes, hf_token, model_id)
            
            if res is None:
                continue  # Model failed, try the next one in the fallback list
                
            if isinstance(res, list) and len(res) > 0:
                top_prediction = res[0]
                pred_name = top_prediction.get("label", "").lower().strip()
                # Clean up potential prefix formatting from classifiers (e.g. "pikachu" instead of "n012345_pikachu")
                if "_" in pred_name:
                    pred_name = pred_name.split("_")[-1]
                return pred_name
    except Exception as e:
        print(f"[{PROJECT_NAME}] Image classification exception: {e}")
    return None

def try_click_catch_button(bot, msg, channel_id):
    """Clicks the catch button immediately if present on the spawn message."""
    try:
        components = msg.get("components", [])
        for action_row in components:
            for component in action_row.get("components", []):
                if component.get("type") == 2:  # Button component
                    label = component.get("label", "").lower()
                    custom_id = component.get("custom_id", "")
                    if "catch" in label or "c" == label:
                        from interaction_handler import get_bot
                        b = get_bot() or bot
                        b.click(
                            msg.get("author", {}).get("id", ""),
                            channel_id,
                            msg.get("id", ""),
                            msg.get("flags", 0),
                            custom_id,
                            2
                        )
                        log_to_nexus("Button Catch", "COMMON", "", details="Clicked catch button", bot_source="POKETWO")
                        return True
    except Exception as e:
        print(f"[{PROJECT_NAME}] [BUTTON] Click error: {e}")
    return False

def on_message(resp, bot, token):
    global LAST_CATCH_TIME, LAST_SUCCESSFUL_CATCH_TIME, LAST_HINT_TIME, ACTIVE_CONFIRMATIONS
    
    if resp.event.message:
        msg = resp.parsed.auto()
        author_id = msg.get("author", {}).get("id")
        content = msg.get("content", "")
        channel_id = msg.get("channel_id")
        
        state = get_node_state(token)
        target_channels_str = state.get("pokemon_channel", "").strip()
        guild_id = msg.get("guild_id")
        
        # Enforce listening strictly to the configured Pokemon Channels or Guilds
        if target_channels_str:
            allowed = [c.strip() for c in target_channels_str.split(",") if c.strip()]
            if channel_id not in allowed and str(guild_id) not in allowed:
                return
        
        # Captcha Security Failsafe Scanner
        if author_id == POKETWO_ID and ("verify" in content.lower() or "captcha" in content.lower() or ("http" in content.lower() and "link" in content.lower())):
            try:
                from web_server import add_log
                update_node_state(token, {"catch_enabled": False, "spam_enabled": False})
                add_log(f"ALERT: Captcha detected! Link: {content} — AUTO-HALTED ALL ENGINES FOR SECURITY.")
            except Exception as e:
                print(f"[{PROJECT_NAME}] Failed to halt on captcha: {e}")
        
        # Prompt Confirmation Scanner
        if author_id == POKETWO_ID and msg.get("components"):
            yes_id = None
            no_id = None
            for row in msg.get("components", []):
                for component in row.get("components", []):
                    if component.get("type") == 2:
                        label = component.get("label", "").lower()
                        custom_id = component.get("custom_id", "")
                        style = component.get("style")
                        if "yes" in label or "confirm" in label or "accept" in label or style == 3:
                            yes_id = custom_id
                        if "no" in label or "cancel" in label or "deny" in label or style == 4:
                            no_id = custom_id
            if yes_id or no_id:
                ACTIVE_CONFIRMATIONS[channel_id] = {
                    "message_id": msg.get("id"),
                    "author_id": msg.get("author", {}).get("id"),
                    "flags": msg.get("flags", 0),
                    "yes_id": yes_id,
                    "no_id": no_id,
                    "timestamp": time.time()
                }

        # Detection of Catch Confirmation
        if author_id == POKETWO_ID and "congratulations" in content.lower():
            LAST_SUCCESSFUL_CATCH_TIME = time.time()
            try:
                name_part = content.split("caught a level")[1].split("!")[0].strip()
                level = name_part.split()[0] if name_part.split()[0].isdigit() else "?"
                pokemon_name = " ".join(name_part.split()[1:]) if name_part.split()[0].isdigit() else name_part
                rarity = get_rarity(pokemon_name)
                
                from utils import get_self_id
                self_id = get_self_id(token)
                is_self = self_id and (self_id in content or f"<@{self_id}>" in content)
                status_str = "success" if is_self else "failed"
                
                try:
                    from web_server import broadcast_engine_state
                    if is_self:
                        broadcast_engine_state("caught")
                except: pass
                
                img_url = CHANNEL_IMAGES.get(channel_id, "")
                log_to_nexus(pokemon_name, rarity, token, img_url, details=level, bot_source="POKETWO", status=status_str)
            except: pass

        # Wrong Pokemon Guessed
        if author_id == POKETWO_ID and "that is the wrong" in content.lower():
            print_and_log(f"[{PROJECT_NAME}] Wrong guess detected! Sending hint after a short delay...", "\033[93m")
            import threading
            def send_delayed_hint():
                global LAST_HINT_TIME
                time.sleep(2.5)
                LAST_HINT_TIME = time.time()
                bot.sendMessage(channel_id, f"<@{POKETWO_ID}> h")
            threading.Thread(target=send_delayed_hint, daemon=True).start()


        # Hint Solver
        if author_id == POKETWO_ID and "the pokémon is" in content.lower():
            print_and_log(f"[{PROJECT_NAME}] Hint received: {content}", "\033[93m")
            try:
                # E.g. "The pokémon is K\_ \_ \_ia." or "The pokémon is K___ia."
                hint_str = content.lower().split("is ")[1].replace(".", "").strip()
                # Clean up any spaces between underscores and escaped underscores
                hint_clean = hint_str.replace("\\_", "_").replace(" ", "")
                
                with open("pokemon.txt", "r", encoding="utf-8") as f:
                    all_pokes = f.read().splitlines()
                
                import re
                pattern = hint_clean.replace("_", ".")
                regex = re.compile(f"^{pattern}$", re.IGNORECASE)
                
                matches = [p for p in all_pokes if regex.match(p)]
                if matches:
                    import random
                    guess = random.choice(matches)
                    print_and_log(f"[{PROJECT_NAME}] [AI-HINT] Solved hint as: {guess}. Sending catch...", "\033[92m")
                    global LAST_CATCH_TIME
                    LAST_CATCH_TIME = time.time()
                    import threading
                    def send_hint_catch():
                        time.sleep(2.0)
                        bot.sendMessage(channel_id, f"<@{POKETWO_ID}> c {guess}")
                    threading.Thread(target=send_hint_catch, daemon=True).start()
                else:
                    print(f"\033[91m[{PROJECT_NAME}] Could not solve hint for pattern: {hint_clean}\033[0m")
            except Exception as e:
                print(f"[{PROJECT_NAME}] Hint solver error: {e}")

        # Fled Pokemon Tracker
        fled_text = ""
        if author_id == POKETWO_ID:
            if "fled" in content.lower() and "the wild" in content.lower():
                fled_text = content.lower()
            else:
                for embed in msg.get("embeds", []):
                    title = embed.get("title", "").lower()
                    if "fled" in title and "wild" in title:
                        fled_text = title
                        break

        if fled_text:
            try:
                fled_name = fled_text.split("wild ")[1].split(" fled")[0].strip()
                fled_name = fled_name.replace("*", "").replace("_", "").replace("\\", "").strip().title()
                if fled_name:
                    with open("pokemon.txt", "r", encoding="utf-8") as f:
                        all_pokes = f.read().splitlines()
                    
                    if fled_name.lower() not in [p.lower() for p in all_pokes]:
                        print(f"\033[93m[{PROJECT_NAME}] New Pokemon discovered from flee message: {fled_name}. Adding to database.\033[0m")
                        with open("pokemon.txt", "a", encoding="utf-8") as f:
                            f.write(f"\n{fled_name}")
                    
                    # Log failure to UI to clear the "Awaiting" message
                    try:
                        from utils import log_to_nexus
                        img_url = CHANNEL_IMAGES.get(channel_id, "")
                        log_to_nexus(fled_name, get_rarity(fled_name), token, img_url, fled_text, bot_source="POKETWO", status="failed")
                    except: pass
            except Exception as e:
                pass


        # AI Image Catching Logic
        embeds = msg.get("embeds", [])
        if author_id == POKETWO_ID and embeds:
            for embed in embeds:
                url = embed.get("image", {}).get("url", "") or embed.get("thumbnail", {}).get("url", "")
                title = embed.get("title", "").lower()
                desc = embed.get("description", "").lower()
                
                # Strictly detect Pokétwo spawn embeds to avoid false positives (like Pokédex or shop images)
                is_spawn_embed = "wild pokémon has appeared" in title or "guess the pokémon" in desc
                
                if is_spawn_embed and url:
                    CHANNEL_IMAGES[channel_id] = url
                    if not state.get("catch_enabled", True):
                        return

                    hf_token = state.get("huggingface_token", "").strip()
                    hf_model = state.get("huggingface_model", "imjeffharris/pokemon_classifier").strip()
                    
                    if not hf_token:
                        print(f"[{PROJECT_NAME}] Hugging Face API token is missing! Please configure it in Settings.")
                        return

                    print_and_log(f"[{PROJECT_NAME}] Spawn detected. Starting Hugging Face classification sequence...", "\033[96m")
                    try:
                        from web_server import broadcast_engine_state
                        broadcast_engine_state("detected", url)
                    except: pass
                    pokemon_name = classify_pokemon(url, hf_token, hf_model)

                    if pokemon_name:
                        rarity = get_rarity(pokemon_name)
                        
                        import threading
                        def delayed_catch(p_name, c_id):
                            catch_delay = 2.0
                            print_and_log(f"[{PROJECT_NAME}] [AI] Identified: {p_name} ({rarity}). Waiting {catch_delay:.2f}s to catch...", "\033[92m")
                            time.sleep(catch_delay)
                            
                            bot.sendMessage(c_id, f"<@{POKETWO_ID}> c {p_name}")
                            print_and_log(f"[{PROJECT_NAME}] [AI] CATCH sent for: {p_name}", "\033[92m")
                            try:
                                from web_server import broadcast_engine_state
                                broadcast_engine_state("catch_sent")
                            except: pass
                            # Update cooldown timestamp
                            global LAST_CATCH_TIME
                            LAST_CATCH_TIME = time.time()
                            
                            def timeout_hint(spawn_time):
                                global LAST_HINT_TIME
                                time.sleep(10.0)
                                if LAST_SUCCESSFUL_CATCH_TIME < spawn_time and LAST_HINT_TIME < spawn_time:
                                    print_and_log(f"[{PROJECT_NAME}] 10s passed without catch or hint. Sending fallback hint...", "\033[93m")
                                    LAST_HINT_TIME = time.time()
                                    bot.sendMessage(c_id, f"<@{POKETWO_ID}> h")
                            threading.Thread(target=timeout_hint, args=(LAST_CATCH_TIME,), daemon=True).start()
                            
                        threading.Thread(target=delayed_catch, args=(pokemon_name, channel_id), daemon=True).start()
                    else:
                        print_and_log(f"[{PROJECT_NAME}] Could not identify Pokemon from image. Sending fallback hint command.", "\033[93m")
                        bot.sendMessage(channel_id, f"<@{POKETWO_ID}> h")

        # Immediate button click catching
        if author_id == POKETWO_ID and msg.get("components"):
            if state.get("catch_enabled", True):
                # Apply same cooldown rules for button clicks
                curr_time = time.time()
                if curr_time - LAST_CATCH_TIME >= COOLDOWN_PERIOD:
                    if try_click_catch_button(bot, msg, channel_id):
                        LAST_CATCH_TIME = time.time()

def run_spammer(bot, token):
    import random
    import string
    import os
    from utils import read_config
    
    wordlist = []
    messages_file = os.path.join("messages", "spam_messages.txt")
    if os.path.exists(messages_file):
        with open(messages_file, "r", encoding="utf-8") as f:
            wordlist = [line.strip() for line in f if line.strip()]
            
    if not wordlist:
        wordlist = [
            "is anyone here?", "hello", "wow this is cool", "what pokemon are you looking for?",
            "catching legends!", "almost level up", "keep spamming guys", "nice caught",
            "let us spawn something", "hope it is shiny", "poketwo spawn rate is high today"
        ]
    
    print(f"\033[95m[{PROJECT_NAME}] [SPAMMER] Thread initialized. Loaded {len(wordlist)} messages.\033[0m")
    while True:
        try:
            config = read_config()
            spam_enabled = config.get("spam_enabled", "false") == "true"
            spam_chan = config.get("spam_channel_id", "").strip()
            delay = float(config.get("spam_delay", "8.0"))
            
            if spam_enabled and spam_chan:
                msg_content = random.choice(wordlist)
                bot.sendMessage(spam_chan, msg_content)
                time.sleep(delay)
            else:
                time.sleep(3)
        except Exception as e:
            time.sleep(5)

def setup(bot, token=None):
    print(f"\033[96m[{PROJECT_NAME}] I_CATCH MODULE ARMED (HUGGING FACE ONLY).\033[0m")
    bot.gateway.command({"function": lambda resp: on_message(resp, bot, token), "name": "MESSAGE_CREATE"})
    
    import threading
    threading.Thread(target=run_spammer, args=(bot, token), daemon=True).start()
