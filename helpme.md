# How to Get Your Discord User Token

This guide explains how to extract your Discord user account token for configuration.

> [!WARNING]
> **Security Warning:** NEVER share your Discord token with anyone. Your token provides full access to your Discord account. Keep it private and do not commit it to public GitHub repositories.

---

## Method 1: Network Tab (100% Guaranteed & Unbreakable)

This method works on all versions of Discord (Web & Desktop) and never breaks with Discord updates.

1. Open Discord in your browser (or Discord Desktop App with DevTools enabled).
2. Press **`Ctrl + Shift + I`** (or `F12`) to open **Developer Tools**.
3. Go to the **Network** tab at the top.
4. In the filter box near the top-left, type: `api` or `messages`
5. Click on any server, channel, or DM inside Discord to trigger network activity.
6. Click on any request that appears in the list (such as `messages`, `@me`, or `science`).
7. Under the **Headers** tab on the right, scroll down to **Request Headers**.
8. Find **`authorization:`**. Copy the token string next to it.

---

## Method 2: Console Snippet Method

If you prefer using the Console tab in Developer Tools:

1. Open Discord and press **`Ctrl + Shift + I`** to open Developer Tools.
2. Select the **Console** tab.
3. Paste the following JavaScript snippet and press **Enter**:

```javascript
window.webpackChunkdiscord_app.push([
  [Math.random()],
  {},
  (req) => {
    for (const id in req.c) {
      const mod = req.c[id]?.exports?.default;
      if (mod && typeof mod.getToken === 'function') {
        const token = mod.getToken();
        if (token && typeof token === 'string' && token.length > 30) {
          console.log('%cYOUR TOKEN:', 'color: #00ff00; font-size: 16px; font-weight: bold;', token);
        }
      }
    }
  }
]);
```

4. Copy the green highlighted token string from the console.

---

## Enabling Developer Tools in Discord Desktop App (Windows)

If `Ctrl + Shift + I` does not open Developer Tools in the Discord Windows Desktop App:

1. Close Discord completely (check System Tray).
2. Press **`Win + R`**, type `%appdata%\discord` and press **Enter**.
3. Open `settings.json` with Notepad.
4. Add the following line inside the JSON object:
   ```json
   "DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOU_ARE_DOING": true
   ```
5. Save the file and restart Discord.
