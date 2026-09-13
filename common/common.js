/**
 * PROJECT DARK v4.0.0
 * Developed by rayzien
 * 3-Color Pokémon Theme Common Shared Engine
 */

window.PROJECT_INFO = {
    name: "PROJECT DARK",
    version: "v4.0.0",
    developer: "rayzien"
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
            if (document.getElementById('profiles-container')) {
                renderDynamicProfiles();
            }
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
        } else if (frame.type === 'balance_update') {
            const pEl = document.getElementById('metric-pokecoins');
            if (pEl) {
                pEl.textContent = parseInt(frame.data || 0).toLocaleString();
            }
        }
    };
}

function handleEngineState(state, imageUrl) {
    const imgEl = document.getElementById('hero-detected-img');
    const nameEl = document.getElementById('hero-detected-name');

    if (!imgEl) return;

    if (state === 'detected') {
        if (imageUrl) {
            imgEl.src = imageUrl;
            imgEl.style.display = 'block';
            imgEl.style.filter = 'drop-shadow(0 0 20px rgba(0,243,255,0.4))';
        }
        if (nameEl) {
            nameEl.textContent = 'DETECTING WILD POKÉMON...';
            nameEl.style.display = 'block';
        }
    } else if (state === 'identified') {
        let name = imageUrl; // payload is the pokemon name
        if (name) {
            if (nameEl) {
                nameEl.textContent = name.toUpperCase();
                nameEl.style.display = 'block';
            }
            let formattedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Handle forms for pokemon showdown
            if (formattedName.includes('alolan')) formattedName = formattedName.replace('alolan', '') + 'alola';
            if (formattedName.includes('galarian')) formattedName = formattedName.replace('galarian', '') + 'galar';
            if (formattedName.includes('hisuian')) formattedName = formattedName.replace('hisuian', '') + 'hisui';
            if (formattedName.includes('paldean')) formattedName = formattedName.replace('paldean', '') + 'paldea';

            const animatedSrc = `https://play.pokemonshowdown.com/sprites/ani/${formattedName}.gif`;
            const staticSrc = `https://play.pokemonshowdown.com/sprites/gen5/${formattedName}.png`;
            
            imgEl.src = animatedSrc;
            imgEl.style.display = 'block';
            imgEl.style.filter = 'drop-shadow(0 0 30px var(--c2))';
            
            imgEl.onerror = () => {
                if (imgEl.src !== staticSrc) {
                    imgEl.src = staticSrc;
                }
            };
        }
    } else if (state === 'catch_sent') {
        imgEl.style.filter = 'drop-shadow(0 0 30px var(--c1))';
    } else if (state === 'caught') {
        imgEl.style.filter = 'drop-shadow(0 0 40px #00ff00)';
        if (notificationsEnabled && Notification.permission === 'granted') {
            try {
                new Notification('PROJECT DARK', {
                    body: `Catch attempt complete!`,
                    icon: imgEl.src || '/logo.png'
                });
            } catch(e) { console.error(e); }
        }
    } else if (state === 'reset') {
        imgEl.style.display = 'none';
        imgEl.style.filter = 'none';
        if (nameEl) nameEl.style.display = 'none';
        localStorage.removeItem('hero_pokemon_state');
        return;
    }

    try {
        localStorage.setItem('hero_pokemon_state', JSON.stringify({
            state: state,
            imageUrl: imageUrl,
            src: imgEl.src,
            name: nameEl ? nameEl.textContent : '',
            filter: imgEl.style.filter
        }));
    } catch(e) {}
}

