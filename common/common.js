/**
 * PROJECT DARK v3.0.0
 * Developed by pheonix14
 * 3-Color Pokémon Theme Common Shared Engine
 */

window.PROJECT_INFO = {
    name: "PROJECT DARK",
    version: "v3.0.0",
    developer: "pheonix14"
};

let socket = null;
let localConfig = {};
let notificationsEnabled = false;
let structuredCatches = [];

// Dynamic Audio Synthesizer Hook
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'toggle-on') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'toggle-off') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.15);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            osc.frequency.setValueAtTime(783.99, now + 0.16);
            osc.frequency.setValueAtTime(1046.50, now + 0.24);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'fail') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'toast') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    } catch (e) {
        console.error("Audio synthesis error:", e);
    }
}

/* ─── NEW UI NOTIFICATION TOAST ─── */
function showToast(title, body) {
    playSound('toast');
    const ntTitle = document.getElementById('nt-title');
    const ntBody = document.getElementById('nt-body');
    const t = document.getElementById('notif-toast');
    
    if (ntTitle) ntTitle.textContent = title;
    if (ntBody) ntBody.textContent = body;
    if (t) {
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 4500);
    }
}

function closeToast() { 
    const t = document.getElementById('notif-toast');
    if (t) t.classList.remove('show');
}

function connectWebSocket() {
    const badge = document.getElementById('net-badge');
    const badgetxt = document.getElementById('badge-txt');
    
    socket = new WebSocket('ws://' + window.location.hostname + ':8086');

    socket.onopen = () => {
        if (badge && badgetxt) {
            badge.className = 'status-badge connected';
            badgetxt.textContent = 'System Active';
        }
        showToast('SYSTEM', 'WebSocket Connected');
    };

    socket.onclose = () => {
        if (badge && badgetxt) {
            badge.className = 'status-badge';
            badgetxt.textContent = 'System Offline';
        }
        setTimeout(connectWebSocket, 4000);
    };

    socket.onmessage = (event) => {
        const frame = JSON.parse(event.data);
        const msg = frame;
        if (frame.type === 'config') {
            localConfig = frame.data;
            renderConfigToInputs();
        } else if (frame.type === 'log') {
            appendSystemLog(frame.data);
        } else if (msg.type === 'structured_logs') {
            structuredCatches = msg.data || [];
            localStorage.setItem('structuredCatches', JSON.stringify(structuredCatches));
            if (document.getElementById('catchesGallery')) {
                renderCatchesGallery();
            }
            updateAcquisitionsMetrics();
        } else if (msg.type === 'history_cleared') {
            structuredCatches = [];
            localStorage.setItem('structuredCatches', JSON.stringify(structuredCatches));
            if (document.getElementById('catchesGallery')) {
                renderCatchesGallery();
            }
            updateAcquisitionsMetrics();
            showToast('History Cleared', 'The catch history database has been wiped.');
        } else if (msg.type === 'structured_log') {
            handleNewCaptureLog(frame.data);
        } else if (frame.type === 'engine_state') {
            handleEngineState(frame.data, frame.image_url);
        }
    };
}

function handleEngineState(state, imageUrl) {
    const imgEl = document.getElementById('hero-detected-img');

    if (!imgEl) return;

    if (state === 'detected') {
        // Hide the raw image so we only show the clean pokemon later
        imgEl.style.display = 'none';
    } else if (state === 'identified') {
        let name = imageUrl; // payload is the pokemon name
        if (name) {
            let formattedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Handle forms for pokemon showdown
            if (formattedName.includes('alolan')) formattedName = formattedName.replace('alolan', '') + 'alola';
            if (formattedName.includes('galarian')) formattedName = formattedName.replace('galarian', '') + 'galar';
            if (formattedName.includes('hisuian')) formattedName = formattedName.replace('hisuian', '') + 'hisui';
            if (formattedName.includes('paldean')) formattedName = formattedName.replace('paldean', '') + 'paldea';

            imgEl.src = `https://play.pokemonshowdown.com/sprites/ani/${formattedName}.gif`;
            imgEl.style.display = 'block';
            imgEl.style.filter = 'drop-shadow(0 0 30px var(--c2))';
            
            imgEl.onerror = () => {
                imgEl.src = `https://play.pokemonshowdown.com/sprites/gen5/${formattedName}.png`;
            };
        }
    } else if (state === 'catch_sent') {
        imgEl.style.filter = 'drop-shadow(0 0 30px var(--c1))';
    } else if (state === 'caught') {
        imgEl.style.filter = 'drop-shadow(0 0 40px #00ff00)';
    } else if (state === 'reset') {
        imgEl.style.display = 'none';
        imgEl.style.filter = 'none';
    }
}

