import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
import { useI18n } from '../i18n/I18nContext';

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

const AdminUserRow = ({ u, onRole, onSetCoins, onImpersonate, onDelete, currentUserId }) => {
  const { t } = useI18n();
  const [coins, setCoins] = useState(u.coins || 0);
  useEffect(() => { setCoins(u.coins || 0); }, [u.coins]);
  const roleColors = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    moderator: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    user: 'bg-discord-light/20 text-discord-gray border-discord-light/30',
  };
  const roleLabels = { admin: 'Админ', moderator: 'Модер', user: 'Юзер' };
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-discord-dark border border-discord-light/10">
      <div className="w-8 h-8 rounded-full bg-discord-blurple/30 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.username?.[0]?.toUpperCase() || 'U')}
      </div>
      <div className="min-w-[150px] mr-auto">
        <div className="text-discord-white text-sm font-medium truncate">{u.username}<span className="text-discord-muted">#{u.tag}</span></div>
        <div className="text-discord-gray text-[11px] truncate">{u.email}</div>
      </div>
      <select value={u.role} onChange={(e) => onRole(u, e.target.value)}
        className={`text-xs rounded-lg px-2 py-1 border bg-discord-darker focus:outline-none ${roleColors[u.role] || roleColors.user}`}>
        <option value="user">{t('Юзер')}</option>
        <option value="moderator">{t('Модератор')}</option>
        <option value="admin">{t('Админ')}</option>
      </select>
      <div className="flex items-center gap-1">
        <input type="number" value={coins} onChange={(e) => setCoins(parseInt(e.target.value, 10) || 0)}
          className="w-24 bg-discord-light/10 border border-discord-light/20 rounded-lg px-2 py-1 text-discord-white text-xs focus:outline-none focus:border-discord-blurple" />
        <button onClick={() => onSetCoins(u, coins)}
          className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs transition-colors">
          <Save size={12} />
        </button>
      </div>
      <button onClick={() => onImpersonate(u)}
        className="px-2.5 py-1 bg-discord-blurple/20 hover:bg-discord-blurple/40 text-discord-blurple rounded-lg text-xs transition-colors">
        {t('Войти')}
      </button>
      <button onClick={() => onDelete(u)} disabled={u.id === currentUserId}
        className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <Trash2 size={12} />
      </button>
    </div>
  );
};