function restoreHeroPokemonPreview() {
    try {
        const stored = localStorage.getItem('hero_pokemon_state');
        if (!stored) return;
        const data = JSON.parse(stored);
        const imgEl = document.getElementById('hero-detected-img');
        const nameEl = document.getElementById('hero-detected-name');
        if (imgEl && data.src) {
            imgEl.src = data.src;
            imgEl.style.display = 'block';
            if (data.filter) imgEl.style.filter = data.filter;
        }
        if (nameEl && data.name) {
            nameEl.textContent = data.name;
            nameEl.style.display = 'block';
        }
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', restoreHeroPokemonPreview);


function renderConfigToInputs() {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return; // Prevent focus reset and typing glitches
    }

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('huggingface_token', localConfig.huggingface_token);
    setVal('huggingface_model', localConfig.huggingface_model);
    setVal('prefix', localConfig.prefix || '.');
    setVal('spam_channel_id', localConfig.spam_channel_id);
    setVal('spam_custom_message', localConfig.spam_custom_message);
    setVal('spam_count', localConfig.spam_count || '0');
    setVal('spam_delay', localConfig.spam_delay || '45.0');

    const pEl = document.getElementById('metric-pokecoins');
    if (pEl && localConfig.pokecoins_balance !== undefined) {
        pEl.textContent = parseInt(localConfig.pokecoins_balance || 0).toLocaleString();
    }
    
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

    const spamInfActive = localConfig.spam_infinity === 'true';
    const spamInfSwitch = document.getElementById('spamInfinitySwitch');
    if (spamInfSwitch) spamInfSwitch.className = 'toggle-switch' + (spamInfActive ? ' active' : '');

    const catchActive = localConfig.catch_enabled !== 'false';
    const catchSwitch = document.getElementById('catchSwitch');
    if (catchSwitch) catchSwitch.className = 'toggle-switch' + (catchActive ? ' active' : '');

    const imgCatchActive = localConfig.image_catch_enabled !== 'false';
    const imgCatchSwitch = document.getElementById('imageCatchSwitch');
    if (imgCatchSwitch) imgCatchSwitch.className = 'toggle-switch' + (imgCatchActive ? ' active' : '');

    const hfModelStat = document.getElementById('stat-hf-model');
    if (hfModelStat) {
        hfModelStat.textContent = 'Model: ' + (localConfig.huggingface_model ? localConfig.huggingface_model.split('/').pop() : 'imjeffharris');
    }
}

function toggleSpammer() {
    const isSpam = localConfig.spam_enabled === 'true';
    localConfig.spam_enabled = isSpam ? 'false' : 'true';
    const switchEl = document.getElementById('spamSwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (localConfig.spam_enabled === 'true' ? ' active' : '');
    playSound(localConfig.spam_enabled === 'true' ? 'toggle-on' : 'toggle-off');
    pushConfig();
}

function toggleSpamInfinity() {
    const isInf = localConfig.spam_infinity === 'true';
    localConfig.spam_infinity = isInf ? 'false' : 'true';
    const switchEl = document.getElementById('spamInfinitySwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (localConfig.spam_infinity === 'true' ? ' active' : '');
    playSound(localConfig.spam_infinity === 'true' ? 'toggle-on' : 'toggle-off');
    pushConfig();
}

function toggleCatcher() {
    const isCatch = localConfig.catch_enabled !== 'false';
    localConfig.catch_enabled = isCatch ? 'false' : 'true';
    const switchEl = document.getElementById('catchSwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (localConfig.catch_enabled === 'true' ? ' active' : '');
    playSound(localConfig.catch_enabled === 'true' ? 'toggle-on' : 'toggle-off');
    pushConfig();
}

function toggleImageCatcher() {
    const isImgCatch = localConfig.image_catch_enabled !== 'false';
    localConfig.image_catch_enabled = isImgCatch ? 'false' : 'true';
    const switchEl = document.getElementById('imageCatchSwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (localConfig.image_catch_enabled === 'true' ? ' active' : '');
    playSound(localConfig.image_catch_enabled === 'true' ? 'toggle-on' : 'toggle-off');
    pushConfig();
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
    const rareEl = document.getElementById('metric-rare');
    const heroRareCount = document.getElementById('hero-rare-count');
    const heroRareContainer = document.getElementById('hero-rare-caught-container');

    const successes = structuredCatches.filter(c => c.status === 'success').length;
    const fails = structuredCatches.filter(c => c.status === 'failed').length;
    const total = successes + fails;
    const ratio = total > 0 ? Math.round((successes / total) * 100) : 0;

    const rareCount = structuredCatches.filter(c => c.status === 'success' && c.rarity && (
        c.rarity.toLowerCase().includes('rare') || 
        c.rarity.toLowerCase().includes('shiny') || 
        c.rarity.toLowerCase().includes('legendary') ||
        c.rarity.toLowerCase().includes('mythical')
    )).length;

    if (sEl) sEl.textContent = successes;
    if (fEl) fEl.textContent = fails;
    if (rEl) rEl.textContent = ratio + '%';
    if (rareEl) rareEl.textContent = rareCount;
    if (heroRareCount) heroRareCount.textContent = rareCount;
    if (heroRareContainer && rareCount > 0) heroRareContainer.style.display = 'block';
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

async function pushConfig() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'update_config', data: localConfig }));
    }
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localConfig)
        });
    } catch (e) {
        console.error("HTTP pushConfig error:", e);
    }
}

