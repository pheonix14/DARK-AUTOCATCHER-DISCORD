use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::Mutex;
use tokio::time::sleep;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use url::Url;

use crate::catcher::{get_rarity, query_huggingface};
use crate::config::read_config;

const POKETWO_ID: &str = "716390085896962058";
const COOLDOWN_PERIOD: f64 = 120.0;

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub struct ConfirmationInfo {
    pub message_id: String,
    pub author_id: String,
    pub flags: u64,
    pub yes_id: Option<String>,
    pub no_id: Option<String>,
    pub timestamp: f64,
}

#[derive(Clone)]
pub struct AppState {
    pub config_path: std::path::PathBuf,
    pub config: Arc<Mutex<HashMap<String, String>>>,
    pub logs: Arc<Mutex<Vec<Value>>>,
    pub active_confirmations: Arc<Mutex<HashMap<String, ConfirmationInfo>>>,
    pub last_catch_time: Arc<Mutex<f64>>,
    pub channel_images: Arc<Mutex<HashMap<String, String>>>,
    pub ws_broadcast: tokio::sync::broadcast::Sender<String>,
}

    pub async fn add_log(&self, msg: &str) {
        let utc = chrono::Utc::now();
        // Convert to PST (UTC-8) offset directly
        let tz_offset = chrono::FixedOffset::west_opt(8 * 3600).unwrap();
        let sf_now = utc.with_timezone(&tz_offset);
        let timestamp = sf_now.format("%H:%M:%S").to_string();
        let log_entry = json!({
            "time": timestamp,
            "msg": msg
        });
        self.logs.lock().await.push(log_entry.clone());
        let _ = self.ws_broadcast.send(json!({
            "type": "log",
            "data": log_entry
        }).to_string());
    }

    pub async fn add_log_structured(&self, name: &str, rarity: &str, image_url: &str, details: &str, status: &str) {
        let utc = chrono::Utc::now();
        let tz_offset = chrono::FixedOffset::west_opt(8 * 3600).unwrap();
        let sf_now = utc.with_timezone(&tz_offset);
        let timestamp = sf_now.format("%H:%M:%S").to_string();
        let date_str = sf_now.format("%Y-%m-%d").to_string();
        let msg_text = format!("[POKETWO] {} ({}) — {}", name, rarity, details);
        
        self.add_log(&msg_text).await;

        let entry = json!({
            "time": timestamp,
            "date": date_str,
            "msg": msg_text,
            "name": name,
            "rarity": rarity,
            "image_url": image_url,
            "bot_source": "POKETWO",
            "status": status,
        });

        let _ = self.ws_broadcast.send(json!({
            "type": "structured_log",
            "data": entry
        }).to_string());
    }
}

pub async fn send_message(token: &str, channel_id: &str, content: &str) {
    let client = reqwest::Client::new();
    let url = format!("https://discord.com/api/v9/channels/{}/messages", channel_id);
    let _ = client.post(&url)
        .header("Authorization", token)
        .json(&json!({ "content": content }))
        .send()
        .await;
}