const DeveloperMode = ({ user, onClose }) => {
  const { switchAccount } = useAuth();
  const { t } = useI18n();
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
  const [statusText, setStatusText] = useState(() => localStorage.getItem('devStatus') || t('В сети'));
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
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
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
        } catch { alert(t('Ошибка импорта')); }
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
    setStatusText(t('В сети'));
    setFeatureFlags({});
  };

  const handleClearStorage = () => {
    if (confirm(t('Очистить всё localStorage?'))) {
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
    { id: 'debug', label: t('Отладка'), icon: Bug },
    { id: 'console', label: t('Консоль'), icon: Terminal },
    { id: 'api', label: t('API Тестер'), icon: Send },
    { id: 'storage', label: t('Хранилище'), icon: Database },
    { id: 'sounds', label: t('Звуки'), icon: Volume2 },
    { id: 'theme', label: t('Тема и стиль'), icon: Palette },
    { id: 'user', label: t('Пользователь'), icon: User },
    { id: 'server', label: t('Сервер'), icon: Globe },
    { id: 'network', label: t('Сеть'), icon: Wifi },
    { id: 'features', label: t('Фичи'), icon: Zap },
    { id: 'tools', label: t('Инструменты'), icon: Settings },
    ...(user?.role === 'admin' ? [{ id: 'users', label: t('Пользователи'), icon: Users }] : []),
  ];

  const adminHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const loadAdminUsers = async (search = adminSearch) => {
    setAdminLoading(true);
    setAdminMsg('');
    try {
      const res = await fetch(`/api/auth/admin/users?search=${encodeURIComponent(search)}`, { headers: adminHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('Ошибка'));
      setAdminUsers(data.users || []);
    } catch (e) {
      setAdminMsg(t('Ошибка:') + ' ' + e.message);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'users') loadAdminUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const adminSetRole = async (u, role) => {
    try {
      const res = await fetch('/api/auth/admin/set-role', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ userId: u.id, role }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('Ошибка'));
      setAdminUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
        setAdminMsg(t('Роль {name} → {role}', { name: u.username, role }));
    } catch (e) { setAdminMsg(t('Ошибка:') + ' ' + e.message); }
  };

  const adminSetCoins = async (u, coins) => {
    try {
      const res = await fetch('/api/auth/admin/set-coins', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ userId: u.id, coins }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('Ошибка'));
      setAdminUsers(prev => prev.map(x => x.id === u.id ? { ...x, coins: data.coins } : x));
        setAdminMsg(t('Монеты {name} → {coins}', { name: u.username, coins: data.coins }));
    } catch (e) { setAdminMsg(t('Ошибка:') + ' ' + e.message); }
  };

  const adminDeleteUser = async (u) => {
      if (!window.confirm(t('Удалить пользователя {name}#{tag}? Это необратимо.', { name: u.username, tag: u.tag }))) return;
    try {
      const res = await fetch('/api/auth/admin/delete-user', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ userId: u.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('Ошибка'));
      setAdminUsers(prev => prev.filter(x => x.id !== u.id));
      setAdminMsg(t('Пользователь {name} удалён', { name: u.username }));
    } catch (e) { setAdminMsg(t('Ошибка:') + ' ' + e.message); }
  };

  const adminImpersonate = async (u) => {
        if (!window.confirm(t('Войти в аккаунт {name}#{tag}?', { name: u.username, tag: u.tag }))) return;
    try {
      const res = await fetch('/api/auth/admin/impersonate', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ userId: u.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('Ошибка'));
      localStorage.setItem('adminReturnToken', localStorage.getItem('token'));
      localStorage.setItem('adminReturnName', user?.username || 'admin');
      localStorage.setItem('adminReturnId', user?.id || '');
      switchAccount(data.token);
      onClose();
    } catch (e) { setAdminMsg(t('Ошибка:') + ' ' + e.message); }
  };

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
              <Download size={12} /> {t('Экспорт')}
            </button>
            <button onClick={handleImportConfig}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-discord-gray hover:text-discord-white hover:bg-discord-light/10 text-xs">
              <Upload size={12} /> {t('Импорт')}
            </button>
            <button onClick={handleResetAll}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
              <RotateCcw size={12} /> {t('Сбросить всё')}
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
                  placeholder={t('Поиск по разделу...')}
                  className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg pl-10 pr-4 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
              </div>
            </div>
          )}
          <div className="p-6">

            {/* === DEBUG === */}
            {activeSection === 'debug' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Bug size={20} className="text-green-400" /> {t('Панель отладки')}
                </h3>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'FPS', value: fps, color: fps > 50 ? 'text-green-400' : fps > 30 ? 'text-yellow-400' : 'text-red-400', icon: Activity },
                    { label: t('Память'), value: `${memoryUsage}MB`, color: 'text-discord-white', icon: HardDrive },
                    { label: t('Пинг'), value: `${networkLatency}ms`, color: networkLatency < 20 ? 'text-green-400' : 'text-yellow-400', icon: Wifi },
                    { label: t('Аптайм'), value: formatUptime(uptime), color: 'text-discord-blurple', icon: Clock },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-discord-darker rounded-xl p-3 border border-discord-light/10">
                      <div className="flex items-center gap-1.5 text-discord-gray text-xs mb-1"><Icon size={12} />{label}</div>
                      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: t('Разрешение'), value: `${window.innerWidth}x${window.innerHeight}` },
        { label: t('Отправлено'), value: t('{count} пакетов', { count: packetsSent }) },
        { label: t('Получено'), value: t('{count} пакетов', { count: packetsReceived }) },
                    { label: t('Ошибки'), value: errors, color: errors > 0 ? 'text-red-400' : 'text-green-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-discord-darker rounded-xl p-3 border border-discord-light/10">
                      <div className="text-discord-gray text-xs mb-1">{label}</div>
                      <div className={`text-sm font-bold font-mono ${color || 'text-discord-white'}`}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2"><Terminal size={16} /> {t('Состояние')}</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm font-mono">
                    {[
                      ['User ID', user?.id, 'text-discord-accent'],
                      ['Username', user?.username, 'text-discord-white'],
                      ['Role', user?.role, 'text-discord-blurple'],
                      ['Coins', user?.coins, 'text-yellow-400'],
                      ['Subscription', user?.subscriptionTier, 'text-green-400'],
                      ['Theme', theme, 'text-cyan-400'],
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
                  <h4 className="text-discord-white font-semibold mb-3 flex items-center gap-2"><Code size={16} /> {t('Быстрые действия')}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: t('JSON пользователя'), fn: () => alert(JSON.stringify(user, null, 2)) },
                      { label: 'Console.log', fn: () => console.log('[DEV]', { user, theme, soundVolume, fps, memoryUsage }) },
                      { label: t('Тест ошибки'), fn: () => { try { null.foo(); } catch(e) { console.error('[DEV TEST]', e.message); } } },
                      { label: t('Тест предупреждения'), fn: () => console.warn('[DEV TEST] Warning message') },
                      { label: t('Перезагрузить страницу'), fn: () => window.location.reload() },
                      { label: t('Очистить кэш'), fn: () => { caches.keys().then(n => n.forEach(k => caches.delete(k))); alert(t('Кэш очищен')); } },
                      { label: t('Показать cookies'), fn: () => alert(document.cookie || t('Нет cookies')) },
                      { label: t('Открыть DevTools'), fn: () => alert('F12 → Console') },
                      { label: t('Скопировать user ID'), fn: () => { navigator.clipboard?.writeText(String(user?.id)); alert(t('Скопировано!')); } },
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
                    <Terminal size={20} className="text-yellow-400" /> {t('Консоль')}
                  </h3>
                  <div className="flex items-center gap-2">
                    {['all', 'log', 'warn', 'error'].map(f => (
                      <button key={f} onClick={() => setLogFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          logFilter === f ? 'bg-discord-blurple text-white' : 'bg-discord-light/10 text-discord-gray hover:text-discord-white'
                        }`}>
                        {f === 'all' ? t('Все') : f.toUpperCase()} {f !== 'all' ? `(${logs.filter(l => l.type === f).length})` : `(${logs.length})`}
                      </button>
                    ))}
                    <button onClick={() => setLogs([])}
                      className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      {t('Очистить')}
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl border border-discord-light/10 max-h-[500px] overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-discord-muted text-sm">{t('Нет логов')}</div>
                  ) : (
                    filteredLogs.map((log, i) => (
                      <div key={i} onClick={() => setSelectedLog(selectedLog === i ? null : i)}
                        className="cursor-pointer hover:bg-discord-light/5">
                        <LogEntry log={log} />
                        {selectedLog === i && (
                          <div className="px-3 py-2 bg-discord-dark/50 text-xs text-discord-gray">
                            <pre className="whitespace-pre-wrap break-all">{log.message}</pre>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(log.message); }}
                              className="mt-1 text-discord-blurple hover:underline">{t('Копировать')}</button>
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
                  <Send size={20} className="text-blue-400" /> {t('API Тестер')}
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
                      {t('Отправить')}
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
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Быстрые запросы')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { method: 'GET', path: '/api/auth/me', label: t('Профиль') },
                      { method: 'GET', path: '/api/servers', label: t('Серверы') },
                      { method: 'GET', path: '/api/friends', label: t('Друзья') },
                      { method: 'GET', path: '/api/dm', label: t('ЛС') },
                      { method: 'POST', path: '/api/auth/update-coins', label: t('Монеты'), body: '{"userId":' + (user?.id || 1) + ',"coins":100}' },
                      { method: 'GET', path: '/api/notifications', label: t('Уведомления') },
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
                    <Database size={20} className="text-orange-400" /> {t('Хранилище')}
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
                      {t('Очистить всё')}
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('Фильтр ключей...')}
                      className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg pl-9 pr-4 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl border border-discord-light/10 max-h-[500px] overflow-y-auto">
                  {filteredStorage.length === 0 ? (
                    <div className="p-8 text-center text-discord-muted text-sm">{t('Хранилище пусто')}</div>
                  ) : (
                    filteredStorage.map(({ key, value }) => (
                      <div key={key} className="flex items-center justify-between px-4 py-2.5 border-b border-discord-light/5 hover:bg-discord-light/5 group">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="text-discord-blurple text-xs font-mono truncate">{key}</div>
                          <div className="text-discord-gray text-xs font-mono truncate mt-0.5">{value?.substring(0, 80)}</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigator.clipboard?.writeText(value || '')}
                            className="p-1 rounded-lg hover:bg-discord-light/20 text-discord-gray hover:text-discord-white">
                            <Copy size={12} />
                          </button>
                          <button onClick={() => handleDeleteStorageKey(key)}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-discord-gray hover:text-red-400">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Добавить запись')}</h4>
                  <div className="flex gap-2">
                    <input id="newKey" placeholder={t('Ключ')} className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                    <input id="newValue" placeholder={t('Значение')} className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                    <button onClick={() => {
                      const k = document.getElementById('newKey')?.value;
                      const v = document.getElementById('newValue')?.value;
                      if (k) { localStorage.setItem(k, v || ''); setLocalStorageData(p => [...p, { key: k, value: v }]); }
                    }} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm">
                      {t('Добавить')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* === SOUNDS === */}
            {activeSection === 'sounds' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Volume2 size={20} className="text-discord-blurple" /> {t('Настройки звука')}
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-discord-white text-sm">{t('Громкость')}</span>
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
                      <span className="text-discord-white text-sm">{isMuted ? t('Звук выключен') : t('Звук включён')}</span>
                    </div>
                    <button onClick={() => setIsMuted(!isMuted)}
                      className={`w-11 h-6 rounded-full transition-colors ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${isMuted ? 'translate-x-1' : 'translate-x-6'}`} />
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Тест звуков')}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'message', label: t('Сообщение'), icon: MessageSquare },
                      { type: 'join', label: t('Вход'), icon: Wifi },
                      { type: 'leave', label: t('Выход'), icon: WifiOff },
                      { type: 'call', label: t('Звонок'), icon: Phone },
                      { type: 'notification', label: t('Уведомление'), icon: Bell },
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
                  <Palette size={20} className="text-cyan-400" /> {t('Тема и стиль')}
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Тема оформления')}</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'dark', label: t('Тёмная'), color: 'bg-gray-800' },
                      { id: 'midnight', label: t('Полночь'), color: 'bg-sky-950' },
                      { id: 'purple', label: t('Фиолетовая'), color: 'bg-sky-900' },
                      { id: 'ocean', label: t('Океан'), color: 'bg-blue-900' },
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
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Размер шрифта:')} {fontSize}px</h4>
                  <input type="range" min="10" max="24" value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-discord-light/20 rounded-lg appearance-none cursor-pointer accent-discord-blurple" />
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Скругление углов:')} {borderRadius}px</h4>
                  <input type="range" min="0" max="24" value={borderRadius}
                    onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                    className="w-full h-2 bg-discord-light/20 rounded-lg appearance-none cursor-pointer accent-discord-blurple" />
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Скорость анимаций:')} {animSpeed}%</h4>
                  <input type="range" min="0" max="300" value={animSpeed}
                    onChange={(e) => setAnimSpeed(parseInt(e.target.value))}
                    className="w-full h-2 bg-discord-light/20 rounded-lg appearance-none cursor-pointer accent-discord-blurple" />
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Кастомный CSS')}</h4>
                  <textarea value={customCss} onChange={(e) => setCustomCss(e.target.value)}
                    placeholder={t('/* Вставьте CSS здесь */&#10;body { font-size: 14px; }')}
                    className="w-full bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-green-400 font-mono text-xs focus:outline-none focus:border-discord-blurple h-32 resize-none" />
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => setCustomCss('')} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30">
                      {t('Очистить CSS')}
                    </button>
                    <span className="text-discord-muted text-xs">{t('CSS применяется мгновенно')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* === USER === */}
            {activeSection === 'user' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <User size={20} className="text-discord-accent" /> {t('Управление пользователем')}
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
                    <CircleDollarSign size={16} className="text-yellow-400" /> {t('Монеты')}
                  </h4>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="number" value={quickCoins} onChange={(e) => setQuickCoins(parseInt(e.target.value) || 0)}
                      className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                    <button onClick={() => handleAddCoins(quickCoins)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors">
                      {t('Добавить')}
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
                    <Shield size={16} className="text-discord-blurple" /> {t('Роль')}
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
                          if (data.success) { console.log(`[DEV] Role changed to: ${role}`); alert(t('Роль изменена на: {role}', { role })); }
                          else { alert(data.error || t('Ошибка')); }
                        } catch (e) { console.error(e); alert(t('Ошибка сети')); }
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
                    <Zap size={16} className="text-yellow-400" /> {t('Подписка')}
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
                          if (data.success) { console.log(`[DEV] Subscription changed to: ${tier}`); alert(t('Подписка изменена на: {tier}', { tier })); }
                          else { alert(data.error || t('Ошибка')); }
                        } catch (e) { console.error(e); alert(t('Ошибка сети')); }
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
                    <Eye size={16} className="text-green-400" /> {t('Статус')}
                  </h4>
                  <div className="flex items-center gap-2 mb-3">
                    <input value={statusText} onChange={(e) => setStatusText(e.target.value)}
                      className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[t('В сети'), t('Не беспокоить'), t('Не активен'), t('Скрытый')].map((s) => (
                      <button key={s} onClick={() => setStatusText(s)}
                        className="px-2 py-1.5 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === USERS (ADMIN) === */}
            {activeSection === 'users' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Users size={20} className="text-discord-accent" /> {t('Управление пользователями')}
                </h3>

                <div className="flex items-center gap-2">
                  <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadAdminUsers(adminSearch); }}
                    placeholder={t('Поиск по нику, email, тегу или ID...')}
                    className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-4 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple" />
                  <button onClick={() => loadAdminUsers(adminSearch)} disabled={adminLoading}
                    className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
                    {adminLoading ? t('Поиск...') : t('Найти')}
                  </button>
                  <button onClick={() => loadAdminUsers('')} disabled={adminLoading}
                    className="px-4 py-2 bg-discord-light/10 hover:bg-discord-light/20 text-discord-gray rounded-lg text-sm transition-colors disabled:opacity-50">
                    <RefreshCw size={14} />
                  </button>
                </div>

                {adminMsg && (
                  <div className="px-3 py-2 bg-discord-blurple/10 border border-discord-blurple/20 rounded-lg text-discord-white text-xs">
                    {adminMsg}
                  </div>
                )}

                <div className="space-y-2">
                  {adminUsers.length === 0 && !adminLoading && (
                    <div className="text-center text-discord-muted text-sm py-8">{t('Пользователи не найдены')}</div>
                  )}
                  {adminUsers.map((u) => (
                    <AdminUserRow key={u.id} u={u} currentUserId={user?.id}
                      onRole={adminSetRole} onSetCoins={adminSetCoins}
                      onImpersonate={adminImpersonate} onDelete={adminDeleteUser} />
                  ))}
                </div>

                <div className="text-discord-muted text-xs">
                  {t('Всего')}: {adminUsers.length}. {t('Пароли не отображаются.')}
                </div>
              </div>
            )}

            {/* === SERVER === */}
            {activeSection === 'server' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Globe size={20} className="text-green-400" /> {t('Настройки сервера')}
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Конечная точка API')}</h4>
                  <div className="flex items-center gap-2">
                    <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                      className="flex-1 bg-discord-light/10 border border-discord-light/20 rounded-lg px-3 py-2 text-discord-white font-mono text-sm focus:outline-none focus:border-discord-blurple" />
                    <button onClick={() => { localStorage.setItem('devApiUrl', apiUrl); alert(t('API URL сохранён: {url}', { url: apiUrl })); }}
                      className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-lg text-sm transition-colors">
                      {t('Применить')}
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Режим работы')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: t('Онлайн'), icon: Wifi, color: 'text-green-400', bg: 'bg-green-500/10' },
                      { label: t('Не беспокоить'), icon: BellOff, color: 'text-red-400', bg: 'bg-red-500/10' },
                      { label: t('Невидимка'), icon: Eye, color: 'text-discord-gray', bg: 'bg-discord-light/10' },
                      { label: t('Офлайн'), icon: WifiOff, color: 'text-discord-gray', bg: 'bg-discord-light/10' },
                    ].map(({ label, icon: Icon, color, bg }) => (
                      <button key={label} onClick={() => { setStatusText(label); alert(t('Статус: {status}', { status: label })); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${bg} hover:bg-discord-light/20 transition-colors cursor-pointer`}>
                        <Icon size={16} className={color} />
                        <span className="text-discord-white text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Информация о приложении')}</h4>
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
                      ['Cookies', document.cookie ? t('Есть') : t('Нет')],
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
                  <Wifi size={20} className="text-blue-400" /> {t('Сеть и соединение')}
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                    <div className="text-discord-gray text-xs mb-1">{t('Пинг')}</div>
                    <div className={`text-2xl font-bold font-mono ${networkLatency < 20 ? 'text-green-400' : networkLatency < 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {networkLatency}ms
                    </div>
                  </div>
                  <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                    <div className="text-discord-gray text-xs mb-1">{t('Отправлено')}</div>
                    <div className="text-2xl font-bold font-mono text-discord-white">{packetsSent}</div>
                  </div>
                  <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                    <div className="text-discord-gray text-xs mb-1">{t('Получено')}</div>
                    <div className="text-2xl font-bold font-mono text-discord-white">{packetsReceived}</div>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-discord-white text-sm">WebSocket</span>
                    <span className="flex items-center gap-1.5 text-green-400 text-xs">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      {t('Подключено')}
                    </span>
                  </div>
                  <div className="text-xs text-discord-gray font-mono">ws://localhost:5000/ws</div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Симуляция проблем')}</h4>
                  <div className="space-y-2">
                    {[
                      { id: 'packetLoss', label: t('Потеря пакетов (5%)'), desc: t('Случайные пакеты будут теряться') },
                      { id: 'highLatency', label: t('Высокая задержка (500мс)'), desc: t('Все запросы будут медленными') },
                      { id: 'disconnect', label: t('Разрыв соединения'), desc: t('WebSocket будет отключён') },
                      { id: 'offline', label: t('Оффлайн режим'), desc: t('Все запросы будут падать') },
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
                  <Zap size={20} className="text-yellow-400" /> {t('Фичи и эксперименты')}
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Флаги функций')}</h4>
                  <div className="space-y-2">
                    {[
                      { id: 'voice_calls', label: t('Голосовые звонки'), desc: t('WebRTC звонки между пользователями') },
                      { id: 'screen_share', label: t('Демонстрация экрана'), desc: t('Совместный просмотр экрана') },
                      { id: 'threads', label: t('Треды'), desc: t('Вложенные обсуждения в каналах') },
                      { id: 'forums', label: t('Форумы'), desc: t('Посты и обсуждения') },
                      { id: 'events', label: t('Мероприятия'), desc: t('Создание и управление событиями') },
                      { id: 'casino', label: t('Казино'), desc: t('Мини-игры и ставки') },
                      { id: 'shop', label: t('Магазин'), desc: t('Покупка кастомных эмодзи') },
                      { id: 'subscriptions', label: t('Подписки'), desc: t('Платные подписки') },
                      { id: 'sound_effects', label: t('Звуковые эффекты'), desc: t('Звуки при действиях') },
                      { id: 'notifications_v2', label: t('Уведомления v2'), desc: t('Улучшенные уведомления') },
                      { id: 'dark_mode', label: t('Тёмная тема'), desc: t('Тёмная тема оформления') },
                      { id: 'custom_emoji', label: t('Кастомные эмодзи'), desc: t('Свои эмодзи в сообщениях') },
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
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Активные фичи')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(featureFlags).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs">{k}</span>
                    ))}
                    {Object.values(featureFlags).every(v => !v) && (
                      <span className="text-discord-muted text-xs">{t('Нет активных фич')}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* === TOOLS === */}
            {activeSection === 'tools' && (
              <div className="space-y-4">
                <h3 className="text-discord-white font-bold text-lg flex items-center gap-2">
                  <Settings size={20} className="text-discord-gray" /> {t('Инструменты')}
                </h3>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Генерация тестовых данных')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: t('Случайный пользователь'), fn: () => {
                        const names = ['AlphaWolf', 'CyberNinja', 'PixelMaster', 'DarkKnight', 'NeonGlow', 'StormChaser', 'IceBreaker', 'FireDancer'];
                        const name = names[Math.floor(Math.random() * names.length)];
                        const id = Math.floor(Math.random() * 999999);
                        console.log(`[DEV] Test user: ${name} (ID: ${id})`);
                        alert(t('Пользователь: {name}\nID: {id}', { name, id }));
                      }},
                      { label: t('Случайное сообщение'), fn: () => {
                        const msgs = [t('Привет всем!'), t('Кто хочет поиграть?'), t('Отличная музыка!'), t('Посмотрите этот мем'), 'GG WP!', t('Спасибо за помощь'), t('Новый сервер огонь!'), t('Когда обновление?')];
                        console.log(`[DEV] Test message: ${msgs[Math.floor(Math.random() * msgs.length)]}`);
                        alert(msgs[Math.floor(Math.random() * msgs.length)]);
                      }},
                      { label: t('Заполнить монетами'), fn: () => handleAddCoins(99999) },
                      { label: t('Генерировать спам'), fn: () => {
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
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Навигация')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: t('На главную'), fn: () => window.location.href = '/' },
                      { label: t('На сервер'), fn: () => window.location.href = '/server/1' },
                      { label: t('На профиль'), fn: () => window.location.href = '/settings' },
                      { label: t('Перезагрузить'), fn: () => window.location.reload() },
                      { label: t('Очистить кэш'), fn: () => { caches.keys().then(n => n.forEach(k => caches.delete(k))); alert(t('Готово')); } },
                      { label: t('Открыть в новой вкладке'), fn: () => window.open(window.location.href, '_blank') },
                    ].map(({ label, fn }) => (
                      <button key={label} onClick={fn}
                        className="px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors text-left">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Опасные зоны')}</h4>
                  <div className="space-y-2">
                    <button onClick={() => { if (confirm(t('Точно очистить все данные?'))) { localStorage.clear(); alert(t('Готово')); } }}
                      className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
                      <div className="text-red-400 text-sm font-medium">{t('Очистить все данные')}</div>
                      <div className="text-discord-muted text-xs mt-0.5">{t('Удалит все данные из localStorage')}</div>
                    </button>
                    <button onClick={handleResetAll}
                      className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
                      <div className="text-red-400 text-sm font-medium">{t('Сбросить настройки')}</div>
                      <div className="text-discord-muted text-xs mt-0.5">{t('Вернёт все настройки по умолчанию')}</div>
                    </button>
                    <button onClick={() => { localStorage.removeItem('discord_token'); window.location.href = '/'; }}
                      className="w-full text-left px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
                      <div className="text-red-400 text-sm font-medium">{t('Выйти из аккаунта')}</div>
                      <div className="text-discord-muted text-xs mt-0.5">{t('Вы будете перенаправлены на главную')}</div>
                    </button>
                  </div>
                </div>

                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <h4 className="text-discord-white font-semibold mb-3 text-sm">{t('Экспорт / Импорт')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleExportConfig}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                      <Download size={14} /> {t('Экспорт конфига')}
                    </button>
                    <button onClick={handleImportConfig}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                      <Upload size={14} /> {t('Импорт конфига')}
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
                      <FileJson size={14} /> {t('Экспорт логов')}
                    </button>
                    <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(user, null, 2))}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-discord-light/10 hover:bg-discord-light/20 rounded-lg text-discord-white text-xs transition-colors">
                      <Copy size={14} /> {t('Копировать user JSON')}
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