function renderConfigToInputs() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('token', localConfig.token);
    setVal('huggingface_token', localConfig.huggingface_token);
    setVal('huggingface_model', localConfig.huggingface_model);
    setVal('prefix', localConfig.prefix || '.');
    setVal('pokemon_channel', localConfig.pokemon_channel);
    setVal('spam_channel_id', localConfig.spam_channel_id);
    setVal('spam_delay', localConfig.spam_delay || '45.0');
    
    let listenerRaw = localConfig.listener_id || 'self';
    let listenerIds = listenerRaw.split(',').map(s => s.trim()).filter(s => s);
    selfListenEnabled = listenerIds.includes('self');
    const restrictSwitch = document.getElementById('restrictSwitch');
    if (restrictSwitch) restrictSwitch.className = 'toggle-switch' + (selfListenEnabled ? ' active' : '');
    
    let otherIds = listenerIds.filter(s => s !== 'self');
    setVal('listener_id', otherIds.join(', '));
    loadUserProfiles();
    
    notificationsEnabled = localConfig.notifications_enabled === 'true';
    const notifySwitch = document.getElementById('notifySwitch');
    if (notifySwitch) notifySwitch.className = 'toggle-switch' + (notificationsEnabled ? ' active' : '');

    const spamActive = localConfig.spam_enabled === 'true';
    const spamSwitch = document.getElementById('spamSwitch');
    if (spamSwitch) spamSwitch.className = 'toggle-switch' + (spamActive ? ' active' : '');

    const hfModelStat = document.getElementById('stat-hf-model');
    if (hfModelStat) {
        hfModelStat.textContent = 'Model: ' + (localConfig.huggingface_model ? localConfig.huggingface_model.split('/').pop() : 'imjeffharris');
    }
}

function appendSystemLog(log) {
    const feed = document.getElementById('log-feed');
    if (feed) {
        const row = document.createElement('div');
        row.className = 'feed-row';
        row.innerHTML = `<span class="feed-time" style="color:var(--c1)">[${log.time}]</span> <span class="feed-msg" style="color:rgba(255,255,255,0.7)">${log.msg}</span>`;
        feed.appendChild(row);
        feed.scrollTop = feed.scrollHeight;
    }

    // New Stepper Logic matching exact ui
    const fBar = document.getElementById('flow-bar');
    const fDetails = document.getElementById('flow-details');
    const n1 = document.getElementById('flow-node-1');
    const n2 = document.getElementById('flow-node-2');
    const n3 = document.getElementById('flow-node-3');

    if (fBar && fDetails && n1 && n2 && n3) {
        if (log.msg.includes("Spawn detected")) {
            n1.className = 'flow-node-wrapper active-detect';
            n2.className = 'flow-node-wrapper';
            n3.className = 'flow-node-wrapper';
            fBar.style.width = '33%';
            fDetails.textContent = 'Analyzing Spawn Image...';
        } else if (log.msg.includes("Identified:")) {
            let name = log.msg.split("Identified:")[1].split("(")[0].trim();
            let rarity = log.msg.split("(")[1].split(")")[0].trim();
            n1.className = 'flow-node-wrapper active-detect';
            n2.className = 'flow-node-wrapper active-sent';
            n3.className = 'flow-node-wrapper';
            fBar.style.width = '66%';
            fDetails.textContent = `${name.toUpperCase()} (${rarity.toUpperCase()}) — DISPATCHING IN 3s`;
        } else if (log.msg.includes("CATCH sent")) {
            fDetails.textContent = 'Command Transmitted. Awaiting Capture confirmation...';
        } else if (log.msg.includes("Hint received:")) {
            n1.className = 'flow-node-wrapper active-detect';
            n2.className = 'flow-node-wrapper';
            n3.className = 'flow-node-wrapper';
            fBar.style.width = '33%';
            fDetails.textContent = 'Processing Pokétwo Hint...';
        } else if (log.msg.includes("Solved hint as:")) {
            let name = log.msg.split("Solved hint as:")[1].split(".")[0].trim();
            n1.className = 'flow-node-wrapper active-detect';
            n2.className = 'flow-node-wrapper active-sent';
            n3.className = 'flow-node-wrapper';
            fBar.style.width = '66%';
            fDetails.textContent = `${name.toUpperCase()} (HINT) — DISPATCHING CATCH`;
        }
    }
}