function saveCredentialsSettings() {
    playSound('click');
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : null;
    };

    const hfToken = getVal('huggingface_token');
    const hfModel = getVal('huggingface_model');
    const prefix = getVal('prefix');

    if (hfToken !== null) localConfig.huggingface_token = hfToken;
    if (hfModel !== null) localConfig.huggingface_model = hfModel;
    if (prefix !== null) localConfig.prefix = prefix || '.';

    const spamChannel = getVal('spam_channel_id');
    const spamCustom = getVal('spam_custom_message');
    const spamCount = getVal('spam_count');
    const spamDelay = getVal('spam_delay');

    if (spamChannel !== null) localConfig.spam_channel_id = spamChannel;
    if (spamCustom !== null) localConfig.spam_custom_message = spamCustom;
    if (spamCount !== null) localConfig.spam_count = spamCount;
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
let activeTargetInput = '';
let activeTargetContainer = '';

let activeTargetToken = '';

async function loadDiscordServers(inputId, containerId, token = '') {
    activeTargetInput = inputId;
    activeTargetContainer = containerId;
    activeTargetToken = token;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.style.display = 'flex';
    container.innerHTML = '<div style="font-size:12px; color:var(--c1);">Fetching servers from Discord...</div>';
    
    try {
        let url = '/api/discord/guilds';
        if (token) url += '?token=' + encodeURIComponent(token);
        
        const r = await fetch(url);
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
    const container = document.getElementById(activeTargetContainer);
    if (!container) return;
    
    // Parse existing selections from config
    const currentVal = document.getElementById(activeTargetInput).value || localConfig[activeTargetInput] || '';
    const currentList = currentVal.split(',').map(s => s.trim()).filter(s => s);
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
            <div style="background:rgba(0,0,0,0.5); padding:12px 16px; border:1px solid rgba(255,255,255,0.08); border-radius:6px; font-family:'Space Grotesk', sans-serif;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${iconUrl}" style="width:28px; height:28px; border-radius:50%; border:1px solid rgba(255,255,255,0.2);">
                        <span style="font-size:14px; font-weight:700; color:#fff;">${g.name}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <label for="guild_${g.id}" style="font-size:12px; cursor:pointer; color:rgba(255,255,255,0.8); display:flex; align-items:center; gap:6px;">
                            <input type="checkbox" id="guild_${g.id}" ${isChecked} onchange="toggleGuild('${g.id}')"> Select Entire Server
                        </label>
                        <button type="button" class="btn btn-ghost-dark" style="padding:4px 12px; font-size:11px;" onclick="loadGuildChannels('${g.id}')">View Channels ↴</button>
                    </div>
                </div>
                <div id="channels_${g.id}" style="margin-top:10px; margin-left:36px; display:none; flex-direction:column; gap:6px;"></div>
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
        let url = `/api/discord/channels?guild_id=${guildId}`;
        if (activeTargetToken) url += '&token=' + encodeURIComponent(activeTargetToken);
        
        const r = await fetch(url);
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
    const inputEl = document.getElementById(activeTargetInput);
    if (inputEl) inputEl.value = combined;
}


/* ══ DYNAMIC PROFILES LOGIC ══ */
async function renderDynamicProfiles() {
    const container = document.getElementById('profiles-container');
    if (!container) return;

    // Prevent overwriting if user is currently editing an account form
    if (container.querySelector('[id^="edit_token_"]')) {
        return;
    }

    let html = '';
    let accountCount = 0;

    const accounts = [
        { idx: 1, token: localConfig.token, status: localConfig.token_status || 'enabled', channels: localConfig.pokemon_channel, afk: localConfig.afk_msg1 },
        { idx: 2, token: localConfig.token2, status: localConfig.token_status2 || 'enabled', channels: localConfig.pokemon_channel2, afk: localConfig.afk_msg2 }
    ];

    for (const acc of accounts) {
        if (acc.token && acc.token.trim() !== '') {
            accountCount++;
            
            // Profile Card View
            const isActive = acc.status === 'enabled';
            
            let channelsHtml = '<span style="color:rgba(255,255,255,0.3); font-style:italic;">No channels selected</span>';
            if (acc.channels && acc.channels.trim() !== '') {
                const list = acc.channels.split(',').map(s => s.trim()).filter(s => s);
                channelsHtml = list.map(c => `<span style="display:inline-block; background:rgba(204,0,0,0.15); border:1px solid rgba(204,0,0,0.4); color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-family:monospace; margin:2px;">#${c}</span>`).join(' ');
            }

            html += `
            <div class="card" id="profile-card-${acc.idx}">
                <div class="card-num">ACC_${acc.idx}</div>
                <div class="card-icon">${acc.idx === 1 ? '◈' : '◎'}</div>
                <h3 style="color:${acc.idx === 1 ? 'var(--c1)' : 'var(--c2)'}; font-family:'Bebas Neue', sans-serif;">Account ${acc.idx}</h3>
                
                <div id="prof-display-${acc.idx}" style="margin-bottom:20px; min-height:80px;">
                    <div style="font-size:12px; color:rgba(255,255,255,0.5); font-family:'Space Grotesk', sans-serif;">Loading Profile...</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding:12px 16px; background:rgba(255,255,255,0.03); border-radius:6px; border:1px solid rgba(255,255,255,0.05); font-family:'Space Grotesk', sans-serif;">
                    <div>
                        <span style="font-size:11px; color:rgba(255,255,255,0.6); display:block; margin-bottom:2px; text-transform:uppercase; letter-spacing:1px;">Engine Status</span>
                        <span style="font-size:14px; font-weight:bold; color:${isActive ? '#00ff00' : '#ff3333'};">${isActive ? 'RUNNING' : 'HOLD'}</span>
                    </div>
                    <div class="toggle-switch ${isActive ? 'active' : ''}" onclick="toggleAccountStatus(${acc.idx})">
                        <div class="toggle-thumb"></div>
                    </div>
                </div>

                <div style="margin-bottom:15px;">
                    <span style="font-size:11px; font-family:'Space Grotesk', sans-serif; color:rgba(255,255,255,0.6); display:block; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">Target Channels</span>
                    <div style="font-size:12px; background:rgba(0,0,0,0.5); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); min-height:40px; display:flex; flex-wrap:wrap; align-items:center; word-break:break-all;">
                        ${channelsHtml}
                    </div>
                </div>

                <div style="display:flex; gap:15px; margin-top:20px;">
                    <button type="button" class="btn" style="flex:1;" onclick="showEditAccountForm(${acc.idx})">Edit Account</button>
                    <button type="button" class="btn btn-danger" style="flex:1;" onclick="deleteAccount(${acc.idx})">Delete Account</button>
                </div>
            </div>`;
        }
    }

    if (accountCount < 2) {
        const nextIdx = (accounts[0].token && accounts[0].token.trim() !== '') ? 2 : 1;
        html += `
        <div class="card" style="display:flex; flex-direction:column; align-items:center; justify-content:center; border: 2px dashed rgba(255,255,255,0.2); background:transparent; cursor:pointer;" onclick="showEditAccountForm(${nextIdx}, true)">
            <div style="font-size:40px; color:rgba(255,255,255,0.5); margin-bottom:10px;">+</div>
            <h3 style="color:rgba(255,255,255,0.5); font-family:'Bebas Neue', sans-serif;">Add Account ${nextIdx}</h3>
        </div>`;
    }

    container.innerHTML = html;

    // Fetch and inject profile data
    for (const acc of accounts) {
        if (acc.token && acc.token.trim() !== '') {
            fetchAndInjectProfileData(acc.token, `prof-display-${acc.idx}`);
        }
    }
}

async function fetchAndInjectProfileData(token, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
        const r = await fetch(`/api/discord/me?token=${encodeURIComponent(token)}`);
        if (r.ok) {
            const data = await r.json();
            if (data.id) {
                const avatarUrl = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : '/logo.png';
                container.innerHTML = `
                <div style="display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.03); padding:14px 16px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                    <div style="position:relative; flex-shrink:0;">
                        <img src="${avatarUrl}" style="width:60px; height:60px; border-radius:50%; border:2px solid var(--c1); box-shadow:0 0 15px rgba(204,0,0,0.4); object-fit:cover; display:block;" onerror="this.src='/logo.png'">
                        <div style="position:absolute; bottom:2px; right:2px; width:14px; height:14px; background:#00ff00; border-radius:50%; border:2px solid #0a0a0a; box-shadow:0 0 8px #00ff00;"></div>
                    </div>
                    <div>
                        <div style="font-family:'Bebas Neue', sans-serif; font-size:22px; letter-spacing:1px; color:#fff; line-height:1.1;">${data.username}</div>
                        <div style="font-family:'Space Grotesk', sans-serif; font-size:12px; color:rgba(255,255,255,0.5); margin-top:4px;">ID: <span style="color:var(--c2); font-family:monospace;">${data.id}</span></div>
                    </div>
                </div>`;
            } else {
                container.innerHTML = '<div style="font-size:12px; color:#ff3333; font-family:\'Space Grotesk\', sans-serif;">Invalid Token</div>';
            }
        } else {
            container.innerHTML = '<div style="font-size:12px; color:#ff3333; font-family:\'Space Grotesk\', sans-serif;">Failed to load profile.</div>';
        }
    } catch (e) {
        container.innerHTML = `<div style="font-size:12px; color:#ff3333; font-family:'Space Grotesk', sans-serif;">Error: ${e}</div>`;
    }
}

