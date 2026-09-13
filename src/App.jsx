import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState('System Offline');
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState({});
  const [logs, setLogs] = useState([]);
  const [structuredCatches, setStructuredCatches] = useState(() => {
    try {
      const saved = localStorage.getItem('structuredCatches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchVal, setSearchVal] = useState('');
  const [filterVal, setFilterVal] = useState('all');
  const [desktopAlerts, setDesktopAlerts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // Interact page states
  const [btnChannel, setBtnChannel] = useState('');
  const [btnMsgId, setBtnMsgId] = useState('');
  const [btnLabel, setBtnLabel] = useState('');
  const [reactChannel, setReactChannel] = useState('');
  const [reactMsgId, setReactMsgId] = useState('');
  const [reactEmoji, setReactEmoji] = useState('');

  // Stepper flow states
  const [flowState, setFlowState] = useState({ step: 0, details: '' });

  // Scarcity Promo Timer State
  const [timeLeft, setTimeLeft] = useState('14m 32s');

  const socketRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    let totalSecs = 872;
    const interval = setInterval(() => {
      if (totalSecs > 0) {
        totalSecs--;
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins}m ${secs}s`);
      } else {
        totalSecs = 872;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('structuredCatches', JSON.stringify(structuredCatches));
  }, [structuredCatches]);

  useEffect(() => {
    const ws = new WebSocket('ws://' + window.location.hostname + ':8086');
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStatus('System Active');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatus('System Offline');
    };

    ws.onmessage = (event) => {
      const frame = JSON.parse(event.data);
      if (frame.type === 'config') {
        setConfig(frame.data);
        setDesktopAlerts(frame.data.notifications_enabled === 'true');
      } else if (frame.type === 'log') {
        setLogs((prev) => [...prev, frame.data]);
        animateTimelineProgress(frame.data.msg);
      } else if (frame.type === 'structured_log') {
        handleNewStructuredLog(frame.data);
      } else if (frame.type === 'structured_logs') {
        if (frame.data && frame.data.length > 0) {
          setStructuredCatches(frame.data);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const animateTimelineProgress = (msg) => {
    if (msg.includes("Spawn detected")) {
      setFlowState({ step: 1, details: 'Analyzing Spawn Image...' });
    } else if (msg.includes("Identified:")) {
      let name = msg.split("Identified:")[1].split("(")[0].trim();
      let rarity = msg.split("(")[1].split(")")[0].trim();
      setFlowState({ step: 2, details: `${name.toUpperCase()} (${rarity.toUpperCase()}) — DISPATCHING IN 3s` });
    } else if (msg.includes("CATCH sent")) {
      setFlowState((prev) => ({ ...prev, details: 'Command Transmitted. Awaiting Capture confirmation...' }));
    }
  };

  const handleNewStructuredLog = (log) => {
    setStructuredCatches((prev) => {
      const exists = prev.some(s => s.time === log.time && s.name === log.name);
      if (exists) return prev;
      const next = [...prev, log];
      if (next.length > 200) next.shift();
      return next;
    });

    // Finalize stepper status
    setFlowState({
      step: 3,
      details: `${log.name.toUpperCase()} (${log.rarity.toUpperCase()}) — ${log.status === 'success' ? 'SUCCESSFULLY SECURED' : 'ACQUISITION FAILED'}`
    });
    playSound(log.status === 'success' ? 'success' : 'fail');

    // Trigger desktop notification
    if (desktopAlerts && log.status === 'success') {
      new Notification('Acquisition Success', { 
        body: `Successfully caught ${log.name} (${log.rarity})`, 
        icon: log.image_url || '/logo.png' 
      });
    }

    setTimeout(() => {
      setFlowState({ step: 0, details: '' });
    }, 8000);
  };

  const pushConfig = (updates) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'update_config', data: updates }));
    }
  };

  const updateField = (key, val) => {
    const next = { ...config, [key]: val };
    setConfig(next);
    pushConfig({ [key]: val });
  };

  const toggleSelfAuth = () => {
    const restrictSelf = config.listener_id === 'self';
    const nextVal = restrictSelf ? '' : 'self';
    playSound(nextVal === 'self' ? 'toggle-on' : 'toggle-off');
    updateField('listener_id', nextVal);
  };

  const toggleDesktopAlerts = () => {
    if (!desktopAlerts) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setDesktopAlerts(true);
          playSound('toggle-on');
          pushConfig({ notifications_enabled: 'true' });
        }
      });
    } else {
      setDesktopAlerts(false);
      playSound('toggle-off');
      pushConfig({ notifications_enabled: 'false' });
    }
  };

  const clickDiscordButton = () => {
    if (!btnChannel || !btnMsgId) return;
    socketRef.current.send(JSON.stringify({
      type: 'click_button',
      channel_id: btnChannel,
      message_id: btnMsgId,
      button_label: btnLabel
    }));
  };

  const reactDiscordMessage = () => {
    if (!reactChannel || !reactMsgId || !reactEmoji) return;
    socketRef.current.send(JSON.stringify({
      type: 'react',
      channel_id: reactChannel,
      message_id: reactMsgId,
      emoji: reactEmoji
    }));
  };

  // Analytics helpers
  const successes = structuredCatches.filter(c => c.status === 'success').length;
  const fails = structuredCatches.filter(c => c.status === 'failed').length;
  const total = successes + fails;
  const ratio = total > 0 ? Math.round((successes / total) * 100) : 0;

  // Chart data
  const chartData = [];
  let successCount = 0;
  let failCount = 0;
  structuredCatches.slice(-30).forEach((c, idx) => {
    if (c.status === 'success') successCount++;
    else failCount++;
    chartData.push({ name: idx, success: successCount, failed: failCount });
  });

  // Gallery filter
  let filteredCatches = [...structuredCatches].reverse();
  if (filterVal === 'success') {
    filteredCatches = filteredCatches.filter(c => c.status === 'success');
  } else if (filterVal === 'failed') {
    filteredCatches = filteredCatches.filter(c => c.status === 'failed');
  }
  if (searchVal.trim()) {
    filteredCatches = filteredCatches.filter(c => c.name.toLowerCase().includes(searchVal.toLowerCase()));
  }

  return (
    <div className="app-container">
      {/* Centered large watermark background */}
      <div className="dragon-bg-center"></div>

      {/* Brand Header */}
      <header>
        <div className="brand-section">
          <div className="brand-title">
            <img src="/logo.png" alt="Dragon Logo" />
            <span className="gradient-text">PROJECT DARK</span>
          </div>
          <p className="brand-subtitle">System Control Panel</p>
        </div>
        <div className={`status-badge ${isConnected ? 'connected' : ''}`}>
          <span className="pulse-dot"></span>
          <span>{status}</span>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="dashboard-grid">
        {/* Sidebar Config Controls */}
        <div className="sidebar">
          {/* config.txt Guide Drawer */}
          <div className="glass-panel config-guide-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setShowGuide(!showGuide)}>
                  <span>Configuration Guide</span>
                  <span style={{ fontSize: '0.75rem', background: 'var(--border-glass)', width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>i</span>
                </label>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setShowGuide(!showGuide)}>
                {showGuide ? 'Hide' : 'Show'}
              </button>
            </div>
            {showGuide && (
              <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: '1.5', borderTop: '1px solid var(--border-glass)', paddingTop: '0.8rem' }}>
                <p style={{ marginBottom: '0.6rem' }}>Local <strong style={{ color: 'var(--primary)' }}>config.txt</strong> mappings:</p>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  token=DISCORD_TOKEN<br />
                  listener_id=self<br />
                  prefix=.<br />
                  catch_enabled=true<br />
                  pokemon_channel=CHANNEL_ID<br />
                  huggingface_token=hf_xyz<br />
                  huggingface_model=imjeffharris/pokemon_classifier<br />
                  notifications_enabled=true
                </div>
              </div>
            )}
          </div>

          {/* Conversions Ticker */}
          <div className="glass-panel" style={{ borderColor: 'rgba(168, 85, 247, 0.35)' }}>
            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--accent)', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>LIMITED PROMOTIONAL LICENSE</span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '700', color: 'var(--accent)' }}>50% OFF</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '0.8rem' }}>
              Secure full code access before neural node classifier updates release.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discount expires:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--warning)', fontSize: '0.85rem' }}>{timeLeft}</span>
            </div>
          </div>

          <div className="glass-panel">
            <div className="form-group">
              <label>Discord Credentials Token</label>
              <input
                type="text"
                className="form-control"
                placeholder="Authorization Token"
                value={config.token || ''}
                onChange={(e) => updateField('token', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Hugging Face API Token</label>
              <input
                type="text"
                className="form-control"
                placeholder="hf_..."
                value={config.huggingface_token || ''}
                onChange={(e) => updateField('huggingface_token', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Classification Model ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="imjeffharris/pokemon_classifier"
                value={config.huggingface_model || ''}
                onChange={(e) => updateField('huggingface_model', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Content Panels */}
        <div className="main-content">
          {activeTab === 'dashboard' && (
            <div className="section active">
              {/* Stepper details */}
              <div className="glass-panel">
                <div className="flow-container">
                  <div className="flow-line"></div>
                  <div className="flow-line-fill" style={{ width: flowState.step === 1 ? '0%' : flowState.step === 2 ? '50%' : flowState.step === 3 ? '100%' : '0%' }}></div>
                  
                  <div className={`flow-node-wrapper ${flowState.step >= 1 ? 'active-detect' : ''}`}>
                    <div className="flow-node"></div>
                    <div className="flow-label">Detected</div>
                  </div>
                  <div className={`flow-node-wrapper ${flowState.step >= 2 ? 'active-sent' : ''}`}>
                    <div className="flow-node"></div>
                    <div className="flow-label">Sent Catch</div>
                  </div>
                  <div className={`flow-node-wrapper ${flowState.step >= 3 ? 'active-caught' : ''}`}>
                    <div className="flow-node"></div>
                    <div className="flow-label">Caught</div>
                  </div>
                </div>
                <div className="flow-details-txt">{flowState.details || 'Awaiting Discord Gate Events...'}</div>
              </div>

              {/* Stats & Charts */}
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                  <span style={{ fontWeight: '600' }}>Acquisition Stats</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>HF Neural model status: {config.huggingface_token ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <div className="stats-metrics-grid">
                  <div className="stats-box" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <div className="metric-subtitle" style={{ color: 'var(--success)' }}>Successful Catches</div>
                    <div className="stats-num" style={{ color: 'var(--success)' }}>{successes}</div>
                  </div>
                  <div className="stats-box" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                    <div className="metric-subtitle" style={{ color: 'var(--danger)' }}>Failed / Stolen Spawns</div>
                    <div className="stats-num" style={{ color: 'var(--danger)' }}>{fails}</div>
                  </div>
                  <div className="stats-box">
                    <div className="metric-subtitle">Success Ratio</div>
                    <div className="stats-num">{ratio}%</div>
                  </div>
                </div>

                <div className="analytics-chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.95)', borderColor: 'var(--primary)', borderRadius: '10px' }} />
                      <Line type="monotone" dataKey="success" stroke="var(--success)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="failed" stroke="var(--danger)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'caught' && (
            <div className="section active">
              {/* Caught Grid gallery */}
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <span style={{ fontWeight: '600' }}>Caught List</span>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search Pokemon..."
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      style={{ width: '160px', padding: '0.5rem' }}
                    />
                    <select
                      className="form-control"
                      value={filterVal}
                      onChange={(e) => setFilterVal(e.target.value)}
                      style={{ width: '120px', padding: '0.5rem', background: 'rgba(10,10,15,0.8)' }}
                    >
                      <option value="all">All Logs</option>
                      <option value="success">Caught Only</option>
                      <option value="failed">Fails Only</option>
                    </select>
                  </div>
                </div>

                <div className="acquisitions-grid">
                  {filteredCatches.map((c, i) => (
                    <div key={i} className="pokemon-card">
                      <div className="pokemon-card-name">{c.name}</div>
                      <img src={c.image_url || '/logo.png'} alt={c.name} onError={(e) => { e.target.src = '/logo.png'; }} />
                      <div className={`pokemon-card-rarity ${c.rarity.toLowerCase()}`}>{c.rarity}</div>
                      <div className="pokemon-card-time">{c.time}</div>
                    </div>
                  ))}
                  {filteredCatches.length === 0 && (
                    <div style={{ gridColumn: 'span 12', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '2rem' }}>
                      No caught records found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="section active">
              {/* System Override Settings */}
              <div className="glass-panel">
                <div style={{ fontWeight: '600', marginBottom: '1.2rem' }}>System Parameter Overrides</div>
                
                <div className="row-switch">
                  <div className="switch-info">
                    <span className="switch-title" style={{ display: 'block', fontWeight: '500' }}>Restrict Commands to Self</span>
                    <span className="switch-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ignore commands sent from other accounts</span>
                  </div>
                  <div className={`toggle-switch ${config.listener_id === 'self' ? 'active' : ''}`} onClick={toggleSelfAuth}></div>
                </div>

                <div className="row-switch">
                  <div className="switch-info">
                    <span className="switch-title" style={{ display: 'block', fontWeight: '500' }}>Web notifications on rare Pokémon</span>
                    <span className="switch-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Send browser notifier alerts on legendary/shiny catches</span>
                  </div>
                  <div className={`toggle-switch ${desktopAlerts ? 'active' : ''}`} onClick={toggleDesktopAlerts}></div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>Command Prefix</label>
                  <input
                    type="text"
                    className="form-control"
                    maxLength={3}
                    value={config.prefix || ''}
                    onChange={(e) => updateField('prefix', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Pokétwo Listening Channel ID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={config.pokemon_channel || ''}
                    onChange={(e) => updateField('pokemon_channel', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interact' && (
            <div className="section active">
              {/* Interaction handlers */}
              <div className="glass-panel">
                <div style={{ fontWeight: '600', marginBottom: '1.2rem' }}>Component Click Trigger</div>
                <div className="form-group">
                  <label>Channel ID</label>
                  <input type="text" className="form-control" placeholder="Discord Channel ID" value={btnChannel} onChange={(e) => setBtnChannel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Message ID</label>
                  <input type="text" className="form-control" placeholder="Discord Message ID" value={btnMsgId} onChange={(e) => setBtnMsgId(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Button Label</label>
                  <input type="text" className="form-control" placeholder="Catch" value={btnLabel} onChange={(e) => setBtnLabel(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={clickDiscordButton}>Trigger Component</button>
              </div>

              <div className="glass-panel">
                <div style={{ fontWeight: '600', marginBottom: '1.2rem' }}>Append Reaction</div>
                <div className="form-group">
                  <label>Channel ID</label>
                  <input type="text" className="form-control" placeholder="Discord Channel ID" value={reactChannel} onChange={(e) => setReactChannel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Message ID</label>
                  <input type="text" className="form-control" placeholder="Discord Message ID" value={reactMsgId} onChange={(e) => setReactMsgId(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Reaction Emoji</label>
                  <input type="text" className="form-control" placeholder="Reaction Character" value={reactEmoji} onChange={(e) => setReactEmoji(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={reactDiscordMessage}>Push Reaction</button>
              </div>

              {/* Commands doc */}
              <div className="glass-panel">
                <div style={{ fontWeight: '600', marginBottom: '1.2rem' }}>System Commands List</div>
                <div className="commands-grid">
                  <div className="command-box">
                    <div className="command-name">.help</div>
                    <div className="command-desc">Displays all available commands and system documentation.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name">.ping</div>
                    <div className="command-desc">Checks connection latency to the Discord gateway and neural nodes.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name">.status</div>
                    <div className="command-desc">Views active autocatcher stats and classifier settings.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name">.prefix [char]</div>
                    <div className="command-desc">Changes the prefix character required to trigger commands.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name">.dark</div>
                    <div className="command-desc">Toggles the autocatcher engine ON/OFF remotely.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name">.cooldown</div>
                    <div className="command-desc">Displays current catcher delay and active 120s cooldown protection stats.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name">.stop</div>
                    <div className="command-desc">Emergency halt: turns off the catcher and locks neural inference.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name">.premium</div>
                    <div className="command-desc">Lists available premium features (hosting, alerts, fallback engine).</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name" style={{ color: 'var(--success)' }}>.yes / .accept</div>
                    <div className="command-desc">Confirms the active Pokétwo release, sell, trade, or purchase button prompt.</div>
                  </div>
                  <div className="command-box">
                    <div className="command-name" style={{ color: 'var(--danger)' }}>.no / .disagree</div>
                    <div className="command-desc">Cancels the active Pokétwo release, sell, trade, or purchase button prompt.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="section active">
              {/* System Logs console */}
              <div className="glass-panel">
                <div style={{ fontWeight: '600', marginBottom: '1.2rem' }}>System Logs Feed</div>
                <div className="feed-container">
                  {logs.map((item, idx) => (
                    <div key={idx} className="feed-row">
                      <span className="feed-time">[{item.time}]</span>
                      <span className="feed-msg">{item.msg}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef}></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'premium' && (
            <div className="section active">
              {/* Premium Panel */}
              <div className="glass-panel" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1.8rem', color: 'var(--warning)' }}>★</div>
                  <div style={{ fontWeight: '700', fontSize: '1.2rem', letterSpacing: '1px' }}>Premium Features</div>
                </div>
                
                <div className="commands-grid">
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>Web notifications on rare Pokémon</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Receive instant push notification alerts with image highlights when a legendary, mythical, or shiny spawn is identified.</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>Multi-channel Integration</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Monitor and catch simultaneously across multiple servers, sub-channels, and private group chats under a single core thread.</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>Custom Cooldowns</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Fine-tune rate limit safety protections. Adjust spawn-specific catch timings and customize sleep delays between actions.</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>More than 2 Discord accounts</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Manage multiple Discord user sessions concurrently. Distribute catching threads globally across distinct nodes.</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>Hint Fallback Mode</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>If the AI classifier fails to recognize a spawn image, automatically trigger Pokétwo hints and execute sub-pattern solvers.</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>24-hour hosting: host it unlimitedly with no sleep</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Ensure zero-downtime operations. Host your selfbot daemon 24/7 on remote cloud virtual private servers.</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>Secure Credentials Storage</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>User gets full control of credentials nodes. Sessions handles authorization tokens indirectly without direct database references.</div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', transition: 'var(--transition)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '0.95rem' }}>Captcha Guard Security Auto-Halt</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>Detects incoming security captcha verification triggers immediately, exposes the link details, and automatically halts all threads instantly for safety.</div>
                  </div>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Cost: <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.1rem', marginRight: '8px' }}>$40</span> <span style={{ color: 'var(--warning)' }}>$20</span> 
                    <span style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '0.25rem 0.6rem', borderRadius: '8px', fontSize: '0.75rem', marginLeft: '8px', verticalAlign: 'middle' }}>50% OFF</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                    Lifetime License + Next 3 Major Updates FREE
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--warning)', fontFamily: 'var(--font-sans)', letterSpacing: '1px', marginBottom: '1.5rem' }}>
                    LITECOIN (LTC) OR POLYGON (MATIC) ONLY
                  </div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <button className="btn" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }} onClick={() => alert('Premium upgrades are managed by phoenix14. Contact developer for licensing.')}>Contact Developer for Premium</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="section active">
              {/* About slide VII */}
              {/* SIGNATURE: DEPLOYED_BY_RAYZIEN_SECURE_HASH_8F3B92 */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <img src="/logo.png" alt="Dragon Icon" style={{ width: '36px', height: '36px' }} />
                  <div style={{ fontWeight: '700', fontSize: '1.2rem', letterSpacing: '1px' }}>About PROJECT DARK</div>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.2rem' }}>
                  PROJECT DARK is an advanced web-driven selfbot control panel designed for research and educational purposes. Developed and maintained exclusively by <strong style={{ color: 'var(--primary)' }}>rayzien</strong>.
                </p>
                <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Research Disclaimer</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    This program is distributed solely for testing API thresholds, automated UI interaction mechanics, and image recognition patterns. We are not responsible for any misuse, account bans, rules violations, or damages arising from the use of this software. Run completely at your own discretion.
                  </p>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                  © 2026 PROJECT DARK • developed by rayzien • All rights reserved
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Candybox Numerals Menu */}
      <div className={`candybox-menu ${menuOpen ? 'open' : ''}`}>
        <div className="candybox-trigger" onClick={() => { playSound('click'); setMenuOpen(!menuOpen); }}>
          <img src="/logo.png" alt="Dragon Icon" />
        </div>
        <div className="candybox-options">
          <div className={`option-bubble ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab('dashboard'); setMenuOpen(false); }}>I</div>
          <div className={`option-bubble ${activeTab === 'caught' ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab('caught'); setMenuOpen(false); }}>II</div>
          <div className={`option-bubble ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab('settings'); setMenuOpen(false); }}>III</div>
          <div className={`option-bubble ${activeTab === 'interact' ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab('interact'); setMenuOpen(false); }}>IV</div>
          <div className={`option-bubble ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab('logs'); setMenuOpen(false); }}>V</div>
          <div className={`option-bubble ${activeTab === 'premium' ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab('premium'); setMenuOpen(false); }}>VI</div>
          <div className={`option-bubble ${activeTab === 'about' ? 'active' : ''}`} onClick={() => { playSound('click'); setActiveTab('about'); setMenuOpen(false); }}>VII</div>
        </div>
      </div>

}