function handleNewCaptureLog(log) {
    const exists = structuredCatches.some(s => s.time === log.time && s.name === log.name);
    if (!exists) {
        structuredCatches.push(log);
        if (structuredCatches.length > 200) structuredCatches.shift();
        localStorage.setItem('structuredCatches', JSON.stringify(structuredCatches));
        renderCatchesGallery();
        updateAcquisitionsMetrics();
    }

    const fBar = document.getElementById('flow-bar');
    const fDetails = document.getElementById('flow-details');
    const n1 = document.getElementById('flow-node-1');
    const n2 = document.getElementById('flow-node-2');
    const n3 = document.getElementById('flow-node-3');

    if (fBar && fDetails && n1 && n2 && n3) {
        n1.className = 'flow-node-wrapper active-detect';
        n2.className = 'flow-node-wrapper active-sent';
        n3.className = 'flow-node-wrapper active-caught';
        fBar.style.width = '100%';
        fDetails.textContent = `${log.name.toUpperCase()} (${log.rarity.toUpperCase()}) — ${log.status === 'success' ? 'SUCCESSFULLY SECURED' : 'ACQUISITION FAILED'}`;
    }

    playSound(log.status === 'success' ? 'success' : 'fail');
    showToast(log.status === 'success' ? 'SECURED' : 'FAILED', `${log.name} (${log.rarity})`);

    if (notificationsEnabled && log.status === 'success') {
        const r = log.rarity.toLowerCase();
        if (r === 'rare' || r === 'legendary' || r === 'shiny') {
            new Notification('PROJECT DARK', {
                body: `Successfully caught ${log.name} (${log.rarity})`,
                icon: log.image_url || '/logo.png'
            });
        }
    }

    if (fBar && fDetails && n1 && n2 && n3) {
        setTimeout(() => {
            n1.className = 'flow-node-wrapper';
            n2.className = 'flow-node-wrapper';
            n3.className = 'flow-node-wrapper';
            fBar.style.width = '0%';
            fDetails.textContent = 'Awaiting Discord Gate Events...';
            if (window.handleEngineState) handleEngineState('reset');
        }, 8000);
    }
}

