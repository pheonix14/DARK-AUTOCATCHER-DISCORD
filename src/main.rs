use axum::{
    extract::{ws::{Message as WsMessage, WebSocket, WebSocketUpgrade}, State},
    response::{Html, IntoResponse, Response},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use notify::{RecursiveMode, Watcher};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

mod catcher;
mod config;
mod discord;

use crate::config::read_config;
use crate::discord::{start_discord_gateway, AppState};

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    println!(
        r#"
    ██████╗  █████╗ ██████╗ ██╗  ██╗
    ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝
    ██║  ██║███████║██████╔╝█████╔╝ 
    ██║  ██║██╔══██║██╔══██╗██╔═██╗ 
    ██████╔╝██║  ██║██║  ██║██║  ██╗
    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
    "#
    );
    println!("[DARK CORE] SYSTEM OVERRIDE INITIATED (RUST SYSTEM)...");

    let base_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let config_path = base_dir.join("config.txt");

    let config_data = read_config(&config_path);
    let logs = Arc::new(Mutex::new(Vec::new()));
    let active_confirmations = Arc::new(Mutex::new(HashMap::new()));
    let last_catch_time = Arc::new(Mutex::new(0.0));
    let channel_images = Arc::new(Mutex::new(HashMap::new()));

    // WebSocket broadcaster channel
    let (ws_broadcast, _) = tokio::sync::broadcast::channel::<String>(100);

    let state = AppState {
        config_path: config_path.clone(),
        config: Arc::new(Mutex::new(config_data)),
        logs,
        active_confirmations,
        last_catch_time,
        channel_images,
        ws_broadcast,
    };

    // Watchdog configuration file observer
    let state_watch = state.clone();
    let config_path_clone = config_path.clone();
    let mut watcher = notify::recommended_watcher(move |res| {
        if let Ok(event) = res {
            // Check if modify event
            if event.kind.is_modify() {
                let state_clone = state_watch.clone();
                let path_clone = config_path_clone.clone();
                tokio::spawn(async move {
                    let new_cfg = read_config(&path_clone);
                    {
                        let mut cfg = state_clone.config.lock().await;
                        *cfg = new_cfg.clone();
                    }
                    let _ = state_clone.ws_broadcast.send(
                        json!({
                            "type": "config",
                            "data": new_cfg
                        })
                        .to_string(),
                    );
                });
            }
        }
    })
    .unwrap();
    let _ = watcher.watch(&config_path, RecursiveMode::NonRecursive);

    // Boot Discord Gateway Socket Thread
    let state_discord = state.clone();
    tokio::spawn(async move {
        start_discord_gateway(state_discord).await;
    });

    // Axum Router configuration
    let app = Router::new()
        .route("/", get(serve_index))
        .route("/logo.png", get(serve_logo))
        .route("/favicon.ico", get(serve_favicon))
        .route("/ws", get(ws_handler))
        .with_state(state.clone());

    // Bind HTTP port 8085
    let addr = SocketAddr::from(([127, 0, 0, 1], 8085));
    println!("[DARK] Dashboard live at http://{}", addr);
    println!("[DARK] WebSocket proxy configured via Axum path /ws");
    
    // Bind WebSocket port 8086 (legacy websocket port back compatibility)
    let ws_state = state.clone();
    tokio::spawn(async move {
        let ws_app = Router::new()
            .route("/", get(ws_handler))
            .with_state(ws_state);
        let listener = tokio::net::TcpListener::bind("127.0.0.1:8086").await.unwrap();
        let _ = axum::serve(listener, ws_app).await;
    });

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn serve_index() -> impl IntoResponse {
    let content = std::fs::read_to_string("index.html").unwrap_or_else(|_| {
        "<html><body><h3>Dashboard asset index.html is missing.</h3></body></html>".to_string()
    });
    Html(content)
}

async fn serve_logo() -> impl IntoResponse {
    let bytes = std::fs::read("logo.png").unwrap_or_default();
    Response::builder()
        .header("content-type", "image/png")
        .body(axum::body::Body::from(bytes))
        .unwrap()
}

async fn serve_favicon() -> impl IntoResponse {
    let bytes = std::fs::read("favicon.ico").unwrap_or_default();
    Response::builder()
        .header("content-type", "image/x-icon")
        .body(axum::body::Body::from(bytes))
        .unwrap()
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_ws(socket, state))
}

async fn handle_ws(socket: WebSocket, state: AppState) {
    let mut rx = state.ws_broadcast.subscribe();
    
    // Send initial configuration states
    let config = {
        let cfg = state.config.lock().await;
        cfg.clone()
    };
    
    let (mut ws_sender, mut ws_receiver) = socket.split();

    let initial_config_payload = json!({
        "type": "config",
        "data": config
    }).to_string();
    let _ = ws_sender.send(WsMessage::Text(initial_config_payload)).await;

    // Send history logs
    let logs = {
        let lg = state.logs.lock().await;
        lg.clone()
    };
    let initial_logs_payload = json!({
        "type": "logs",
        "data": logs
    }).to_string();
    let _ = ws_sender.send(WsMessage::Text(initial_logs_payload)).await;

    // WS Inputs Handler
    let state_recv = state.clone();
    tokio::spawn(async move {
        while let Some(Ok(WsMessage::Text(text))) = ws_receiver.next().await {
            if let Ok(val) = serde_json::from_str::<Value>(&text) {
                if let Some(t) = val.get("type").and_then(|v| v.as_str()) {
                    if t == "update_config" {
                        if let Some(updates) = val.get("data").and_then(|v| v.as_object()) {
                            let mut cfg = state_recv.config.lock().await;
                            for (k, v) in updates {
                                if let Some(s) = v.as_str() {
                                    cfg.insert(k.clone(), s.to_string());
                                }
                            }
                            let _ = crate::config::write_config(&state_recv.config_path, &cfg);
                            let _ = state_recv.ws_broadcast.send(json!({
                                "type": "config",
                                "data": cfg.clone()
                            }).to_string());
                        }
                    }
                }
            }
        }
    });

    // Send broadcast logs
    while let Ok(msg) = rx.recv().await {
        if ws_sender.send(WsMessage::Text(msg)).await.is_err() {
            break;
        }
    }
}
