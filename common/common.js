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
        if (frame.type === 'config') {
            localConfig = frame.data;
            renderConfigToInputs();
        } else if (frame.type === 'log') {
            appendSystemLog(frame.data);
        } else if (frame.type === 'structured_log') {
            handleNewCaptureLog(frame.data);
        } else if (frame.type === 'structured_logs') {
            if (frame.data && frame.data.length > 0) {
                structuredCatches = frame.data;
                localStorage.setItem('structuredCatches', JSON.stringify(structuredCatches));
                renderCatchesGallery();
                updateAcquisitionsMetrics();
            }
        } else if (frame.type === 'engine_state') {
            handleEngineState(frame.data, frame.image_url);
        }
    };
}

function handleEngineState(state, imageUrl) {
    const imgEl = document.getElementById('hero-detected-img');

    if (!imgEl) return;

    if (state === 'detected') {
        if (imageUrl) {
            imgEl.src = imageUrl;
            imgEl.style.display = 'block';
        }
        imgEl.style.filter = 'drop-shadow(0 0 30px var(--c2))';
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
    
    // Toggle switches
    const isSelf = localConfig.listener_id === 'self';
    const restrictSwitch = document.getElementById('restrictSwitch');
    if (restrictSwitch) restrictSwitch.className = 'toggle-switch' + (isSelf ? ' active' : '');
    
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
        new Notification('Acquisition Success', {
            body: `Successfully caught ${log.name} (${log.rarity})`,
            icon: log.image_url || '/logo.png'
        });
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
        card.className = 'card';
        let rarityColor = c.rarity.toLowerCase() === 'common' ? 'rgba(255,255,255,0.4)' : 'var(--c1)';
        card.innerHTML = `
            <div class="card-num" style="color: ${rarityColor};">${c.rarity || 'COM'}</div>
            <div class="card-icon">◈</div>
            <div class="card-img-wrap"><img src="${c.image_url || '/logo.png'}" alt="${c.name}" onerror="this.src='/logo.png'"></div>
            <h3>${c.name}</h3>
            <p>Level ${c.details || '?'} — ${c.time}</p>
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

function toggleRestrictSelf() {
    const isSelf = localConfig.listener_id === 'self';
    localConfig.listener_id = isSelf ? '' : 'self';
    const switchEl = document.getElementById('restrictSwitch');
    if (switchEl) switchEl.className = 'toggle-switch' + (localConfig.listener_id === 'self' ? ' active' : '');
    playSound(localConfig.listener_id === 'self' ? 'toggle-on' : 'toggle-off');
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