function renderCatchesGallery() {
    const container = document.getElementById('catchesGallery');
    if (!container) return;

    const searchInput = document.getElementById('searchPokemon');
    const filterSelect = document.getElementById('filterPokemon');
    
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const filter = filterSelect ? filterSelect.value : 'all';
    
    container.innerHTML = '';

    let list = [...structuredCatches].reverse();
    if (filter === 'success') {
        list = list.filter(c => c.status === 'success');
    } else if (filter === 'failed') {
        list = list.filter(c => c.status === 'failed');
    }

    if (search) {
        list = list.filter(c => c.name.toLowerCase().includes(search));
    }

    list.forEach(c => {
        const card = document.createElement('div');
        card.className = 'history-card';
        let rarityColor = c.rarity.toLowerCase() === 'common' ? 'rgba(255,255,255,0.4)' : 'var(--c1)';
        
        let cleanName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let pokeImg = c.name ? `https://img.pokemondb.net/sprites/home/normal/${cleanName}.png` : c.image_url;

        card.innerHTML = `
            <div class="date-badge">${c.time.split(' ')[0]}</div>
            <div class="rarity-badge" style="color: ${rarityColor}; border: 1px solid ${rarityColor};">${c.rarity || 'COM'}</div>
            <div class="card-img-wrap"><img src="${pokeImg}" alt="${c.name}" onerror="this.src='${c.image_url || '/logo.png'}'"></div>
            <h3>${c.name}</h3>
            <p>Level ${c.details || '?'}</p>
        `;
        container.appendChild(card);
    });

    if (list.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; color:rgba(255,255,255,0.4); font-style:italic; padding:2rem; text-align:center;">No records found in Pokédex database</div>`;
    }
    
    // rebind cursor listeners for newly added cards
    bindCursorListeners();
}

function updateAcquisitionsMetrics() {
    const sEl = document.getElementById('metric-success');
    const fEl = document.getElementById('metric-failed');
    const rEl = document.getElementById('metric-ratio');
    if (!sEl && !fEl && !rEl) return;

    const successes = structuredCatches.filter(c => c.status === 'success').length;
    const fails = structuredCatches.filter(c => c.status === 'failed').length;
    const total = successes + fails;
    const ratio = total > 0 ? Math.round((successes / total) * 100) : 0;

    if (sEl) sEl.textContent = successes;
    if (fEl) fEl.textContent = fails;
    if (rEl) rEl.textContent = ratio + '%';
}

function testAddStructuredLog() {
    const ws = socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Just for local testing if needed
    }
}

function clearHistory() {
    if (confirm("Are you sure you want to clear the entire catch history?")) {
        const ws = socket;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'clear_history' }));
        }
    }
}

function pushConfig() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'update_config', data: localConfig }));
    }
}

function saveCredentialsSettings() {
    playSound('click');
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : null;
    };

    const token = getVal('token');
    const hfToken = getVal('huggingface_token');
    const hfModel = getVal('huggingface_model');
    const prefix = getVal('prefix');
    const pokeChannel = getVal('pokemon_channel');

    if (token !== null) localConfig.token = token;
    if (hfToken !== null) localConfig.huggingface_token = hfToken;
    if (hfModel !== null) localConfig.huggingface_model = hfModel;
    if (prefix !== null) localConfig.prefix = prefix || '.';
    if (pokeChannel !== null) localConfig.pokemon_channel = pokeChannel;

    const spamChannel = getVal('spam_channel_id');
    const spamDelay = getVal('spam_delay');
    if (spamChannel !== null) localConfig.spam_channel_id = spamChannel;
    if (spamDelay !== null) localConfig.spam_delay = spamDelay;

    pushConfig();
    showToast('CREDENTIALS', 'Settings synchronized successfully.');
}

function toggleNotifications() {
    if (Notification.permission === 'granted') {
        notificationsEnabled = !notificationsEnabled;
        updateNotifyToggle();
    } else {
        requestNotif().then(() => {
            updateNotifyToggle();
        });
    }
}