function showEditAccountForm(idx, isNew = false) {
    playSound('click');
    const container = document.getElementById('profiles-container');
    const tKey = idx === 1 ? 'token' : 'token2';
    const cKey = idx === 1 ? 'pokemon_channel' : 'pokemon_channel2';
    const aKey = idx === 1 ? 'afk_msg1' : 'afk_msg2';
    
    const currentToken = isNew ? '' : (localConfig[tKey] || '');
    const currentChannels = isNew ? '' : (localConfig[cKey] || '');
    const currentAfk = isNew ? '' : (localConfig[aKey] || '');

    const html = `
    <div class="card" style="grid-column: 1/-1;">
        <div class="card-num">EDIT_${idx}</div>
        <div class="card-icon">${idx === 1 ? '◈' : '◎'}</div>
        <h3 style="color:${idx === 1 ? 'var(--c1)' : 'var(--c2)'};">${isNew ? 'Add' : 'Edit'} Account ${idx}</h3>
        
        <div class="form-group">
            <label style="display:block; font-family:'Space Grotesk'; font-size:12px; margin-bottom:5px; color:rgba(255,255,255,0.7);">Discord Token</label>
            <input type="text" id="edit_token_${idx}" value="${currentToken}" placeholder="Paste Discord token here">
        </div>

        <div class="form-group" style="margin-top:20px;">
            <label style="display:block; font-family:'Space Grotesk'; font-size:12px; margin-bottom:5px; color:rgba(255,255,255,0.7);">Target Channels</label>
            <input type="text" id="edit_channels_${idx}" value="${currentChannels}" placeholder="Selected Channel IDs (comma separated)">
            <button type="button" class="btn btn-ghost-dark" style="width:100%; margin-top:10px;" onclick="loadDiscordServersForEdit(${idx})">Fetch Servers & Channels</button>
            <div id="edit_servers_container_${idx}" style="margin-top:10px; max-height:250px; overflow-y:auto; border:1px solid rgba(255,255,255,0.1); padding:10px; border-radius:4px; display:none; flex-direction:column; gap:10px;"></div>
        </div>

        <div class="form-group" style="margin-top:20px;">
            <label style="display:block; font-family:'Space Grotesk'; font-size:12px; margin-bottom:5px; color:rgba(255,255,255,0.7);">AFK Message</label>
            <textarea id="edit_afk_${idx}" rows="3" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:12px 16px; font-family:'Space Grotesk'; font-size:14px; resize:none; outline:none; caret-color:var(--c1);" placeholder="I'm currently away.">${currentAfk}</textarea>
        </div>

        <div style="display:flex; gap:15px; margin-top:25px;">
            <button type="button" class="btn" style="flex:1;" onclick="saveAccountForm(${idx})">Save Account</button>
            <button type="button" class="btn btn-ghost-dark" style="flex:1;" onclick="renderDynamicProfiles()">Cancel</button>
        </div>
    </div>`;

    container.innerHTML = html;
}

