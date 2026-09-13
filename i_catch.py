import os
import requests
import time
import random
import threading
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv
from utils import log_to_nexus, read_config, get_self_id
from utility_controller import get_node_state, update_node_state

# SIGNATURE: DEPLOYED_BY_RAYZIEN_SECURE_HASH_8F3B92

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
RECENT_SENT_CATCHES = {}  # channel_id: timestamp

def print_and_log(msg, color_code=""):
    ui_msg = msg
    if color_code:
        print(f"{color_code}{msg}\033[0m")
    else:
        print(msg)
    try:
        from web_server import add_log
        add_log(ui_msg)
    except Exception:
        pass


SPECIAL_SPECIES = ["mew", "celebi", "jirachi", "deoxys", "phione", "manaphy", "darkrai", "shaymin", "arceus", "victini", "keldeo", "meloetta", "genesect", "diancie", "hoopa", "volcanion", "magearna", "marshadow", "zeraora", "meltan", "melmetal", "zarude", "calyrex", "articuno", "zapdos", "moltres", "mewtwo", "raikou", "entei", "suicune", "lugia", "ho-oh", "regirock", "regice", "registeel", "latias", "latios", "kyogre", "groudon", "rayquaza", "uxie", "mesprit", "azelf", "dialga", "palkia", "heatran", "regigigas", "giratina", "cresselia", "cobalion", "terrakion", "virizion", "tornadus", "thundurus", "reshiram", "zekrom", "landorus", "kyurem", "xerneas", "yveltal", "zygarde", "type: null", "silvally", "tapu koko", "tapu lele", "tapu bulu", "tapu fini", "cosmog", "cosmoem", "solgaleo", "lunala", "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", "guzzlord", "necrozma", "poipole", "naganadel", "stakataka", "blacephalon", "zamazenta", "zacian", "eternatus", "kubfu", "urshifu", "regieleki", "regidrago", "glastrier", "spectrier", "enamorus"]

def get_rarity(name):
    name_lower = name.lower()
    if "shiny" in name_lower: return "SHINY"
    for s in SPECIAL_SPECIES:
        if s in name_lower: return "LEGENDARY"
    return "COMMON"

