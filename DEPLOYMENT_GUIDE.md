# 🌌 PROJECT DARK: The Ultimate Setup & Deployment Guide

Welcome to **Project Dark v4**! This guide will walk you through exactly how to set up the autocatcher on your local PC or run it in the cloud 24/7 for free using Render.com.

> [!IMPORTANT]
> ## ⭐ STEP 1: STAR AND FORK THIS REPOSITORY! ⭐
> Before you do anything else, you must **Star** and **Fork** this repository! 
> 
> Due to high demand and the overpowered nature of this tool, **this project will be going 100% PRIVATE very soon**. If you don't fork it to your own account right now, you will lose access to the local ONNX engine and all future updates forever. 
> 
> **How to do it:**
> 1. Scroll to the top right of the GitHub page.
> 2. Click the **⭐ Star** button to support the project.
> 3. Click the **🍴 Fork** button and select "Create a new fork" to save a copy to your own GitHub account.

---

## 💻 DEPLOYMENT METHOD 1: LOCAL MACHINE (Windows / macOS / Linux)

Running locally is best if you want to use the web dashboard on your own PC and see the AI catch in real-time.

### Prerequisites
- Install **Python 3.10** or higher.
- Install **Git**.

### Instructions
1. **Clone your Fork**
   Open your terminal/command prompt and clone the copy you just forked:
   ```bash
   git clone https://github.com/YOUR_USERNAME/project-dark.git
   cd project-dark
   ```

2. **Configure your Token**
   Open the `config.txt` file and replace `YOUR_DISCORD_USER_TOKEN` with your actual Discord token. Make sure `pokemon_channel` is also set to the channel ID where Pokétwo spawns.

3. **Install Dependencies**
   Install the required AI vision libraries and web server dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Core Engine**
   Start the application:
   ```bash
   python main.py
   ```
   *The system will automatically download the required ONNX AI models on first boot.*

5. **Open the Dashboard**
   Open your web browser and navigate to: **`http://localhost:8085`**
   You can now monitor everything from the beautiful glassmorphic UI!

---

## ☁️ DEPLOYMENT METHOD 2: RENDER.COM (Free 24/7 Cloud Hosting)

Running on Render.com is perfect if you want the autocatcher to run 24/7 without keeping your computer on.

> [!WARNING]
> You **MUST** put your tokens in `config.txt` inside your GitHub repository *before* you deploy to Render. Otherwise, the cloud instance will crash on startup. Make sure your forked repository is set to **PRIVATE** before putting your token in it!

### Instructions
1. **Prepare your GitHub Repo**
   - Go to your forked repository on GitHub.
   - Go to **Settings**, scroll to the bottom, and click **Change visibility** to make the repository **PRIVATE**.
   - Edit the `config.txt` file directly on GitHub and insert your `token` and `pokemon_channel`. Save the commit.

2. **Connect to Render**
   - Go to [Render.com](https://render.com) and sign up for a free account using your GitHub login.
   - Click **New +** at the top right and select **Web Service**.
   - Connect your GitHub account and select your private `project-dark` repository.

3. **Configure the Service**
   - **Name**: `dark-node` (or whatever you like)
   - **Region**: Any (Choose the one closest to you)
   - **Branch**: `main`
   - **Runtime**: `Docker` (Render will automatically detect the `Dockerfile` and `render.yaml` in the repository).
   - **Instance Type**: `Free`

4. **Deploy & Forget**
   - Click **Create Web Service**.
   - Render will begin building the Docker container. This takes a few minutes because it has to install the ONNX AI engine.
   - Once it says **Live**, your bot is running 24/7! 

> [!NOTE]
> On the free tier of Render, incoming web ports are heavily firewalled, meaning you might not be able to access the web dashboard UI remotely. However, the background Discord bot and ONNX vision engine will run perfectly and catch Pokémon silently!