function loadDiscordServersForEdit(idx) {
    const tokenInput = document.getElementById(`edit_token_${idx}`);
    if (!tokenInput || !tokenInput.value.trim()) {
        showToast('ERROR', 'Please enter a token first.');
        return;
    }
    loadDiscordServers(`edit_channels_${idx}`, `edit_servers_container_${idx}`, tokenInput.value.trim());
}

async function saveAccountForm(idx) {
    playSound('click');
    const tKey = idx === 1 ? 'token' : 'token2';
    const cKey = idx === 1 ? 'pokemon_channel' : 'pokemon_channel2';
    const aKey = idx === 1 ? 'afk_msg1' : 'afk_msg2';
    const sKey = idx === 1 ? 'token_status' : 'token_status2';

    const tokenVal = document.getElementById(`edit_token_${idx}`).value.trim();
    const channelsVal = document.getElementById(`edit_channels_${idx}`).value.trim();
    const afkVal = document.getElementById(`edit_afk_${idx}`).value;

    if (!tokenVal) {
        showToast('ERROR', 'Token cannot be empty.');
        return;
    }
    
    const otherTKey = idx === 1 ? 'token2' : 'token';
    if (localConfig[otherTKey] === tokenVal) {
        showToast('ERROR', 'This token is already added to another account.');
        return;
    }

    localConfig[tKey] = tokenVal;
    localConfig[cKey] = channelsVal;
    localConfig[aKey] = afkVal;
    
    // Ensure status is enabled by default for new accounts
    if (!localConfig[sKey]) localConfig[sKey] = 'enabled';

    await pushConfig();
    showToast('SAVED', `Account ${idx} configuration saved.`);
    
    // Clear edit form and return to cards view
    const container = document.getElementById('profiles-container');
    if (container) container.innerHTML = '';
    renderDynamicProfiles();
}