pub async fn click_button(
    token: &str,
    channel_id: &str,
    message_id: &str,
    application_id: &str,
    custom_id: &str,
    flags: u64
) {
    let client = reqwest::Client::new();
    let url = "https://discord.com/api/v9/interactions";
    
    // Simulate natural nonce sequence
    let nonce = format!("{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis());
    let payload = json!({
        "type": 3,
        "nonce": nonce,
        "guild_id": null,
        "channel_id": channel_id,
        "message_flags": flags,
        "message_id": message_id,
        "application_id": application_id,
        "session_id": "session_id_placeholder",
        "data": {
            "component_type": 2,
            "custom_id": custom_id
        }
    });

    let _ = client.post(url)
        .header("Authorization", token)
        .json(&payload)
        .send()
        .await;
}

// Main thread gateway listener
pub async fn start_discord_gateway(state: AppState) {
    loop {
        let token = {
            let cfg = state.config.lock().await;
            cfg.get("token").cloned().unwrap_or_default()
        };

        if token.is_empty() || token == "YOUR_TOKEN_HERE" {
            state.add_log("Awaiting configuration: Discord User Token is missing.").await;
            sleep(Duration::from_secs(5)).await;
            continue;
        }

        state.add_log("Connecting to Discord Gateway...").await;

        let gateway_url = "wss://gateway.discord.gg/?v=9&encoding=json";
        let url = Url::parse(gateway_url).unwrap();

        if let Ok((ws_stream, _)) = connect_async(url).await {
            let (mut write, mut read) = ws_stream.split();
            let mut heartbeat_interval = Duration::from_millis(41250);
            let state_clone = state.clone();

            // Heartbeat worker
            let (hb_tx, mut hb_rx) = tokio::sync::mpsc::channel::<bool>(1);
            let hb_write = Arc::new(Mutex::new(write));
            let hb_write_clone = hb_write.clone();

            tokio::spawn(async move {
                loop {
                    tokio::select! {
                        _ = sleep(heartbeat_interval) => {
                            let mut w = hb_write_clone.lock().await;
                            let _ = w.send(Message::Text(json!({ "op": 1, "d": null }).to_string())).await;
                        }
                        _ = hb_rx.recv() => {
                            break;
                        }
                    }
                }
            });

            // Identity handshake
            {
                let mut w = hb_write.lock().await;
                let identify = json!({
                    "op": 2,
                    "d": {
                        "token": token,
                        "properties": {
                            "$os": "windows",
                            "$browser": "chrome",
                            "$device": "pc"
                        }
                    }
                });
                let _ = w.send(Message::Text(identify.to_string())).await;
            }

            state_clone.add_log("Discord Gateway connected successfully.").await;

            while let Some(Ok(message)) = read.next().await {
                if let Message::Text(text) = message {
                    if let Ok(value) = serde_json::from_str::<Value>(&text) {
                        let op = value.get("op").and_then(|v| v.as_u64()).unwrap_or(0);
                        
                        // Heartbeat ack / Hello
                        if op == 10 {
                            if let Some(d) = value.get("d") {
                                if let Some(hb) = d.get("heartbeat_interval").and_then(|v| v.as_u64()) {
                                    heartbeat_interval = Duration::from_millis(hb);
                                }
                            }
                        }

                        if op == 0 {
                            if let Some(t) = value.get("t").and_then(|v| v.as_str()) {
                                if t == "MESSAGE_CREATE" {
                                    if let Some(d) = value.get("d") {
                                        handle_gateway_message(&state_clone, d).await;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Close heartbeat worker
            let _ = hb_tx.send(true).await;
            state_clone.add_log("Connection to Discord Gateway closed. Retrying...").await;
        }

        sleep(Duration::from_secs(5)).await;
    }
}

async fn handle_gateway_message(state: &AppState, msg: &Value) {
    let author_id = msg.get("author").and_then(|a| a.get("id")).and_then(|v| v.as_str()).unwrap_or("");
    let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
    let channel_id = msg.get("channel_id").and_then(|v| v.as_str()).unwrap_or("");
    let message_id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("");
    
    // Check listener permissions
    let (prefix, restricted_listener, token) = {
        let cfg = state.config.lock().await;
        (
            cfg.get("prefix").cloned().unwrap_or_else(|| ".".to_string()),
            cfg.get("listener_id").cloned().unwrap_or_else(|| "self".to_string()),
            cfg.get("token").cloned().unwrap_or_default()
        )
    };

    // 1. Capture Prompts from Pokétwo
    if author_id == POKETWO_ID {
        if let Some(components) = msg.get("components").and_then(|c| c.as_array()) {
            let mut yes_id = None;
            let mut no_id = None;
            for row in components {
                if let Some(btns) = row.get("components").and_then(|c| c.as_array()) {
                    for btn in btns {
                        let label = btn.get("label").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                        let custom_id = btn.get("custom_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let style = btn.get("style").and_then(|v| v.as_u64()).unwrap_or(0);
                        if label.contains("yes") || label.contains("confirm") || label.contains("accept") || style == 3 {
                            yes_id = Some(custom_id);
                        }
                        if label.contains("no") || label.contains("cancel") || label.contains("deny") || style == 4 {
                            no_id = Some(custom_id);
                        }
                    }
                }
            }
            if yes_id.is_some() || no_id.is_some() {
                let epoch = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
                state.active_confirmations.lock().await.insert(channel_id.to_string(), ConfirmationInfo {
                    message_id: message_id.to_string(),
                    author_id: author_id.to_string(),
                    flags: msg.get("flags").and_then(|v| v.as_u64()).unwrap_or(0),
                    yes_id,
                    no_id,
                    timestamp: epoch
                });
            }
        }
    }

    // 2. Parse congratulations / catches confirmations
    if author_id == POKETWO_ID && content.to_lowercase().contains("congratulations") {
        if let Some(name_part) = content.split("caught a level").nth(1) {
            if let Some(raw_name) = name_part.split('!').next() {
                let trimmed = raw_name.trim();
                let words: Vec<&str> = trimmed.split_whitespace().collect();
                let pokemon_name = if !words.is_empty() && words[0].chars().all(|c| c.is_ascii_digit()) {
                    words[1..].join(" ")
                } else {
                    words.join(" ")
                };
                
                let rarity = get_rarity(&pokemon_name);
                let self_mention = format!("<@"); // general check
                let is_self = content.contains(&self_mention);
                let status_str = if is_self { "success" } else { "failed" };
                
                let img_url = state.channel_images.lock().await.get(channel_id).cloned().unwrap_or_default();
                state.add_log_structured(&pokemon_name, rarity, &img_url, content, status_str).await;
            }
        }
    }

    // 3. Process commands
    if content.starts_with(&prefix) {
        let clean = &content[prefix.len()..];
        let args: Vec<&str> = clean.split_whitespace().collect();
        if args.is_empty() { return; }
        
        let cmd = args[0].to_lowercase();
        
        // Execute prompt confirmations
        if cmd == "yes" || cmd == "accept" {
            let mut confs = state.active_confirmations.lock().await;
            if let Some(info) = confs.remove(channel_id) {
                if let Some(yes_id) = info.yes_id {
                    click_button(&token, channel_id, &info.message_id, POKETWO_ID, &yes_id, info.flags).await;
                    send_message(&token, channel_id, "[PROJECT DARK] Target Prompt CONFIRMED").await;
                }
            }
            return;
        }

        if cmd == "no" || cmd == "disagree" {
            let mut confs = state.active_confirmations.lock().await;
            if let Some(info) = confs.remove(channel_id) {
                if let Some(no_id) = info.no_id {
                    click_button(&token, channel_id, &info.message_id, POKETWO_ID, &no_id, info.flags).await;
                    send_message(&token, channel_id, "[PROJECT DARK] Target Prompt CANCELED").await;
                }
            }
            return;
        }

        // Basic status triggers
        if cmd == "ping" {
            send_message(&token, channel_id, "[PROJECT DARK] Active. Latency: SUCCESS (tokio-gateway)").await;
        }
    }

    // 4. Capture Pokemon Spawns & Run Autocatcher Inference
    if author_id == POKETWO_ID {
        if let Some(embeds) = msg.get("embeds").and_then(|e| e.as_array()) {
            for embed in embeds {
                if let Some(img) = embed.get("image") {
                    if let Some(url) = img.get("url").and_then(|v| v.as_str()) {
                        if url.to_lowercase().contains("pokemon") {
                            state.channel_images.lock().await.insert(channel_id.to_string(), url.to_string());
                            
                            // Check states
                            let (catcher_active, hf_token, hf_model) = {
                                let cfg = state.config.lock().await;
                                (
                                    cfg.get("catch_enabled").map(|v| v == "true").unwrap_or(true),
                                    cfg.get("huggingface_token").cloned().unwrap_or_default(),
                                    cfg.get("huggingface_model").cloned().unwrap_or_else(|| "imjeffharris/pokemon_classifier".to_string())
                                )
                            };

                            if !catcher_active { return; }

                            // Cooldown lock
                            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
                            let mut last_catch = state.last_catch_time.lock().await;
                            if now - *last_catch < COOLDOWN_PERIOD {
                                state.add_log("Catcher Cooldown: Ignoring spawn...").await;
                                return;
                            }

                            if hf_token.is_empty() {
                                state.add_log("Neural error: Hugging Face token is not configured.").await;
                                return;
                            }

                            state.add_log("Spawn image detected. Classifying...").await;
                            let state_clone = state.clone();
                            let url_clone = url.to_string();
                            
                            tokio::spawn(async move {
                                if let Some(name) = query_huggingface(&url_clone, &hf_token, &hf_model).await {
                                    state_clone.add_log(&format!("Neural Classifier Prediction: {}", name)).await;
                                    
                                    // 3.0s delay
                                    sleep(Duration::from_secs(3)).await;
                                    
                                    send_message(&token, channel_id, &format!("<@{}> c {}", POKETWO_ID, name)).await;
                                    
                                    // Update cooldown
                                    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs_f64();
                                    *state_clone.last_catch_time.lock().await = now;
                                }
                            });
                        }
                    }
                }
            }
        }
    }
}
