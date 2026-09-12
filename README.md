# PROJECT DARK

**Stealth Autocatcher & Controller Dashboard for Pokétwo**

PROJECT DARK is a lightweight selfbot automation framework designed to run Pokétwo autocatching tasks stealthily. It features a responsive Realme UI / PS5 inspired web dashboard with real-time logs, active progress flow, and complete command documentation.

---

## ⚠️ DISCLAIMER & WARNING

> [!WARNING]
> - **EDUCATIONAL & RESEARCH PURPOSES ONLY:** This project is created strictly for academic research and educational demonstration. The code serves as a reference for network socket handling, WebSocket communication, and API integration in Python and Rust.
> - **DISCORD TERMS OF SERVICE:** Using selfbots or automated clients violates Discord's Terms of Service. If you choose to run this software, you do so at your own risk. Your Discord account could be permanently banned or suspended.
> - **NO LIABILITY:** The author is not responsible for any misuse, account suspensions, bans, actions taken by Discord, or issues resulting from running this software. Use it entirely at your own discretion.

---

## ✦ CORE FEATURES

- **System Control Panel**: Beautiful glassmorphic dashboard styled in deep space hues with Outfit/Orbitron typography.
- **Floating Candybox Navigation**: Roman numeral bubbles (I-VII) in the bottom-right corner let you slide between panels seamlessly.
- **Real-Time progress flow**: An interactive visual stepper (`Detected -> Sent Catch -> Caught`) displays catch sequences in real time.
- **Acquisitions Gallery**: View caught Pokémon cover cards with sprite images retrieved from Discord messages.
- **Auto-Spammer (Spawn Trigger)**: Periodically send automated text messages to trigger spawn events automatically inside your target channel.
- **Cloud-Native Inference**: Image classification requests run entirely via the Hugging Face Inference API cloud endpoints. Zero heavy local model files (like PyTorch or Transformers) are loaded on your local host machine or deployment servers, ensuring compatibility with small hosting specs (e.g. Render's 300MB RAM limit).
- **Premium Upgrades**: Extended capabilities (available to view inside the dashboard premium upgrades panel).

---

## ★ FEATURE MATRIX (FREE VS PREMIUM)

| Feature | Free Version | Premium version |
| :--- | :--- | :--- |
| **Autocatching Speed** | Standard catch delay | Optimized zero-latency algorithms |
| **Neural Classifier** | Standard Model | Custom trained Private Classifiers |
| **Multi-account Node** | Single account session | Distribute threads globally across distinct nodes |
| **Alerts & Pings** | Browser alert alerts | Instant Discord webhook alerts |
| **24/7 Hosting** | Sleeps on idle | Zero downtime 24/7 hosting |
| **Credentials Storage** | Local config files | Secure Credentials Storage |

---

## 📱 DEVICE COMPATIBILITY & SUPPORT
- **Cross-Platform Integration**: Runs seamlessly on all desktop operating systems including Windows 10/11, macOS, and Linux distributions.
- **Cloud Compatibility**: Verified support for virtual machines, Docker container engines, and low-resource hosts like Render.com.
- **Zero Local Footprint**: Highly optimized resource management enables running on hosts with under 300MB of RAM.

---

## ⚙ LOCAL CONFIGURATION (config.txt)

The app reads and writes its settings in real time from a local `config.txt` file at the root:

```text
token=YOUR_DISCORD_USER_TOKEN
listener_id=self
prefix=.
catch_enabled=true
pokemon_channel=YOUR_DISCORD_CHANNEL_ID
huggingface_token=hf_YOUR_TOKEN
huggingface_model=imjeffharris/pokemon_classifier
notifications_enabled=true
spam_enabled=false
spam_channel_id=YOUR_SPAM_CHANNEL_ID
spam_delay=8.0
```

To run the instance, populate these fields in the panel settings page.

---

## 🚀 LOCAL EXECUTION

Ensure you have **Python 3.10+** installed.

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```
2. **Launch Application**
   ```bash
   python main.py
   ```
3. **Open Dashboard**
   Navigate to `http://localhost:8085` to view the control panel.

---

## ☁ DEPLOYMENT PROTOCOLS

### PROTOCOL A: DOCKER DEPLOYMENT
You can package the application into a container using the provided `Dockerfile`.

1. **Build Docker Image**
   ```bash
   docker build -t project-dark-node .
   ```
2. **Execute Container**
   ```bash
   docker run -d -p 8085:8085 -p 8086:8086 --name dark-node project-dark-node
   ```

### PROTOCOL B: RENDER.COM DEPLOYMENT
Prime the project for free cloud hosting on Render:
1. Connect your repository to Render.
2. Select **Web Service** deployment.
3. Use the following specifications:
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
4. The service will run completely inside Render's 300MB RAM spec as all classification processes are offloaded to Hugging Face cloud endpoints.
