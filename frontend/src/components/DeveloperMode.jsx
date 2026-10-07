import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Settings, X, Volume2, VolumeX, Palette, User, CircleDollarSign, Shield,
  Zap, Eye, EyeOff, Code, ChevronDown, ChevronRight, Save, RotateCcw,
  Wifi, WifiOff, Monitor, Globe, Moon, Sun, Bug, Terminal, Database,
  Activity, Trash2, Copy, Send, RefreshCw, Download, Upload, Lock, Unlock,
  Search, Cpu, HardDrive, Clock, Layers, Box, Braces, FileJson,
  MessageSquare, Bell, BellOff, Users, Hash, ZapOff, Power, PowerOff,
  ArrowUp, ArrowDown, Maximize, Minimize, ScreenShare, Camera, Mic, MicOff,
  Image, Link, Filter, TestTube, FlaskConical, Play, Pause,
  SkipForward, SkipBack, Shuffle, Repeat, Star, Heart, ThumbsUp
} from 'lucide-react';

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full transition-colors relative ${
      checked ? 'bg-green-500' : 'bg-discord-light/30'
    }`}
  >
    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow ${
      checked ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
);

const LogEntry = ({ log }) => (
  <div className={`text-xs font-mono px-3 py-1.5 border-b border-discord-light/5 ${
    log.type === 'error' ? 'text-red-400 bg-red-500/5' :
    log.type === 'warn' ? 'text-yellow-400 bg-yellow-500/5' :
    log.type === 'info' ? 'text-blue-400 bg-blue-500/5' :
    'text-discord-gray'
  }`}>
    <span className="text-discord-muted mr-2">[{log.time}]</span>
    <span className="mr-2 font-bold uppercase">{log.type}</span>
    {log.message}
  </div>
);

const DEV_PASSWORD_HASH = '8d969eef6ebad3420f4d32e0f8e9e8b5'; // md5 of "dev123"

const DeveloperMode = ({ user, onClose }) => {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('devModeAuth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('debug');
  const [soundVolume, setSoundVolume] = useState(() => parseInt(localStorage.getItem('devSoundVolume') || '50'));
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('devMuted') === 'true');
  const [quickCoins, setQuickCoins] = useState(1000);
  const [fps, setFps] = useState(60);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [networkLatency, setNetworkLatency] = useState(12);
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'dark');
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [apiUrl, setApiUrl] = useState('http://localhost:3001');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiPath, setApiPath] = useState('/api/auth/me');
  const [apiBody, setApiBody] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [localStorageData, setLocalStorageData] = useState([]);
  const [storageFilter, setStorageFilter] = useState('');
  const [customCss, setCustomCss] = useState(() => localStorage.getItem('devCustomCss') || '');
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('devFontSize') || '14'));
  const [borderRadius, setBorderRadius] = useState(() => parseInt(localStorage.getItem('devBorderRadius') || '8'));
  const [animSpeed, setAnimSpeed] = useState(() => parseInt(localStorage.getItem('devAnimSpeed') || '100'));
  const [statusText, setStatusText] = useState(() => localStorage.getItem('devStatus') || 'В сети');
  const [featureFlags, setFeatureFlags] = useState(() => {
    try { return JSON.parse(localStorage.getItem('devFeatureFlags')) || {}; } catch { return {}; }
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [uptime, setUptime] = useState(0);
  const [packetsSent, setPacketsSent] = useState(0);
  const [packetsReceived, setPacketsReceived] = useState(0);
  const [errors, setErrors] = useState(0);
  const [tabHistory, setTabHistory] = useState(['debug']);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const logEndRef = useRef(null);
  const styleRef = useRef(null);

  const setTheme = (t) => { setThemeState(t); localStorage.setItem('theme', t); };

  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let raf;
    const measure = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Memory
  useEffect(() => {
    const update = () => {
      if (performance.memory) {
        setMemoryUsage(Math.round(performance.memory.usedJSHeapSize / 1024 / 1024));
      }
    };
    update();
    const i = setInterval(update, 2000);
    return () => clearInterval(i);
  }, []);

  // Latency
  useEffect(() => {
    const i = setInterval(() => setNetworkLatency(Math.floor(Math.random() * 30) + 5), 3000);
    return () => clearInterval(i);
  }, []);

  // Uptime
  useEffect(() => {
    const i = setInterval(() => setUptime(p => p + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // Packets
  useEffect(() => {
    const i = setInterval(() => {
      setPacketsSent(p => p + Math.floor(Math.random() * 5));
      setPacketsReceived(p => p + Math.floor(Math.random() * 15));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('devSoundVolume', soundVolume.toString());
    localStorage.setItem('devMuted', isMuted.toString());
    localStorage.setItem('devCustomCss', customCss);
    localStorage.setItem('devFontSize', fontSize.toString());
    localStorage.setItem('devBorderRadius', borderRadius.toString());
    localStorage.setItem('devAnimSpeed', animSpeed.toString());
    localStorage.setItem('devStatus', statusText);
    localStorage.setItem('devFeatureFlags', JSON.stringify(featureFlags));
  }, [soundVolume, isMuted, customCss, fontSize, borderRadius, animSpeed, statusText, featureFlags]);

  // Custom CSS injection
  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'dev-custom-css';
      document.head.appendChild(styleRef.current);
    }
    styleRef.current.textContent = customCss;
    return () => { styleRef.current?.remove(); };
  }, [customCss]);

  // Intercept console
  useEffect(() => {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    const addLog = (type, args) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      setLogs(prev => [...prev.slice(-199), { type, message: msg, time: new Date().toLocaleTimeString() }]);
    };
    console.log = (...args) => { addLog('log', args); origLog(...args); };
    console.warn = (...args) => { addLog('warn', args); origWarn(...args); };
    console.error = (...args) => { addLog('error', args); setErrors(p => p + 1); origError(...args); };
    return () => { console.log = origLog; console.warn = origWarn; console.error = origError; };
  }, []);

  // Auto scroll logs
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // LocalStorage data
  useEffect(() => {
    const data = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data.push({ key, value: localStorage.getItem(key) });
    }
    setLocalStorageData(data);
  }, [activeSection]);

  const formatUptime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const navigateTo = (section) => {
    setTabHistory(prev => [...prev.slice(0, historyIdx + 1), section]);
    setHistoryIdx(prev => prev + 1);
    setActiveSection(section);
  };

  const goBack = () => {
    if (historyIdx > 0) {
      setHistoryIdx(prev => prev - 1);
      setActiveSection(tabHistory[historyIdx - 1]);
    }
  };

  const goForward = () => {
    if (historyIdx < tabHistory.length - 1) {
      setHistoryIdx(prev => prev + 1);
      setActiveSection(tabHistory[historyIdx + 1]);
    }
  };

  const handleTestSound = (type) => {
    const audio = new Audio();
    audio.volume = isMuted ? 0 : soundVolume / 100;
    const sounds = {
      message: '/sounds/message.mp3', join: '/sounds/join.mp3',
      leave: '/sounds/leave.mp3', call: '/sounds/call.mp3',
      notification: '/sounds/notification.mp3'
    };
    audio.src = sounds[type] || sounds.message;
    audio.play().catch(() => {});
  };

  const handleAddCoins = async (amount) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/auth/update-coins', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, coins: amount })
      });
    } catch (e) { console.error(e); }
  };

  const handleApiRequest = async () => {
    setApiLoading(true);
    setApiResponse(null);
    const start = Date.now();
    try {
      const token = localStorage.getItem('token');
      const opts = { method: apiMethod, headers: { 'Content-Type': 'application/json' } };
      if (token) opts.headers['Authorization'] = `Bearer ${token}`;
      if (['POST', 'PUT', 'PATCH'].includes(apiMethod) && apiBody) opts.body = apiBody;
      const res = await fetch(`${apiUrl}${apiPath}`, opts);
      const json = await res.json();
      setApiResponse({
        status: res.status, time: Date.now() - start,
        headers: Object.fromEntries(res.headers.entries()), body: json
      });
    } catch (e) {
      setApiResponse({ status: 0, time: Date.now() - start, error: e.message });
    }
    setApiLoading(false);
  };

  const handleExportConfig = () => {
    const config = {
      soundVolume, isMuted, theme, customCss, fontSize, borderRadius, animSpeed,
      statusText, featureFlags, userId: user?.id, username: user?.username,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dev-config.json';
    a.click();
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const cfg = JSON.parse(ev.target.result);
          if (cfg.soundVolume !== undefined) setSoundVolume(cfg.soundVolume);
          if (cfg.isMuted !== undefined) setIsMuted(cfg.isMuted);
          if (cfg.theme) setTheme(cfg.theme);
          if (cfg.customCss) setCustomCss(cfg.customCss);
          if (cfg.fontSize) setFontSize(cfg.fontSize);
          if (cfg.borderRadius) setBorderRadius(cfg.borderRadius);
          if (cfg.animSpeed) setAnimSpeed(cfg.animSpeed);
          if (cfg.statusText) setStatusText(cfg.statusText);
          if (cfg.featureFlags) setFeatureFlags(cfg.featureFlags);
        } catch { alert('Ошибка импорта'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleResetAll = () => {
    localStorage.removeItem('devSoundVolume');
    localStorage.removeItem('devMuted');
    localStorage.removeItem('theme');
    localStorage.removeItem('devCustomCss');
    localStorage.removeItem('devFontSize');
    localStorage.removeItem('devBorderRadius');
    localStorage.removeItem('devAnimSpeed');
    localStorage.removeItem('devStatus');
    localStorage.removeItem('devFeatureFlags');
    setSoundVolume(50);
    setIsMuted(false);
    setTheme('dark');
    setCustomCss('');
    setFontSize(14);
    setBorderRadius(8);
    setAnimSpeed(100);
    setStatusText('В сети');
    setFeatureFlags({});
  };

  const handleClearStorage = () => {
    if (confirm('Очистить всё localStorage?')) {
      localStorage.clear();
      setLocalStorageData([]);
    }
  };

  const handleDeleteStorageKey = (key) => {
    localStorage.removeItem(key);
    setLocalStorageData(prev => prev.filter(d => d.key !== key));
  };

  const filteredStorage = useMemo(() => {
    if (!searchQuery) return localStorageData;
    const q = searchQuery.toLowerCase();
    return localStorageData.filter(d => d.key.toLowerCase().includes(q) || d.value?.toLowerCase().includes(q));
  }, [localStorageData, searchQuery]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(l => l.type === logFilter);
  }, [logs, logFilter]);

  const sections = [
    { id: 'debug', label: 'Отладка', icon: Bug },
    { id: 'console', label: 'Консоль', icon: Terminal },
    { id: 'api', label: 'API Тестер', icon: Send },
    { id: 'storage', label: 'Хранилище', icon: Database },
    { id: 'sounds', label: 'Звуки', icon: Volume2 },
    { id: 'theme', label: 'Тема и стиль', icon: Palette },
    { id: 'user', label: 'Пользователь', icon: User },
    { id: 'server', label: 'Сервер', icon: Globe },
    { id: 'network', label: 'Сеть', icon: Wifi },
    { id: 'features', label: 'Фичи', icon: Zap },
    { id: 'tools', label: 'Инструменты', icon: Settings },
  ];

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === 'dev123') {
      setAuthenticated(true);
      sessionStorage.setItem('devModeAuth', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Неверный пароль');
      setPasswordInput('');
    }
  };

  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-discord-dark rounded-2xl shadow-2xl border border-discord-light/20 w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Lock size={28} className="text-white" />
            </div>
            <h2 className="text-discord-white font-bold text-xl">Dev Mode</h2>
            <p className="text-discord-gray text-sm mt-1">Введите пароль для доступа</p>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                placeholder="Пароль"
                autoFocus
                className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg px-4 py-3 pr-12 text-discord-white text-sm focus:outline-none focus:border-discord-blurple"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-gray hover:text-discord-white">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
                {passwordError}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-discord-light/10 hover:bg-discord-light/20 text-discord-gray rounded-lg text-sm transition-colors">
                Отмена
              </button>
              <button type="submit"
                className="flex-1 px-4 py-2.5 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-lg text-sm transition-colors">
                Войти
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-discord-dark rounded-2xl shadow-2xl border border-discord-light/20 w-full max-w-6xl max-h-[92vh] overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-52 bg-discord-darker border-r border-discord-light/20 p-3 flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <Terminal className="text-green-400" size={18} />
              <span className="text-discord-white font-bold text-sm">Dev Mode</span>
            </div>
            <button onClick={onClose} className="text-discord-gray hover:text-discord-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1 mb-3 px-1">
            <button onClick={goBack} disabled={historyIdx === 0}
              className="p-1.5 rounded-lg hover:bg-discord-light/10 disabled:opacity-30 text-discord-gray hover:text-discord-white">
              <ChevronDown size={14} className="rotate-90" />
            </button>
            <button onClick={goForward} disabled={historyIdx === tabHistory.length - 1}
              className="p-1.5 rounded-lg hover:bg-discord-light/10 disabled:opacity-30 text-discord-gray hover:text-discord-white">
              <ChevronDown size={14} className="-rotate-90" />
            </button>
            <button onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 rounded-lg hover:bg-discord-light/10 text-discord-gray hover:text-discord-white ml-auto">
              <Search size={14} />
            </button>
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto">
            {sections.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => navigateTo(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                  activeSection === id
                    ? 'bg-discord-blurple text-white'
                    : 'text-discord-gray hover:text-discord-white hover:bg-discord-light/10'
                }`}>
                <Icon size={15} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-discord-light/20 space-y-1">
            <button onClick={handleExportConfig}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-discord-gray hover:text-discord-white hover:bg-discord-light/10 text-xs">
              <Download size={12} /> Экспорт
            </button>
            <button onClick={handleImportConfig}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-discord-gray hover:text-discord-white hover:bg-discord-light/10 text-xs">
              <Upload size={12} /> Импорт
            </button>
            <button onClick={handleResetAll}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
              <RotateCcw size={12} /> Сбросить всё
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto">
          {showSearch && (
            <div className="sticky top-0 z-10 bg-discord-dark/95 backdrop-blur border-b border-discord-light/10 px-6 py-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
                <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по разделу..."
                  className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg pl-10 pr-4 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
              </div>
            </div>
          )}
          <div className="p-6">

            {/* === DEBUG === */}
            {activeSection === 'debug' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Bug size={20} className="text-green-400" /> Панель отладки
                </h3>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'FPS', value: fps, color: fps > 50 ? 'text-green-400' : fps > 30 ? 'text-yellow-400' : 'text-red-400', icon: Activity },
                    { label: 'Память', value: `${memoryUsage}MB`, color: 'text-discord-white', icon: HardDrive },
                    { label: 'Пинг', value: `${networkLatency}ms`, color: networkLatency < 20 ? 'text-green-400' : 'text-yellow-400', icon: Wifi },
                    { label: 'Аптайм', value: formatUptime(uptime), color: 'text-discord-blurple', icon: Clock },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-discord-darker rounded-xl p-3 border border-discord-light/10">
                      <div className="flex items-center gap-1.5 text-discord-gray text-xs mb-1"><Icon size={12} />{label}</div>
                      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Разрешение', value: `${window.innerWidth}x${window.innerHeight}` },
                    { label: 'Отправлено', value: `${packetsSent} пакетов` },
                    { label: 'Получено', value: `${packetsReceived} пакетов` },
                    { label: 'Ошибки', value: errors, color: errors > 0 ? 'text-red-400' : 'text-green-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-discord-darker rounded-xl p-3 border border-discord-light/10">
                      <div className="text-discord-gray text-xs mb-1">{label}</div>
                      <div className={`text-sm font-bold font-mono ${color || 'text-discord-white'}`}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2"><Terminal size={16} /> Состояние</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm font-mono">
                    {[
                      ['User ID', user?.id, 'text-discord-accent'],
                      ['Username', user?.username, 'text-discord-white'],
                      ['Role', user?.role, 'text-discord-blurple'],
                      ['Coins', user?.coins, 'text-yellow-400'],
                      ['Subscription', user?.subscriptionTier, 'text-green-400'],
                      ['Theme', theme, 'text-pink-400'],
                      ['Sound', isMuted ? 'Muted' : `${soundVolume}%`, 'text-blue-400'],
                      ['Status', statusText, 'text-discord-white'],
                      ['Uptime', formatUptime(uptime), 'text-discord-blurple'],
                      ['Token', `${localStorage.getItem('token')?.substring(0, 15)}...`, 'text-discord-muted'],
                    ].map(([k, v, c]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-discord-light/5">
                        <span className="text-discord-gray">{k}:</span>
                        <span className={c}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2"><Code size={16} /> Быстрые действия</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'JSON пользователя', fn: () => alert(JSON.stringify(user, null, 2)) },
                      { label: 'Console.log', fn: () => console.log('[DEV]', { user, theme, soundVolume, fps, memoryUsage }) },
                      { label: 'Тест ошибки', fn: () => { try { null.foo(); } catch(e) { console.error('[DEV TEST]', e.message); } } },
                      { label: 'Тест предупреждения', fn: () => console.warn('[DEV TEST] Warning message') },
                      { label: 'Перезагрузить страницу', fn: () => window.location.reload() },
                      { label: 'Очистить кэш', fn: () => { caches.keys().then(n => n.forEach(k => caches.delete(k))); alert('Кэш очищен'); } },
                      { label: 'Показать cookies', fn: () => alert(document.cookie || 'Нет cookies') },
                      { label: 'Открыть DevTools', fn: () => alert('F12 → Console') },
                      { label: 'Скопировать user ID', fn: () => { navigator.clipboard?.writeText(String(user?.id)); alert('Скопировано!'); } },
                    ].map(({ label, fn }) => (
                      <button key={label} onClick={fn}
                        className="px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors text-left">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === CONSOLE === */}
            {activeSection === 'console' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                    <Terminal size={20} className="text-yellow-400" /> Консоль
                  </h3>
                  <div className="flex items-center gap-2">
                    {['all', 'log', 'warn', 'error'].map(f => (
                      <button key={f} onClick={() => setLogFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          logFilter === f ? 'bg-discord-blurple text-white' : 'bg-discord-light/10 text-discord-gray hover:text-discord-white'
                        }`}>
                        {f === 'all' ? 'Все' : f.toUpperCase()} {f !== 'all' ? `(${logs.filter(l => l.type === f).length})` : `(${logs.length})`}
                      </button>
                    ))}
                    <button onClick={() => setLogs([])}
                      className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      Очистить
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl border border-discord-light/10 max-h-[500px] overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-discord-muted text-sm">Нет логов</div>
                  ) : (
                    filteredLogs.map((log, i) => (
                      <div key={i} onClick={() => setSelectedLog(selectedLog === i ? null : i)}
                        className="cursor-pointer hover:bg-discord-light/5">
                        <LogEntry log={log} />
                        {selectedLog === i && (
                          <div className="px-3 py-2 bg-discord-dark/50 text-xs text-discord-gray">
                            <pre className="whitespace-pre-wrap break-all">{log.message}</pre>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(log.message); }}
                              className="mt-1 text-discord-blurple hover:underline">Копировать</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {/* === API TESTER === */}
            {activeSection === 'api' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Send size={20} className="text-blue-400" /> API Тестер
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="flex items-center gap-2 mb-3">
                    <select value={apiMethod} onChange={(e) => setApiMethod(e.target.value)}
                      className="bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none">
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                        <option key={m} value={m} className="bg-discord-dark">{m}</option>
                      ))}
                    </select>
                    <input value={apiPath} onChange={(e) => setApiPath(e.target.value)}
                      placeholder="/api/auth/me"
                      className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white font-mono text-sm focus:outline-none focus:border-discord-blurple" />
                    <button onClick={handleApiRequest} disabled={apiLoading}
                      className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                      {apiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      Отправить
                    </button>
                  </div>

                  {['POST', 'PUT', 'PATCH'].includes(apiMethod) && (
                    <textarea value={apiBody} onChange={(e) => setApiBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-green-400 font-mono text-xs focus:outline-none focus:border-discord-blurple h-24 resize-none" />
                  )}
                </div>

                {apiResponse && (
                  <div className="bg-discord-darker rounded-xl border border-discord-light/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-discord-light/10">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${
                          apiResponse.status >= 200 && apiResponse.status < 300 ? 'text-green-400' :
                          apiResponse.status >= 400 ? 'text-red-400' : 'text-yellow-400'
                        }`}>HTTP {apiResponse.status}</span>
                        <span className="text-discord-gray text-xs">{apiResponse.time}ms</span>
                      </div>
                      <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(apiResponse.body, null, 2))}
                        className="text-discord-gray hover:text-discord-white">
                        <Copy size={14} />
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-discord-green-400 overflow-auto max-h-80">
                      {apiResponse.error
                        ? `Error: ${apiResponse.error}`
                        : JSON.stringify(apiResponse.body, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Быстрые запросы</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { method: 'GET', path: '/api/auth/me', label: 'Профиль' },
                      { method: 'GET', path: '/api/servers', label: 'Серверы' },
                      { method: 'GET', path: '/api/friends', label: 'Друзья' },
                      { method: 'GET', path: '/api/dm', label: 'ЛС' },
                      { method: 'POST', path: '/api/auth/update-coins', label: 'Монеты', body: '{"userId":' + (user?.id || 1) + ',"coins":100}' },
                      { method: 'GET', path: '/api/notifications', label: 'Уведомления' },
                    ].map(({ method, path, label, body }) => (
                      <button key={label} onClick={() => { setApiMethod(method); setApiPath(path); if (body) setApiBody(body); }}
                        className="px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-left transition-colors">
                        <span className={`text-xs font-bold ${method === 'GET' ? 'text-green-400' : 'text-yellow-400'}`}>{method}</span>
                        <span className="text-discord-white text-xs ml-2">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === STORAGE === */}
            {activeSection === 'storage' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                    <Database size={20} className="text-orange-400" /> Хранилище
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      const data = [];
                      for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        data.push({ key, value: localStorage.getItem(key) });
                      }
                      setLocalStorageData(data);
                    }} className="p-2 rounded-lg bg-discord-light/10 hover:bg-discord-light/20 text-discord-gray hover:text-discord-white">
                      <RefreshCw size={14} />
                    </button>
                    <button onClick={handleClearStorage} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      Очистить всё
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Фильтр ключей..."
                      className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg pl-9 pr-4 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl border border-discord-light/10 max-h-[500px] overflow-y-auto">
                  {filteredStorage.length === 0 ? (
                    <div className="p-8 text-center text-discord-muted text-sm">Хранилище пусто</div>
                  ) : (
                    filteredStorage.map(({ key, value }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-2.5 border-b border-discord-light/5 hover:bg-discord-light/5 group">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="text-discord-blurple text-xs font-mono truncate">{key}</div>
                          <div className="text-discord-gray text-xs font-mono truncate mt-0.5">{value?.substring(0, 80)}</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigator.clipboard?.writeText(value || '')}
                            className="p-1 rounded hover:bg-discord-light/20 text-discord-gray hover:text-discord-white">
                            <Copy size={12} />
                          </button>
                          <button onClick={() => handleDeleteStorageKey(key)}
                            className="p-1 rounded hover:bg-red-500/20 text-discord-gray hover:text-red-400">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Добавить запись</h4>
                  <div className="flex gap-2">
                    <input id="newKey" placeholder="Ключ" className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                    <input id="newValue" placeholder="Значение" className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                    <button onClick={() => {
                      const k = document.getElementById('newKey')?.value;
                      const v = document.getElementById('newValue')?.value;
                      if (k) { localStorage.setItem(k, v || ''); setLocalStorageData(p => [...p, { key: k, value: v }]); }
                    }} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm">
                      Добавить
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* === SOUNDS === */}
            {activeSection === 'sounds' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Volume2 size={20} className="text-discord-blurple" /> Настройки звука
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-discord-white text-sm">Громкость</span>
                    <span className="text-discord-blurple font-mono text-sm">{soundVolume}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={soundVolume}
                    onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                    className="w-full h-2 bg-discord-light/20 rounded-lg appearance-none cursor-pointer accent-discord-blurple" />
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isMuted ? <VolumeX className="text-red-400" size={18} /> : <Volume2 className="text-green-400" size={18} />}
                      <span className="text-discord-white text-sm">{isMuted ? 'Звук выключен' : 'Звук включён'}</span>
                    </div>
                    <button onClick={() => setIsMuted(!isMuted)}
                      className={`w-11 h-6 rounded-full transition-colors ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${isMuted ? 'translate-x-1' : 'translate-x-6'}`} />
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Тест звуков</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'message', label: 'Сообщение', icon: MessageSquare },
                      { type: 'join', label: 'Вход', icon: Wifi },
                      { type: 'leave', label: 'Выход', icon: WifiOff },
                      { type: 'call', label: 'Звонок', icon: Phone },
                      { type: 'notification', label: 'Уведомление', icon: Bell },
                    ].map(({ type, label, icon: Icon }) => (
                      <button key={type} onClick={() => handleTestSound(type)}
                        className="flex items-center gap-2 px-3 py-2.5 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                        <Icon size={14} />{label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === THEME === */}
            {activeSection === 'theme' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Palette size={20} className="text-pink-400" /> Тема и стиль
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Тема оформления</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'dark', label: 'Тёмная', color: 'bg-gray-800' },
                      { id: 'midnight', label: 'Полночь', color: 'bg-indigo-950' },
                      { id: 'purple', label: 'Фиолетовая', color: 'bg-purple-900' },
                      { id: 'ocean', label: 'Океан', color: 'bg-blue-900' },
                    ].map(({ id, label, color }) => (
                      <button key={id} onClick={() => setTheme(id)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          theme === id ? 'border-discord-blurple bg-discord-blurple/20' : 'border-discord-light/20 hover:border-discord-light/40'
                        }`}>
                        <div className={`w-full h-6 rounded-lg mb-2 ${color}`} />
                        <span className="text-discord-white text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Размер шрифта: {fontSize}px</h4>
                  <input type="range" min="10" max="24" value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-discord-light/20 rounded-lg appearance-none cursor-pointer accent-discord-blurple" />
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Скругление углов: {borderRadius}px</h4>
                  <input type="range" min="0" max="24" value={borderRadius}
                    onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                    className="w-full h-2 bg-discord-light/20 rounded-lg appearance-none cursor-pointer accent-discord-blurple" />
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Скорость анимаций: {animSpeed}%</h4>
                  <input type="range" min="0" max="300" value={animSpeed}
                    onChange={(e) => setAnimSpeed(parseInt(e.target.value))}
                    className="w-full h-2 bg-discord-light/20 rounded-lg appearance-none cursor-pointer accent-discord-blurple" />
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Кастомный CSS</h4>
                  <textarea value={customCss} onChange={(e) => setCustomCss(e.target.value)}
                    placeholder="/* Вставьте CSS здесь */&#10;body { font-size: 14px; }"
                    className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-green-400 font-mono text-xs focus:outline-none focus:border-discord-blurple h-32 resize-none" />
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => setCustomCss('')} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      Очистить CSS
                    </button>
                    <span className="text-discord-muted text-xs">CSS применяется мгновенно</span>
                  </div>
                </div>
              </div>
            )}

            {/* === USER === */}
            {activeSection === 'user' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <User size={20} className="text-discord-accent" /> Управление пользователем
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="flex items-center gap-4">
                    <img src={user?.avatar || '/default-avatar.png'} alt=""
                      className="w-16 h-16 rounded-full border-2 border-discord-blurple" />
                    <div>
                      <div className="text-discord-white font-bold text-lg">{user?.username}</div>
                      <div className="text-discord-gray text-sm">{user?.email}</div>
                      <div className="text-discord-blurple text-xs font-mono">ID: {user?.id}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2 text-sm">
                    <CircleDollarSign size={16} className="text-yellow-400" /> Монеты
                  </h4>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="number" value={quickCoins} onChange={(e) => setQuickCoins(parseInt(e.target.value) || 0)}
                      className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                    <button onClick={() => handleAddCoins(quickCoins)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors">
                      Добавить
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[100, 500, 1000, 5000, 10000].map((amount) => (
                      <button key={amount} onClick={() => handleAddCoins(amount)}
                        className="px-2 py-1.5 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                        +{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Shield size={16} className="text-discord-blurple" /> Роль
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['user', 'admin', 'moderator', 'owner'].map((role) => (
                      <button key={role} onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch('/api/auth/update-role', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, role })
                          });
                          const data = await res.json();
                          if (data.success) { console.log(`[DEV] Role changed to: ${role}`); alert(`Роль изменена на: ${role}`); }
                          else { alert(data.error || 'Ошибка'); }
                        } catch (e) { console.error(e); alert('Ошибка сети'); }
                      }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          user?.role === role ? 'bg-discord-blurple text-white' : 'bg-discord-light/10 hover:bg-discord-light/20 text-discord-white'
                        }`}>
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Zap size={16} className="text-yellow-400" /> Подписка
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['free', 'privet', 'privet_plus'].map((tier) => (
                      <button key={tier} onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch('/api/auth/buy-subscription', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tier })
                          });
                          const data = await res.json();
                          if (data.success) { console.log(`[DEV] Subscription changed to: ${tier}`); alert(`Подписка изменена на: ${tier}`); }
                          else { alert(data.error || 'Ошибка'); }
                        } catch (e) { console.error(e); alert('Ошибка сети'); }
                      }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          user?.subscription === tier ? 'bg-discord-blurple text-white' : 'bg-discord-light/10 hover:bg-discord-light/20 text-discord-white'
                        }`}>
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Eye size={16} className="text-green-400" /> Статус
                  </h4>
                  <div className="flex items-center gap-2 mb-3">
                    <input value={statusText} onChange={(e) => setStatusText(e.target.value)}
                      className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['В сети', 'Не беспокоить', 'Не активен', 'Скрытый'].map((s) => (
                      <button key={s} onClick={() => setStatusText(s)}
                        className="px-2 py-1.5 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === SERVER === */}
            {activeSection === 'server' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Globe size={20} className="text-green-400" /> Настройки сервера
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">API Endpoint</h4>
                  <div className="flex items-center gap-2">
                    <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                      className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white font-mono text-sm focus:outline-none focus:border-discord-blurple" />
                    <button onClick={() => { localStorage.setItem('devApiUrl', apiUrl); alert(`API URL сохранён: ${apiUrl}`); }}
                      className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-lg text-sm transition-colors">
                      Применить
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Режим работы</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Онлайн', icon: Wifi, color: 'text-green-400', bg: 'bg-green-500/10' },
                      { label: 'Не беспокоить', icon: BellOff, color: 'text-red-400', bg: 'bg-red-500/10' },
                      { label: 'Невидимка', icon: Eye, color: 'text-discord-gray', bg: 'bg-discord-light/10' },
                      { label: 'Офлайн', icon: WifiOff, color: 'text-discord-gray', bg: 'bg-discord-light/10' },
                    ].map(({ label, icon: Icon, color, bg }) => (
                      <button key={label} onClick={() => { setStatusText(label); alert(`Статус: ${label}`); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${bg} hover:bg-discord-light/20 transition-colors cursor-pointer`}>
                        <Icon size={16} className={color} />
                        <span className="text-discord-white text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Информация о приложении</h4>
                  <div className="space-y-1.5 text-sm">
                    {[
                      ['React', React.version],
                      ['Node.js', typeof process !== 'undefined' ? 'N/A (browser)' : 'N/A'],
                      ['User Agent', navigator.userAgent.substring(0, 60) + '...'],
                      ['URL', window.location.href],
                      ['Protocol', window.location.protocol],
                      ['Platform', navigator.platform],
                      ['Language', navigator.language],
                      ['Cores', navigator.hardwareConcurrency],
                      ['Cookies', document.cookie ? 'Есть' : 'Нет'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1 border-b border-discord-light/5">
                        <span className="text-discord-gray">{k}</span>
                        <span className="text-discord-white font-mono text-xs">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === NETWORK === */}
            {activeSection === 'network' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Wifi size={20} className="text-blue-400" /> Сеть и соединение
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                    <div className="text-discord-gray text-xs mb-1">Пинг</div>
                    <div className={`text-2xl font-bold font-mono ${networkLatency < 20 ? 'text-green-400' : networkLatency < 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {networkLatency}ms
                    </div>
                  </div>
                  <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                    <div className="text-discord-gray text-xs mb-1">Отправлено</div>
                    <div className="text-2xl font-bold font-mono text-discord-white">{packetsSent}</div>
                  </div>
                  <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                    <div className="text-discord-gray text-xs mb-1">Получено</div>
                    <div className="text-2xl font-bold font-mono text-discord-white">{packetsReceived}</div>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-discord-white text-sm">WebSocket</span>
                    <span className="flex items-center gap-1.5 text-green-400 text-xs">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Подключено
                    </span>
                  </div>
                  <div className="text-xs text-discord-gray font-mono">ws://localhost:5000/ws</div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Симуляция проблем</h4>
                  <div className="space-y-2">
                    {[
                      { id: 'packetLoss', label: 'Потеря пакетов (5%)', desc: 'Случайные пакеты будут теряться' },
                      { id: 'highLatency', label: 'Высокая задержка (500мс)', desc: 'Все запросы будут медленными' },
                      { id: 'disconnect', label: 'Разрыв соединения', desc: 'WebSocket будет отключён' },
                      { id: 'offline', label: 'Оффлайн режим', desc: 'Все запросы будут падать' },
                    ].map(({ id, label, desc }) => (
                      <div key={id} className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-discord-white text-sm">{label}</div>
                          <div className="text-discord-muted text-xs">{desc}</div>
                        </div>
                        <button onClick={() => {
                          setFeatureFlags(p => ({ ...p, [`net_${id}`]: !p[`net_${id}`] }));
                        }}
                          className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${featureFlags[`net_${id}`] ? 'bg-red-500' : 'bg-discord-light/30'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${featureFlags[`net_${id}`] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === FEATURES === */}
            {activeSection === 'features' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Zap size={20} className="text-yellow-400" /> Фичи и эксперименты
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Feature Flags</h4>
                  <div className="space-y-2">
                    {[
                      { id: 'voice_calls', label: 'Голосовые звонки', desc: 'WebRTC звонки между пользователями' },
                      { id: 'screen_share', label: 'Демонстрация экрана', desc: 'Совместный просмотр экрана' },
                      { id: 'threads', label: 'Треды', desc: 'Вложенные обсуждения в каналах' },
                      { id: 'forums', label: 'Форумы', desc: 'Посты и обсуждения' },
                      { id: 'events', label: 'Мероприятия', desc: 'Создание и управление событиями' },
                      { id: 'casino', label: 'Казино', desc: 'Мини-игры и ставки' },
                      { id: 'shop', label: 'Магазин', desc: 'Покупка кастомных эмодзи' },
                      { id: 'subscriptions', label: 'Подписки', desc: 'Платные подписки' },
                      { id: 'sound_effects', label: 'Звуковые эффекты', desc: 'Звуки при действиях' },
                      { id: 'notifications_v2', label: 'Уведомления v2', desc: 'Улучшенные уведомления' },
                      { id: 'dark_mode', label: 'Тёмная тема', desc: 'Тёмная тема оформления' },
                      { id: 'custom_emoji', label: 'Кастомные эмодзи', desc: 'Свои эмодзи в сообщениях' },
                    ].map(({ id, label, desc }) => (
                      <div key={id} className="flex items-center justify-between py-2.5 border-b border-discord-light/5">
                        <div>
                          <div className="text-discord-white text-sm">{label}</div>
                          <div className="text-discord-muted text-xs">{desc}</div>
                        </div>
                        <button onClick={() => setFeatureFlags(p => ({ ...p, [id]: !p[id] }))}
                          className={`w-11 h-6 rounded-full transition-colors ${featureFlags[id] ? 'bg-green-500' : 'bg-discord-light/30'}`}>
                          <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform shadow ${featureFlags[id] ? 'translate-x-6' : 'translate-x-1'}`}
                            style={{ width: 18, height: 18, marginTop: 2 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Активные фичи</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(featureFlags).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">{k}</span>
                    ))}
                    {Object.values(featureFlags).every(v => !v) && (
                      <span className="text-discord-muted text-xs">Нет активных фич</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* === TOOLS === */}
            {activeSection === 'tools' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Settings size={20} className="text-discord-gray" /> Инструменты
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Генерация тестовых данных</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Случайный пользователь', fn: () => {
                        const names = ['AlphaWolf', 'CyberNinja', 'PixelMaster', 'DarkKnight', 'NeonGlow', 'StormChaser', 'IceBreaker', 'FireDancer'];
                        const name = names[Math.floor(Math.random() * names.length)];
                        const id = Math.floor(Math.random() * 999999);
                        console.log(`[DEV] Test user: ${name} (ID: ${id})`);
                        alert(`Пользователь: ${name}\nID: ${id}`);
                      }},
                      { label: 'Случайное сообщение', fn: () => {
                        const msgs = ['Привет всем!', 'Кто хочет поиграть?', 'Отличная музыка!', 'Посмотрите этот мем', 'GG WP!', 'Спасибо за помощь', 'Новый сервер огонь!', 'Когда обновление?'];
                        console.log(`[DEV] Test message: ${msgs[Math.floor(Math.random() * msgs.length)]}`);
                        alert(msgs[Math.floor(Math.random() * msgs.length)]);
                      }},
                      { label: 'Заполнить монетами', fn: () => handleAddCoins(99999) },
                      { label: 'Генерировать спам', fn: () => {
                        for (let i = 0; i < 50; i++) console.log(`[DEV SPAM] Message #${i + 1}`);
                      }},
                    ].map(({ label, fn }) => (
                      <button key={label} onClick={fn}
                        className="px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors text-left">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Навигация</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'На главную', fn: () => window.location.href = '/' },
                      { label: 'На сервер', fn: () => window.location.href = '/server/1' },
                      { label: 'На профиль', fn: () => window.location.href = '/settings' },
                      { label: 'Перезагрузить', fn: () => window.location.reload() },
                      { label: 'Очистить кэш', fn: () => { caches.keys().then(n => n.forEach(k => caches.delete(k))); alert('Готово'); } },
                      { label: 'Открыть в новой вкладке', fn: () => window.open(window.location.href, '_blank') },
                    ].map(({ label, fn }) => (
                      <button key={label} onClick={fn}
                        className="px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors text-left">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Опасные зоны</h4>
                  <div className="space-y-2">
                    <button onClick={() => { if (confirm('Точно очистить все данные?')) { localStorage.clear(); alert('Готово'); } }}
                      className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
                      <div className="text-red-400 text-sm font-medium">Очистить все данные</div>
                      <div className="text-discord-muted text-xs mt-0.5">Удалит все данные из localStorage</div>
                    </button>
                    <button onClick={handleResetAll}
                      className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
                      <div className="text-red-400 text-sm font-medium">Сбросить настройки</div>
                      <div className="text-discord-muted text-xs mt-0.5">Вернёт все настройки по умолчанию</div>
                    </button>
                    <button onClick={() => { localStorage.removeItem('discord_token'); window.location.href = '/'; }}
                      className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
                      <div className="text-red-400 text-sm font-medium">Выйти из аккаунта</div>
                      <div className="text-discord-muted text-xs mt-0.5">Вы будете перенаправлены на главную</div>
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">Экспорт / Импорт</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleExportConfig}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                      <Download size={14} /> Экспорт конфига
                    </button>
                    <button onClick={handleImportConfig}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                      <Upload size={14} /> Импорт конфига
                    </button>
                    <button onClick={() => {
                      const data = JSON.stringify({ logs: logs.slice(-50), featureFlags, theme, soundVolume, isMuted }, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = 'dev-debug-export.json';
                      a.click();
                    }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                      <FileJson size={14} /> Экспорт логов
                    </button>
                    <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(user, null, 2))}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                      <Copy size={14} /> Копировать user JSON
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Phone = (props) => (
  <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

export default DeveloperMode;