function updateNotifyToggle() {
    localConfig.notifications_enabled = notificationsEnabled ? 'true' : 'false';
    const switchEl = document.getElementById('notifySwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (notificationsEnabled ? ' active' : '');
    playSound(notificationsEnabled ? 'toggle-on' : 'toggle-off');
    pushConfig();
}

let selfListenEnabled = false;

function toggleRestrictSelf() {
    selfListenEnabled = !selfListenEnabled;
    const switchEl = document.getElementById('restrictSwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (selfListenEnabled ? ' active' : '');
    playSound(selfListenEnabled ? 'toggle-on' : 'toggle-off');
    
    const input = document.getElementById('listener_id');
    let ids = input ? input.value.trim().split(',').map(s => s.trim()).filter(s => s && s !== 'self') : [];
    
    let configIds = [...ids];
    if (selfListenEnabled) configIds.unshift('self');
    
    localConfig.listener_id = configIds.join(',');
    pushConfig();
}

async function loadUserProfiles() {
    const input = document.getElementById('listener_id');
    const container = document.getElementById('user-profiles-container');
    if (!input || !container) return;
    
    let rawStr = input.value.trim();
    let ids = rawStr.split(',').map(s => s.trim()).filter(s => s && s !== 'self');
    
    if (ids.length > 3) {
        showToast('SYSTEM', 'Maximum 3 users allowed.');
        ids = ids.slice(0, 3);
        input.value = ids.join(', ');
    }
    
    let configIds = [...ids];
    if (selfListenEnabled) configIds.unshift('self');
    
    localConfig.listener_id = configIds.join(',');
    pushConfig();
    
    if (ids.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '<div style="font-size:12px; color:var(--c1);">Loading...</div>';
    
    let html = '';
    for (let uid of ids) {
        try {
            const r = await fetch(`/api/discord/user?id=${uid}`);
            if (r.ok) {
                const data = await r.json();
                if (data.id) {
                    const avatarUrl = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : '/logo.png';
                    html += `<div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.1); padding:5px 10px; border-radius:4px;"><img src="${avatarUrl}" style="width:24px; height:24px; border-radius:50%;"> <span style="font-size:12px;">${data.username}</span></div>`;
                } else {
                    html += `<div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.1); padding:5px 10px; border-radius:4px;"><span style="font-size:12px; color:#ff3333;">Invalid ID: ${uid}</span></div>`;
                }
            }
        } catch (e) {
            html += `<div style="font-size:12px;">Error: ${uid}</div>`;
        }
    }
    container.innerHTML = html;
}

let loadedGuilds = [];
let checkedGuilds = [];
let checkedChannels = [];

async function loadDiscordServers() {
    const container = document.getElementById('discord-servers-container');
    if (!container) return;
    
    container.style.display = 'flex';
    container.innerHTML = '<div style="font-size:12px; color:var(--c1);">Fetching servers from Discord...</div>';
    
    try {
        const r = await fetch('/api/discord/guilds');
        if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data)) {
                loadedGuilds = data;
                renderServersUI();
            } else {
                container.innerHTML = '<div style="font-size:12px; color:#ff3333;">Failed to load servers. Check Token.</div>';
            }
        }
    } catch (e) {
        container.innerHTML = '<div style="font-size:12px; color:#ff3333;">Error fetching servers.</div>';
    }
}

