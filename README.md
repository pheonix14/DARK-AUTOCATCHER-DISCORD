<div align="center">

# 🌌 PROJECT DARK v4.0.0

**The Ultimate Stealth Autocatcher & Controller Dashboard for Pokétwo**

[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue.svg?style=for-the-badge&logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![ONNX Runtime](https://img.shields.io/badge/AI-ONNX_Runtime-orange.svg?style=for-the-badge&logo=onnx)](https://onnxruntime.ai/)
[![Docker Support](https://img.shields.io/badge/Docker-Supported-2496ED.svg?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![Render Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7.svg?style=for-the-badge&logo=render)](https://render.com/)

*A lightweight selfbot automation framework featuring a responsive Realme UI / PS5 inspired web dashboard, real-time logs, an active progress flow, and embedded AI Vision.*

</div>

---

## ⚠️ URGENT: REPOSITORY GOING PRIVATE SOON!

> [!CAUTION]
> **⭐ STAR AND FORK THIS REPOSITORY IMMEDIATELY! ⭐**
> 
> Due to high demand and the overpowered nature of this tool, **I will be making this project 100% PRIVATE very soon.** If you don't star and fork it right now, you will lose access to future updates and the blazing-fast local ONNX engine forever! 
> 
> Please support the project by leaving a Star! It helps me keep it alive and free for as long as possible.

---

## 📸 DASHBOARD SCREENSHOTS & PAGE GUIDE

PROJECT DARK v4 features a responsive 8-page Web Dashboard. Each page is crafted with glassmorphic visuals, smooth typography, and real-time WebSocket connectivity:

<div align="center">

### 1. 🏠 Home Control Center (`pages/index.html`)
*Live spawner status, instant ONNX autocatcher toggle, real-time counters, and quick metrics.*
<img src="assets/dashboard_home.png" alt="Home Dashboard" width="90%">

<br><br>

### 2. ⚡ Live Interaction Console (`pages/interact.html`)
*Execute bot commands, trigger manual spawns, inspect responses, and run interactive tests.*
<img src="assets/interact_console.png" alt="Interaction Console" width="90%">

<br><br>

### 3. 📜 Real-Time Terminal Logs (`pages/logs.html`)
*Stream real-time terminal output, WebSocket events, AI vision classifications, and debug messages.*
<img src="assets/terminal_logs.png" alt="Terminal Logs" width="90%">

<br><br>

### 4. 🖼️ Acquisitions Gallery & History (`pages/history.html`)
*Browse your caught Pokémon gallery with sprite cards, exact timestamp logs, and IV metrics.*
<img src="assets/catch_history.png" alt="Catch History" width="90%">

<br><br>

### 5. 👥 Multi-Account Profiles (`pages/profiles.html`)
*Manage and hot-swap between multiple Discord user accounts and custom target profile configs.*
<img src="assets/account_profiles.png" alt="Account Profiles" width="90%">

<br><br>

### 6. ⚙️ System Settings & AI Config (`pages/settings.html`)
*Tune catch delays, configure webhook pings, tweak HuggingFace / local ONNX models, and spam timers.*
<img src="assets/system_settings.png" alt="System Settings" width="90%">

<br><br>

### 7. 💎 Dark Pro & Premium Hub (`pages/premium.html`)
*Unlock 24/7 cloud hosting templates, captcha auto-pause indicators, multi-channel support, and priority builds.*
<img src="assets/premium_upgrade.png" alt="Premium Upgrade" width="90%">

<br><br>

### 8. ℹ️ System Architecture & Features A-Z (`pages/about.html`)
*Complete breakdown of system architecture, zero-cost cloud deployment, memory footprint specs, and A-Z features.*
<img src="assets/features_about.png" alt="Features & About" width="90%">

</div>

---

## ⚠️ DISCLAIMER & WARNING

> [!CAUTION]
> - **EDUCATIONAL & RESEARCH PURPOSES ONLY:** This project is created strictly for academic research and educational demonstration. The code serves as a reference for network socket handling, WebSocket communication, AI vision integration, and Web UI design.
> - **DISCORD TERMS OF SERVICE:** Using selfbots or automated clients violates Discord's Terms of Service. If you choose to run this software, you do so at your own risk. Your Discord account could be permanently banned or suspended.
> - **NO LIABILITY:** The author is not responsible for any misuse, account suspensions, bans, actions taken by Discord, or issues resulting from running this software. Use it entirely at your own discretion.

---

## ✨ WHY PROJECT DARK? 

PROJECT DARK isn't just an autocatcher—it's a **command center**. We moved away from messy CLI text spam into a beautiful, fully integrated local web application. 

### ✦ CORE FEATURES

* 🎛️ **System Control Panel**: Beautiful glassmorphic dashboard styled in deep space hues with Outfit/Orbitron typography.
* ⚡ **Local ONNX AI Engine**: Image classification runs locally at blazing speeds using `onnxruntime`—no more relying on rate-limited cloud APIs or heavy PyTorch installations. It is highly optimized to run smoothly even on 300MB RAM free-tier hosts.
* 📊 **Real-Time Progress Flow**: An interactive visual stepper (`Detected -> Sent Catch -> Caught`) displays catch sequences in real time over WebSockets.
* 🖼️ **Acquisitions Gallery**: View caught Pokémon cover cards with sprite images retrieved directly from Discord messages.
* 🚀 **Auto-Spammer (Spawn Trigger)**: Periodically send automated text messages to trigger spawn events automatically inside your target channel.
* 📱 **Floating Candybox Navigation**: Roman numeral bubbles (I-VII) in the bottom-right corner let you slide between dashboard panels seamlessly.

---

## ★ FEATURE MATRIX (FREE VS PREMIUM)

| Feature | 🆓 Free Version | 💎 Premium Edition |
| :--- | :--- | :--- |
| **Autocatching AI** | Ultra-fast Local ONNX Vision | Ultra-fast Local ONNX Vision |
| **Alerts & Pings** | Browser alert alerts | Instant Discord webhook alerts |
| **24/7 Cloud Hosting** | 1-Click Render.com / Docker | 1-Click Render.com / Docker |
| **Multi-channel** | ⚡ Limited (Up to 2 Channels nd more) | ✅ **Multi-Channel (Up to 10 Channels)** |
| **Stealth Mode** | ❌ Standard Speed | ✅ **Human-like Cooldowns** |
| **Custom Features** | ❌ None | ✅ **Custom Requests Built For You** |

> **Note:** The premium version is available for a small tip inside the dashboard!

---

## 💻 DEVICE COMPATIBILITY & SUPPORT

* **Cross-Platform Integration**: Runs seamlessly on all desktop operating systems including Windows 10/11, macOS, and Linux distributions.
* **Cloud Compatibility**: Verified support for virtual machines, Docker container engines, and low-resource hosts like **Render.com**.
* **Micro Footprint**: Highly optimized memory management enables running on hosts with under 300MB of RAM.

---

## ⚙️ CONFIGURATION (config.txt)

The app reads and writes its settings in real time from a local `config.txt` file at the root. You can edit this directly or use the beautiful web Dashboard UI!

```ini
token=YOUR_DISCORD_USER_TOKEN
listener_id=self
prefix=.
catch_enabled=true
pokemon_channel=YOUR_DISCORD_CHANNEL_ID
huggingface_token=hf_YOUR_TOKEN
huggingface_model=imjeffhi/pokemon_classifier
notifications_enabled=true
spam_enabled=false
spam_channel_id=YOUR_SPAM_CHANNEL_ID
spam_delay=8.0
```

### 🔑 How to Get Your Discord Token

> [!WARNING]
> NEVER share your token with anyone!

**On PC (Browser):**
1. Open Discord in your web browser and press `F12` (or `Ctrl+Shift+I`) to open Developer Tools.
2. Go to the **Console** tab.
3. Paste the following script and hit Enter:
   ```javascript
   window.webpackChunkdiscord_app.push([[Math.random()],{},req=>{for(const m of Object.keys(req.c).map(x=>req.c[x].exports).filter(x=>x)){if(m.default&&m.default.getToken!==undefined){return console.log(m.default.getToken())}if(m.getToken!==undefined){return console.log(m.getToken())}}}]);console.log('%cWait!', 'color: red; font-size: 50px;');
   ```
4. Your token will be printed in the console.

**On Android:**
1. Download a browser that supports developer tools (like Kiwi Browser).
2. Log into Discord Web (Desktop Mode).
3. Open Developer Tools in the browser settings and run the exact same script above in the Console.

---

## 🚀 LOCAL EXECUTION

Ensure you have **Python 3.10+** installed.

1. **Clone & Enter Repository**
   ```bash
   git clone https://github.com/pheonix14/project-dark.git
   cd project-dark
   ```
2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```
3. **Launch Application**
   ```bash
   python main.py
   ```
4. **Open Dashboard**
   Navigate to `http://localhost:8085` in your browser to view the control panel.

---

## ☁️ DEPLOYMENT PROTOCOLS

### PROTOCOL A: DOCKER DEPLOYMENT
You can package the application into a container using the provided `Dockerfile`.

```bash
# 1. Build Docker Image
docker build -t project-dark-node .

# 2. Execute Container
docker run -d -p 8085:8085 -p 8086:8086 --name dark-node project-dark-node
```

### PROTOCOL B: RENDER.COM DEPLOYMENT (FREE 24/7 HOSTING)

Prime the project for free cloud hosting on Render. 

> [!IMPORTANT]
> **Before deploying**, you MUST edit your `config.txt` file and fill in your `token` and `pokemon_channel` IDs! The cloud instance will crash or idle if tokens are missing.

1. Push your configured project to a **Private** GitHub repository.
2. Connect your repository to [Render.com](https://render.com).
3. Select **Web Service** deployment.
4. Use the following specifications:
   - **Environment**: `Docker`
   - Render will automatically use the provided `Dockerfile` and `render.yaml` configuration to boot.
5. The service will run completely inside Render's 300MB RAM spec. Note that the live dashboard WebSocket logs may not stream correctly on Render's free tier firewall, but the background bot will execute perfectly!

---

<div align="center">
  <b>Developed by pheonix14</b><br>
  <i>"Embrace the Dark."</i>
</div>