def query_huggingface(image_bytes, hf_token, model_id, content_type="image/png"):
    """Queries Hugging Face inference endpoint for image classification with retry loop on model loading."""
    # Hugging Face migrated from api-inference.huggingface.co to router.huggingface.co/hf-inference
    endpoints = [
        f"https://router.huggingface.co/hf-inference/models/{model_id}",
        f"https://huggingface.co/api/models/{model_id}"
    ]
    headers = {
        "Authorization": f"Bearer {hf_token}" if hf_token else "",
        "Content-Type": content_type,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    for api_url in endpoints:
        for attempt in range(2):
            try:
                response = requests.post(api_url, headers=headers, data=image_bytes, timeout=10)
                if response.status_code == 400:
                    try:
                        res_json = response.json()
                        err_msg = res_json.get("error", "")
                        if "not supported" in err_msg.lower():
                            # Model not enabled for serverless router
                            return None
                    except Exception:
                        pass
                res = response.json()
                if isinstance(res, dict) and "error" in res:
                    err_msg = res.get("error", "")
                    if "loading" in err_msg.lower():
                        # Model loading cold-start, wait and retry
                        est_time = min(float(res.get("estimated_time", 5.0)), 10.0)
                        print(f"[{PROJECT_NAME}] Hugging Face model is loading. Waiting {est_time}s (Attempt {attempt+1}/2)...")
                        time.sleep(est_time)
                        continue
                    else:
                        return None
                return res
            except Exception as e:
                err_str = str(e)
                if "getaddrinfo failed" in err_str or "NameResolutionError" in err_str:
                    return "DNS_ERROR"
                time.sleep(1.0)
    return None

def classify_pokemon(image_url, hf_token, primary_model):
    """Downloads spawn image and classifies it using local ONNX / Hugging Face, validating against pokemon.txt."""
    try:
        response = requests.get(image_url, timeout=10)
        if response.status_code != 200:
            return None
        
        img_bytes = response.content
        content_type = response.headers.get("Content-Type", "image/png")
        if not content_type or "/" not in content_type:
            content_type = "image/png"
        
        with open("pokemon.txt", "r", encoding="utf-8") as f:
            valid_pokemon = {p.lower().strip() for p in f.read().splitlines() if p.strip()}

        # 1. Attempt local ONNX classification first
        try:
            from onnx_classifier import classify_image as onnx_classify
            onnx_result = onnx_classify(img_bytes)
            if onnx_result and onnx_result.lower() in valid_pokemon:
                print(f"\033[92m[{PROJECT_NAME}] [ONNX] Valid local classification: {onnx_result}\033[0m")
                return onnx_result.lower()
        except Exception as onnx_err:
            pass
            
        # 2. Build model fallback list for Hugging Face Inference
        models_to_try = []
        if primary_model:
            # Fix typo if user had the wrong one configured
            if primary_model == "imjeffharris/pokemon_classifier":
                primary_model = "imjeffhi/pokemon_classifier"
            models_to_try.append(primary_model)
            
        backup_models = [
            "imjeffhi/pokemon_classifier",
            "skshmjn/Pokemon-classifier-gen9-1025",
            "imzynoxprince/pokemons-image-classifier-gen1-gen9",
            "JJMack/pokemon_gen1_9_classifier",
            "google/vit-base-patch16-224",
            "dima806/pokemon-image-classification",
            "mtmptr/pokemon_classifier"
        ]
        for m in backup_models:
            if m not in models_to_try:
                models_to_try.append(m)
                
        dns_warned = False
        for model_id in models_to_try:
            res = query_huggingface(img_bytes, hf_token, model_id, content_type=content_type)
            
            if res == "DNS_ERROR":
                if not dns_warned:
                    print(f"\033[93m[{PROJECT_NAME}] Hugging Face DNS/Network unreachable. Falling back to Pokétwo hint solver...\033[0m")
                    dns_warned = True
                break
                
            if res is None or not isinstance(res, list):
                continue  # Model failed, try next model in fallback list
                
            # Check top 3 predictions from this model
            for top_prediction in res[:3]:
                pred_name = top_prediction.get("label", "").lower().strip()
                # Clean up potential prefix formatting from classifiers (e.g. "pikachu" instead of "n012345_pikachu")
                if "_" in pred_name:
                    pred_name = pred_name.split("_")[-1]
                    
                if pred_name in valid_pokemon:
                    print(f"\033[92m[{PROJECT_NAME}] Valid classification found: {pred_name} (Confidence: {top_prediction.get('score', 0):.2f})\033[0m")
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
                        RECENT_SENT_CATCHES[channel_id] = time.time()
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
        config = read_config()
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
                import re
                level = "?"
                pokemon_name = "Pokemon"
                
                # Match "caught a Level 42 Timburr..." case-insensitively
                match = re.search(r"caught\s+a\s+[lL]evel\s+(\d+)\s+([^!\n]+)", content)
                if match:
                    level = match.group(1).strip()
                    raw_name = match.group(2).strip()
                    # Clean raw_name: remove gender tags (:female:, :male:), IV percentage e.g. (36.02%), and trailing dots/exclamations
                    clean_name = re.sub(r':(female|male):', '', raw_name, flags=re.IGNORECASE)
                    clean_name = re.sub(r'\([\d\.\%]+\)', '', clean_name)
                    pokemon_name = clean_name.strip()
                else:
                    # Fallback split attempt
                    if "caught a level" in content.lower():
                        name_part = content.lower().split("caught a level")[1].split("!")[0].strip()
                        parts = name_part.split()
                        if parts and parts[0].isdigit():
                            level = parts[0]
                            pokemon_name = " ".join(parts[1:])
                        else:
                            pokemon_name = name_part

                rarity = get_rarity(pokemon_name)
                
                # Bulletproof Self Identification
                from utils import get_self_info
                info = get_self_info(token) if token else {}
                u_id = info.get("id", "")
                u_name = info.get("username", "").lower()
                u_gname = info.get("global_name", "").lower()

                cnt_lower = content.lower()
                is_self = False

                if u_id and (u_id in content or f"<@{u_id}>" in content or f"<@!{u_id}>" in content):
                    is_self = True
                elif u_name and (f"@{u_name}" in cnt_lower or u_name in cnt_lower):
                    is_self = True
                elif u_gname and (f"@{u_gname}" in cnt_lower or u_gname in cnt_lower):
                    is_self = True
                elif time.time() - RECENT_SENT_CATCHES.get(channel_id, 0) < 20:
                    is_self = True

                status_str = "success" if is_self else "failed"
                
                try:
                    from web_server import broadcast_engine_state
                    if is_self:
                        broadcast_engine_state("caught")
                except Exception: pass
                
                img_url = CHANNEL_IMAGES.get(channel_id, "")
                print_and_log(f"[{PROJECT_NAME}] [METRICS LOG] Catch result: {pokemon_name} (Lvl {level}, {rarity}) - Status: {status_str.upper()}", "\033[92m" if is_self else "\033[91m")
                log_to_nexus(pokemon_name, rarity, token, img_url, details=level, bot_source="POKETWO", status=status_str)

                # Real-Time Pokécoin Balance Update from Catch Message & Embeds
                full_text = content
                for embed in msg.get("embeds", []):
                    full_text += " " + embed.get("title", "") + " " + embed.get("description", "")
                
                coin_match = re.search(r'(?:received|earned|\+)\s*([\d,]+)\s*pokécoins?', full_text, re.IGNORECASE)
                if coin_match and is_self:
                    try:
                        earned_coins = int(coin_match.group(1).replace(',', ''))
                        cur_cfg = read_config()
                        old_bal = int(cur_cfg.get("pokecoins_balance", "0") or 0)
                        new_bal = old_bal + earned_coins
                        cur_cfg["pokecoins_balance"] = str(new_bal)
                        from utils import write_config
                        write_config(cur_cfg)
                        from web_server import broadcast_balance
                        broadcast_balance(str(new_bal))
                        print_and_log(f"[{PROJECT_NAME}] [POKECOINS] Earned +{earned_coins} Pokécoins! Total Balance: {new_bal} Pokécoins", "\033[92m")
                    except Exception as coin_err:
                        print(f"Error accumulating pokecoins: {coin_err}")

            except Exception as e:
                print_and_log(f"[{PROJECT_NAME}] Error logging catch to nexus: {e}", "\033[91m")

        # Pokecoins Balance Response Listener
        if author_id == POKETWO_ID:
            full_text = content
            for embed in msg.get("embeds", []):
                full_text += " " + embed.get("title", "") + " " + embed.get("description", "")
            
            if "pokécoin" in full_text.lower() or "pokecoin" in full_text.lower() or "balance" in full_text.lower():
                bal_match = re.search(r'(?:have|balance|total)\s*(?::|\s)\s*\*?\*?([\d,]+)\*?\*?\s*pokécoins?', full_text, re.IGNORECASE)
                if bal_match:
                    clean_bal = bal_match.group(1).replace(',', '')
                    if clean_bal.isdigit():
                        try:
                            cur_cfg = read_config()
                            cur_cfg["pokecoins_balance"] = clean_bal
                            from utils import write_config
                            write_config(cur_cfg)
                            from web_server import broadcast_balance
                            broadcast_balance(clean_bal)
                            print_and_log(f"[{PROJECT_NAME}] [POKECOINS] Live Balance updated: {clean_bal} Pokécoins", "\033[92m")
                        except Exception as e:
                            print(f"Error broadcasting balance: {e}")

        # Wrong Pokemon Guessed
        if author_id == POKETWO_ID and "that is the wrong" in content.lower():
            print_and_log(f"[{PROJECT_NAME}] Wrong guess detected! Requesting hint after delay...", "\033[93m")
            import threading
            def send_delayed_hint():
                global LAST_HINT_TIME
                time.sleep(2.5)
                LAST_HINT_TIME = time.time()
                bot.sendMessage(channel_id, f"<@{POKETWO_ID}> h")
            threading.Thread(target=send_delayed_hint, daemon=True).start()

        # Hint Solver with Detailed Candidate & Command Logging
        if author_id == POKETWO_ID and "the pokémon is" in content.lower():
            try:
                hint_str = content.lower().split("is ")[1].replace(".", "").strip()
                hint_clean = hint_str.replace("\\_", "_").replace(" ", "")
                
                print_and_log(f"[{PROJECT_NAME}] [HINT RECEIVED] Pattern: '{hint_clean}' (Raw message: {content})", "\033[93m")
                
                with open("pokemon.txt", "r", encoding="utf-8") as f:
                    all_pokes = [p.strip() for p in f.read().splitlines() if p.strip()]
                
                import re
                pattern = hint_clean.replace("_", ".")
                regex = re.compile(f"^{pattern}$", re.IGNORECASE)
                
                matches = list(set([p for p in all_pokes if regex.match(p)]))
                if matches:
                    print_and_log(f"[{PROJECT_NAME}] [HINT MATCHES] Found {len(matches)} candidate(s): {matches[:5]}{'...' if len(matches)>5 else ''}", "\033[96m")
                    guess = random.choice(matches)
                    print_and_log(f"[{PROJECT_NAME}] [HINT SOLVER] Selected candidate: {guess}. Dispatching catch...", "\033[92m")
                    try:
                        from web_server import broadcast_engine_state
                        broadcast_engine_state("identified", guess)
                    except Exception: pass
                    
                    global LAST_CATCH_TIME
                    LAST_CATCH_TIME = time.time()
                    import threading
                    def send_hint_catch(p_guess, c_id):
                        time.sleep(2.0)
                        cmd_text = f"<@{POKETWO_ID}> c {p_guess}"
                        bot.sendMessage(c_id, cmd_text)
                        RECENT_SENT_CATCHES[c_id] = time.time()
                        print_and_log(f"[{PROJECT_NAME}] [HINT SENT] Catch command sent: {cmd_text}", "\033[92m")
                    threading.Thread(target=send_hint_catch, args=(guess, channel_id), daemon=True).start()
                else:
                    print_and_log(f"[{PROJECT_NAME}] [HINT SOLVER] No Pokémon in dictionary matches pattern: {hint_clean}", "\033[91m")
            except Exception as e:
                print_and_log(f"[{PROJECT_NAME}] Hint solver error: {e}", "\033[91m")

        # Fled Pokemon Tracker & Auto-Learning
        if author_id == POKETWO_ID:
            fled_matches = []
            if "fled" in content.lower() and "wild" in content.lower():
                fled_matches.append(content)
            for embed in msg.get("embeds", []):
                t = embed.get("title", "")
                d = embed.get("description", "")
                if "fled" in t.lower() and "wild" in t.lower():
                    fled_matches.append(t)
                if "fled" in d.lower() and "wild" in d.lower():
                    fled_matches.append(d)
                    
            for text_to_check in fled_matches:
                try:
                    match = re.search(r"wild\s+([^.\n!]+)\s+fled", text_to_check, re.IGNORECASE)
                    if match:
                        fled_raw = match.group(1).strip()
                        fled_name = re.sub(r'[*_\\]', '', fled_raw).strip().title()
                        if fled_name:
                            print_and_log(f"[{PROJECT_NAME}] [FLED DETECTED] Wild {fled_name} fled!", "\033[93m")
                            
                            with open("pokemon.txt", "r", encoding="utf-8") as f:
                                existing_pokes = {p.strip().lower() for p in f.read().splitlines() if p.strip()}
                            
                            if fled_name.lower() not in existing_pokes:
                                print_and_log(f"[{PROJECT_NAME}] [AUTO-LEARN] Adding new Pokémon to database: {fled_name}", "\033[92m")
                                with open("pokemon.txt", "a", encoding="utf-8") as f:
                                    f.write(f"\n{fled_name}")
                            
                            try:
                                img_url = CHANNEL_IMAGES.get(channel_id, "")
                                log_to_nexus(fled_name, get_rarity(fled_name), token, img_url, text_to_check, bot_source="POKETWO", status="failed")
                            except Exception: pass
                            break
                except Exception as flee_err:
                    print(f"[{PROJECT_NAME}] Flee extraction error: {flee_err}")


        # AI Image Catching Logic
        embeds = msg.get("embeds", [])
        if author_id == POKETWO_ID and embeds:
            for embed in embeds:
                url = embed.get("image", {}).get("url", "") or embed.get("thumbnail", {}).get("url", "")
                title = embed.get("title", "").lower()
                desc = embed.get("description", "").lower()
                
                is_spawn_embed = "wild pokémon has appeared" in title or "guess the pokémon" in desc
                
                if is_spawn_embed and url:
                    CHANNEL_IMAGES[channel_id] = url
                    image_catch_active = config.get("image_catch_enabled", "true") != "false"
                    if not state.get("catch_enabled", True) or not image_catch_active:
                        return

                    hf_token = state.get("huggingface_token", "").strip()
                    if not hf_token:
                        # Hardcoded fallback token as requested
                        hf_token = "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"
                        
                    hf_model = state.get("huggingface_model", "imjeffhi/pokemon_classifier").strip()
                    
                    if not hf_token:
                        print(f"[{PROJECT_NAME}] Hugging Face API token is missing! Please configure it in Settings.")
                        return

                    print_and_log(f"[{PROJECT_NAME}] Spawn detected. Starting Hugging Face classification sequence...", "\033[96m")
                    try:
                        from web_server import broadcast_engine_state
                        broadcast_engine_state("detected", url)
                    except Exception: pass
                    pokemon_name = classify_pokemon(url, hf_token, hf_model)

                    if pokemon_name:
                        rarity = get_rarity(pokemon_name)
                        
                        import threading
                        def delayed_catch(p_name, c_id):
                            catch_delay = 2.0
                            print_and_log(f"[{PROJECT_NAME}] [AI] Identified: {p_name} ({rarity}). Waiting {catch_delay:.2f}s to catch...", "\033[92m")
                            try:
                                from web_server import broadcast_engine_state
                                broadcast_engine_state("identified", p_name)
                            except Exception: pass
                            
                            time.sleep(catch_delay)
                            
                            bot.sendMessage(c_id, f"<@{POKETWO_ID}> c {p_name}")
                            RECENT_SENT_CATCHES[c_id] = time.time()
                            print_and_log(f"[{PROJECT_NAME}] [AI] CATCH sent for: {p_name}", "\033[92m")
                            try:
                                from web_server import broadcast_engine_state
                                broadcast_engine_state("catch_sent")
                            except Exception: pass
                            
                            global LAST_CATCH_TIME
                            LAST_CATCH_TIME = time.time()
                            
                            def timeout_hint(spawn_time, c_id):
                                global LAST_HINT_TIME
                                time.sleep(15.0)
                                if LAST_SUCCESSFUL_CATCH_TIME < spawn_time and LAST_HINT_TIME < spawn_time:
                                    print_and_log(f"[{PROJECT_NAME}] 15s passed without catch confirmation. Dispatching fallback hint...", "\033[93m")
                                    LAST_HINT_TIME = time.time()
                                    bot.sendMessage(c_id, f"<@{POKETWO_ID}> h")
                            threading.Thread(target=timeout_hint, args=(LAST_CATCH_TIME, c_id), daemon=True).start()
                            
                        threading.Thread(target=delayed_catch, args=(pokemon_name, channel_id), daemon=True).start()
                    else:
                        print_and_log(f"[{PROJECT_NAME}] Could not identify Pokemon from image. Waiting 15s before fallback hint...", "\033[93m")
                        def delayed_fallback_hint(c_id, spawn_time):
                            global LAST_HINT_TIME
                            time.sleep(15.0)
                            if LAST_SUCCESSFUL_CATCH_TIME < spawn_time and LAST_HINT_TIME < spawn_time:
                                print_and_log(f"[{PROJECT_NAME}] 15s elapsed. Sending fallback hint command...", "\033[93m")
                                LAST_HINT_TIME = time.time()
                                bot.sendMessage(c_id, f"<@{POKETWO_ID}> h")
                        import threading
                        threading.Thread(target=delayed_fallback_hint, args=(channel_id, time.time()), daemon=True).start()

        # Immediate button click catching
        if author_id == POKETWO_ID and msg.get("components"):
            button_catch_active = config.get("catch_enabled", "true") != "false"
            if state.get("catch_enabled", True) and button_catch_active:
                curr_time = time.time()
                if curr_time - LAST_CATCH_TIME >= COOLDOWN_PERIOD:
                    if try_click_catch_button(bot, msg, channel_id):
                        LAST_CATCH_TIME = time.time()

def run_balance_checker(bot, token=None):
    time.sleep(15)
    while True:
        try:
            config = read_config()
            state = get_node_state(token) if token else {}
            target_chan = state.get("pokemon_channel") or config.get("pokemon_channel", "").strip()
            if target_chan:
                chan_id = target_chan.split(",")[0].strip()
                if chan_id:
                    print_and_log(f"[{PROJECT_NAME}] [POKECOINS] Requesting balance check via <@{POKETWO_ID}> bal...", "\033[94m")
                    bot.sendMessage(chan_id, f"<@{POKETWO_ID}> bal")
        except Exception as e:
            print(f"[POKECOINS] Error sending bal command: {e}")
        time.sleep(18000)

def setup(bot, token=None):
    print(f"\033[96m[{PROJECT_NAME}] I_CATCH MODULE ARMED (HUGGING FACE ONLY).\033[0m")
    bot.gateway.command({"function": lambda resp: on_message(resp, bot, token), "name": "MESSAGE_CREATE"})
    
    import threading
    threading.Thread(target=run_balance_checker, args=(bot, token), daemon=True).start()