function renderServersUI() {
    const container = document.getElementById('discord-servers-container');
    if (!container) return;
    
    // Parse existing selections from config
    const currentList = (localConfig.pokemon_channel || '').split(',').map(s => s.trim()).filter(s => s);
    checkedGuilds = [];
    checkedChannels = [];
    currentList.forEach(id => {
        if (loadedGuilds.find(g => g.id === id)) {
            checkedGuilds.push(id);
        } else {
            checkedChannels.push(id);
        }
    });

    let html = '';
    loadedGuilds.forEach(g => {
        const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : '/logo.png';
        const isChecked = checkedGuilds.includes(g.id) ? 'checked' : '';
        
        html += `
            <div style="background:rgba(0,0,0,0.5); padding:10px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${iconUrl}" style="width:24px; height:24px; border-radius:50%;">
                        <span style="font-size:14px;">${g.name}</span>
                    </div>
                    <div>
                        <input type="checkbox" id="guild_${g.id}" ${isChecked} onchange="toggleGuild('${g.id}')">
                        <label for="guild_${g.id}" style="font-size:12px; cursor:pointer;">Whole Server</label>
                        <button class="btn" style="padding:2px 8px; font-size:10px; margin-left:10px;" onclick="loadGuildChannels('${g.id}')">Channels ↴</button>
                    </div>
                </div>
                <div id="channels_${g.id}" style="margin-top:10px; margin-left:34px; display:none; flex-direction:column; gap:5px;"></div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function loadGuildChannels(guildId) {
    const cContainer = document.getElementById(`channels_${guildId}`);
    if (!cContainer) return;
    
    if (cContainer.style.display === 'flex') {
        cContainer.style.display = 'none';
        return;
    }
    
    cContainer.style.display = 'flex';
    if (cContainer.innerHTML !== '') return; // Already loaded
    
    cContainer.innerHTML = '<span style="font-size:12px; color:var(--c1);">Loading...</span>';
    
    try {
        const r = await fetch(`/api/discord/channels?guild_id=${guildId}`);
        if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data)) {
                let html = '';
                data.filter(c => c.type === 0).forEach(c => { // Only text channels
                    const isChecked = checkedChannels.includes(c.id) ? 'checked' : '';
                    html += `
                        <div style="display:flex; align-items:center; gap:5px;">
                            <input type="checkbox" id="chan_${c.id}" ${isChecked} onchange="toggleChannel('${c.id}')">
                            <label for="chan_${c.id}" style="font-size:12px; cursor:pointer;">#${c.name}</label>
                        </div>
                    `;
                });
                cContainer.innerHTML = html;
            }
        }
    } catch (e) {
        cContainer.innerHTML = '<span style="font-size:12px; color:#ff3333;">Failed</span>';
    }
}

function toggleGuild(guildId) {
    const cb = document.getElementById(`guild_${guildId}`);
    if (cb.checked) {
        if (checkedGuilds.length >= 5) {
            showToast('LIMIT', 'Maximum 5 servers allowed.');
            cb.checked = false;
            return;
        }
        checkedGuilds.push(guildId);
    } else {
        checkedGuilds = checkedGuilds.filter(id => id !== guildId);
    }
    saveChannelsToConfig();
}

function toggleChannel(channelId) {
    const cb = document.getElementById(`chan_${channelId}`);
    if (cb.checked) {
        if (checkedChannels.length >= 10) {
            showToast('LIMIT', 'Maximum 10 channels allowed.');
            cb.checked = false;
            return;
        }
        checkedChannels.push(channelId);
    } else {
        checkedChannels = checkedChannels.filter(id => id !== channelId);
    }
    saveChannelsToConfig();
}

function saveChannelsToConfig() {
    const combined = [...checkedGuilds, ...checkedChannels].join(',');
    localConfig.pokemon_channel = combined;
    document.getElementById('pokemon_channel').value = combined;
    pushConfig();
}

function toggleSpammer() {
    const isSpammer = localConfig.spam_enabled === 'true';
    localConfig.spam_enabled = isSpammer ? 'false' : 'true';
    const switchEl = document.getElementById('spamSwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (localConfig.spam_enabled === 'true' ? ' active' : '');
    playSound(localConfig.spam_enabled === 'true' ? 'toggle-on' : 'toggle-off');
    pushConfig();
}

/* ══ UI LOGIC PORTED FROM ref.html ══ */

const BG_IMAGES = [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600',
    'https://images.unsplash.com/photo-1579547944212-c4f4961a8dd8?w=1600',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600',
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600'
];

const WM_FONTS = [
    "'Bebas Neue',sans-serif",
    "'Orbitron',sans-serif",
    "'Playfair Display',serif"
];
const WM_SIZES = ['12vw', '14vw', '18vw', '22vw', '10vw'];

// Pokemon Theme Colors: C1 (Crimson), C2 (Yellow)
const COLORS = [
    ['#CC0000', '#FFCC00'],
    ['#ff2d55', '#0affe4'],
    ['#ff6b35', '#c7ff3a']
];

const SEED = Math.floor(Math.random() * BG_IMAGES.length);
let bgIdx = SEED;
let colorIdx = Math.floor(Math.random() * COLORS.length);

function applyColors(i) {
    const colorBleed = document.getElementById('colorBleed');
    if(!colorBleed) return;
    const [c1, c2] = COLORS[i % COLORS.length];
    document.documentElement.style.setProperty('--c1', c1);
    document.documentElement.style.setProperty('--c2', c2);
    colorBleed.style.background = `radial-gradient(ellipse at 30% 70%, ${c1}44, transparent 60%), radial-gradient(ellipse at 70% 30%, ${c2}33, transparent 60%)`;
}

function setWatermark() {
    const wm = document.getElementById('wm');
    if(!wm) return;
    const fi = Math.floor(Math.random() * WM_FONTS.length);
    const si = Math.floor(Math.random() * WM_SIZES.length);
    wm.style.fontFamily = WM_FONTS[fi];
    wm.style.fontSize = WM_SIZES[si];
}

function loadBg(idx) {
    const bgImg = document.getElementById('bg-img');
    if(!bgImg) return;
    const url = BG_IMAGES[idx % BG_IMAGES.length];
    const tmp = new Image();
    tmp.onload = () => {
        bgImg.classList.remove('fade-in');
        bgImg.classList.add('fade-out');
        setTimeout(() => {
            bgImg.src = url;
            bgImg.classList.remove('fade-out');
            bgImg.classList.add('fade-in');
        }, 600);
    };
    tmp.src = url;
}

// Global initialization
window.addEventListener('load', () => {
    
    // Wait for DOM to be fully populated by other scripts (like navigationbar.js)
    setTimeout(() => {
        // UI Init
        setWatermark();
        applyColors(0); // force pokemon colors first
        loadBg(bgIdx);
        
        setInterval(() => {
            bgIdx++; colorIdx++;
            applyColors(colorIdx);
            loadBg(bgIdx);
        }, 12000);
        setInterval(setWatermark, 8000);
        
        // Remove Loader
        const loader = document.getElementById('loader');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('done');
            }, 1800);
        }

        // Custom Cursor
        const cur = document.getElementById('cursor');
        const ring = document.getElementById('cursor-ring');
        if (cur && ring) {
            let mx = 0, my = 0, rx = 0, ry = 0;
            document.addEventListener('mousemove', e => {
                mx = e.clientX; my = e.clientY;
                cur.style.left = mx - 6 + 'px'; cur.style.top = my - 6 + 'px';
            });
            function animRing() {
                rx += (mx - rx) * .12; ry += (my - ry) * .12;
                ring.style.left = rx - 18 + 'px'; ring.style.top = ry - 18 + 'px';
                requestAnimationFrame(animRing);
            }
            animRing();
            bindCursorListeners();
        }

        // Scroll Logic for Nav & Dots
        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            if(nav) nav.classList.toggle('scrolled', window.scrollY > 60);
            
            const pctEl = document.getElementById('scrollPct');
            if(pctEl) {
                const h = document.body.scrollHeight - window.innerHeight;
                const pct = Math.round(window.scrollY / Math.max(1, h) * 100);
                pctEl.textContent = String(pct).padStart(2, '0');
            }

            const dots = document.querySelectorAll('.slide-dot');
            if(dots.length > 0) {
                const sections = ['hero', 'work', 'services', 'contact'];
                sections.forEach((id, i) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    if(dots[i]) dots[i].classList.toggle('active', r.top <= window.innerHeight / 2 && r.bottom > window.innerHeight / 2);
                });
            }
        });

        // Marquee
        const mq = document.getElementById('mq');
        if (mq) {
            const MQ_ITEMS = ['PROJECT DARK', 'v3.0.0', 'PHEONIX14', 'AUTOCATCHER', '◈', 'SYSTEM SECURE', 'LIFETIME', '◈'];
            const fill = [...MQ_ITEMS, ...MQ_ITEMS, ...MQ_ITEMS, ...MQ_ITEMS];
            fill.forEach(txt => {
                const d = document.createElement('div');
                d.className = 'marquee-item';
                d.innerHTML = `<span class="dot"></span>${txt}`;
                mq.appendChild(d);
            });
        }

        // Frame by Frame Animation
        const frames = document.querySelectorAll('.fbf-frame');
        const fbfCtr = document.getElementById('fbfCounter');
        if(frames.length > 0 && fbfCtr) {
            let fi = 0;
            const FBF_FPS = 8;
            setInterval(() => {
                frames[fi].classList.remove('visible');
                fi = (fi + 1) % frames.length;
                frames[fi].classList.add('visible');
                fbfCtr.textContent = String(fi + 1).padStart(2, '0') + ' / ' + String(frames.length).padStart(2, '0');
            }, 1000 / FBF_FPS);
        }

        // Scroll Intersection Observer
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.animation = 'fadeSlideUp .7s ease both';
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: .15 });
        document.querySelectorAll('.card,.section-h2,.section-label').forEach(el => obs.observe(el));

    }, 200); // slight delay to allow document structure to build

    try {
        const saved = localStorage.getItem('structuredCatches');
        if (saved) {
            structuredCatches = JSON.parse(saved);
            renderCatchesGallery();
            updateAcquisitionsMetrics();
        }
    } catch (e) {}

    connectWebSocket();

    // Attach dynamic form listeners if present
    document.querySelectorAll('input[type="text"], input[type="password"], select').forEach(input => {
        input.addEventListener('change', () => {
            const id = input.id;
            if (id && !id.startsWith('react') && id !== 'searchPokemon') {
                localConfig[id] = input.value;
                pushConfig();
            }
        });
    });

    const searchInput = document.getElementById('searchPokemon');
    if (searchInput) searchInput.addEventListener('input', renderCatchesGallery);
    const filterSelect = document.getElementById('filterPokemon');
    if (filterSelect) filterSelect.addEventListener('change', renderCatchesGallery);
});

function bindCursorListeners() {
    const cur = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    if (!cur || !ring) return;
    document.querySelectorAll('a,button,.card,input,select,.ham').forEach(el => {
        el.removeEventListener('mouseenter', _cursorEnter);
        el.removeEventListener('mouseleave', _cursorLeave);
        el.addEventListener('mouseenter', _cursorEnter);
        el.addEventListener('mouseleave', _cursorLeave);
    });
}
function _cursorEnter() {
    const cur = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    if(cur) cur.style.transform = 'scale(3)'; 
    if(ring) ring.style.borderColor = 'var(--c1)';
}
function _cursorLeave() {
    const cur = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    if(cur) cur.style.transform = 'scale(1)'; 
    if(ring) ring.style.borderColor = 'rgba(255,255,255,0.5)';
}

async function requestNotif() {
    if (!('Notification' in window)) {
        showToast('SYSTEM', 'Notifications not supported in this browser.');
        return;
    }
    if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        showToast('SYSTEM', 'Notifications already enabled.');
        return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
        notificationsEnabled = true;
        showToast('SYSTEM', 'Notifications enabled.');
    } else {
        showToast('SYSTEM', 'Please enable notifications in settings.');
    }
}

// Make toggleMenu global since it is used in HTML onclick
window.toggleMenu = function() {
    const ham = document.getElementById('ham');
    const menuOverlay = document.getElementById('menu-overlay');
    if (!ham || !menuOverlay) return;
    
    const isOpen = ham.classList.contains('open');
    ham.classList.toggle('open', !isOpen);
    menuOverlay.classList.toggle('open', !isOpen);
    document.body.style.overflow = !isOpen ? 'hidden' : '';
}
window.closeMenu = function() {
    const ham = document.getElementById('ham');
    if(ham && ham.classList.contains('open')) {
        window.toggleMenu();
    }
}