async function toggleAccountStatus(idx) {
    const sKey = idx === 1 ? 'token_status' : 'token_status2';
    const current = localConfig[sKey] || 'enabled';
    localConfig[sKey] = current === 'enabled' ? 'disabled' : 'enabled';
    
    playSound(localConfig[sKey] === 'enabled' ? 'toggle-on' : 'toggle-off');
    await pushConfig();
    renderDynamicProfiles();
}

async function deleteAccount(idx) {
    if (confirm(`Are you sure you want to delete Account ${idx}?`)) {
        playSound('fail');
        const tKey = idx === 1 ? 'token' : 'token2';
        const cKey = idx === 1 ? 'pokemon_channel' : 'pokemon_channel2';
        const aKey = idx === 1 ? 'afk_msg1' : 'afk_msg2';
        const sKey = idx === 1 ? 'token_status' : 'token_status2';

        localConfig[tKey] = '';
        localConfig[cKey] = '';
        localConfig[aKey] = '';
        localConfig[sKey] = '';

        await pushConfig();
        showToast('DELETED', `Account ${idx} removed.`);
        setTimeout(renderDynamicProfiles, 100);
    }
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
    const [c1, c2] = COLORS[i % COLORS.length];
    document.documentElement.style.setProperty('--c1', c1);
    document.documentElement.style.setProperty('--c2', c2);
    const colorBleed = document.getElementById('colorBleed');
    if(colorBleed) {
        colorBleed.style.background = `radial-gradient(ellipse at 30% 70%, ${c1}44, transparent 60%), radial-gradient(ellipse at 70% 30%, ${c2}33, transparent 60%)`;
    }
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
            const MQ_ITEMS = ['PROJECT DARK', 'v4.0.0', 'RAYZIEN', 'AUTOCATCHER', '◈', 'SYSTEM SECURE', 'LIFETIME', '◈'];
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
            if (id && !id.startsWith('react') && id !== 'searchPokemon' && !id.startsWith('edit_') && !input.closest('#profiles-container')) {
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
