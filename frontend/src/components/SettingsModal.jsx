import React, { useState } from 'react';
import { X, LogOut, Shield, Eye, MessageCircle, UserPlus, Lock, Sparkles, Globe, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GenerateTab from './GenerateTab';
import { useI18n } from '../i18n/I18nContext';
import { useUISettings, LAYOUTS } from '../contexts/UISettingsContext';

export default function SettingsModal({ user, onClose, onCasinoUnlock }) {
  const { updateUser, logout } = useAuth();
  const { t, lang, setLang, languages } = useI18n();
  const { layout, setLayout } = useUISettings();
  const [username, setUsername] = useState(user?.username || '');
  const [tag, setTag] = useState(user?.tag || '');
  const [status, setStatus] = useState(user?.status || 'online');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [bio, setBio] = useState(user?.profile_bio || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const [allowDm, setAllowDm] = useState(user?.allow_dm ?? 1);
  const [showStatus, setShowStatus] = useState(user?.show_status ?? 1);
  const [allowFriendReq, setAllowFriendReq] = useState(user?.allow_friend_req ?? 1);
  const [require2fa, setRequire2fa] = useState(user?.require_2fa ?? 0);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username, tag, status, custom_status: customStatus, profile_bio: bio,
          allow_dm: allowDm, show_status: showStatus, allow_friend_req: allowFriendReq, require_2fa: require2fa,
        })
      });
      const data = await res.json();
      if (data.id) {
        updateUser(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || t('Ошибка'));
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    setError('');
    if (!currentPassword || !newPassword) return setError(t('Заполните оба поля'));
    if (newPassword !== confirmPassword) return setError(t('Пароли не совпадают'));
    if (newPassword.length < 6) return setError(t('Пароль минимум 6 символов'));
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (data.id) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || t('Ошибка'));
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-discord-mid rounded-2xl w-full max-w-2xl shadow-2xl relative border border-discord-light/20" style={{ height: '75vh' }}>
        <div className="flex h-full rounded-2xl overflow-hidden">
          {/* Sidebar */}
          <div className="w-44 bg-discord-darker p-4 flex flex-col gap-1 flex-shrink-0 border-r border-discord-light/20">
            <h3 className="text-[11px] font-bold text-discord-accent uppercase tracking-wider px-2 mb-2">{t('Мой аккаунт')}</h3>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                activeTab === 'profile' ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-gray hover:text-discord-text hover:bg-discord-light/30'
              }`}
            >
              <Eye size={16} />
              {t('Профиль')}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                activeTab === 'security' ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-gray hover:text-discord-text hover:bg-discord-light/30'
              }`}
            >
              <Shield size={16} />
              {t('Безопасность')}
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                activeTab === 'generate' ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-gray hover:text-discord-text hover:bg-discord-light/30'
              }`}
            >
              <Sparkles size={16} />
              {t('Генерация')}
            </button>
            <button
              onClick={() => setActiveTab('secret')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                activeTab === 'secret' ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-gray hover:text-discord-text hover:bg-discord-light/30'
              }`}
            >
              {t('🔑 Секретный код')}
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                activeTab === 'language' ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-gray hover:text-discord-text hover:bg-discord-light/30'
              }`}
            >
              <Globe size={16} />
              {t('Язык')}
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                activeTab === 'appearance' ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-gray hover:text-discord-text hover:bg-discord-light/30'
              }`}
            >
              <Palette size={16} />
              {t('Оформление')}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-discord-gray hover:text-discord-accent transition-colors z-10"
            >
              <X size={24} />
            </button>

            {error && (
              <div className="mb-4 bg-discord-red/10 border border-discord-red/30 text-discord-red px-4 py-2 rounded-xl text-sm">
                {error}
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-bold text-discord-white mb-6">{t('Настройки пользователя')}</h2>

                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">{t('Тег пользователя')}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-discord-accent text-sm font-bold">#</span>
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => setTag(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4))}
                      maxLength={4}
                      placeholder="e114"
                      className="flex-1 bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 font-mono transition-colors"
                    />
                  </div>
                  <p className="text-xs text-discord-muted mt-1">{t('4 символа: a-z, 0-9. Друзья добавляют вас по этому тегу.')}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">{t('Имя пользователя')}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors"
                  />
                </div>

                <div className="mb-4 p-3 bg-discord-dark rounded-xl border border-discord-light/20">
                  <p className="text-[11px] text-discord-muted mb-2 uppercase tracking-wider font-bold">{t('Предпросмотр:')}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={user?.profile_border ? { border: `3px solid ${user.profile_border}`, boxShadow: `0 0 10px ${user.profile_border}40` } : { border: '3px solid #2f80ed' }}>
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full flex items-center justify-center" style={user?.profile_theme ? { background: user.profile_theme } : { background: 'linear-gradient(135deg, #3b82f6, #22d3ee)' }}>
                          {(username || user?.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={user?.name_color ? (user.name_color.startsWith('linear') ? { background: user.name_color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: user.name_color }) : { color: 'white' }}>
                        {username || 'Username'}
                        <span className="text-discord-muted font-normal text-xs ml-1">#{tag || '????'}</span>
                      </p>
                      <p className="text-xs text-discord-muted">{t('Кастомизации из магазина')}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">{t('Статус')}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors"
                  >
                    <option value="online">{t('В сети')}</option>
                    <option value="idle">{t('Не активен')}</option>
                    <option value="dnd">{t('Не беспокоить')}</option>
                    <option value="offline">{t('Невидимый')}</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">{t('Пользовательский статус')}</label>
                  <input
                    type="text"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    placeholder={t('Чем занимаетесь?')}
                    className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">{t('О себе')}</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('Расскажите о себе...')}
                    maxLength={200}
                    rows={3}
                    className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted resize-none"
                  />
                  <p className="text-xs text-discord-muted mt-1">{bio.length}/200</p>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-discord-red/20 hover:bg-discord-red/30 text-discord-red text-sm font-medium rounded-xl transition-all duration-200 border border-discord-red/30"
                  >
                    <LogOut size={16} />
                    {t('Выйти')}
                  </button>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-discord-gray hover:text-discord-white transition-colors">
                      {t('Отмена')}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-6 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:shadow-lg hover:shadow-discord-blurple/30 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                    >
                      {saved ? t('✓ Сохранено!') : loading ? t('Сохранение...') : t('Сохранить')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-bold text-discord-white mb-6">{t('Безопасность и конфиденциальность')}</h2>

                <div className="space-y-3 mb-8">
                  <div className="bg-discord-dark rounded-xl p-4 border border-discord-light/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageCircle size={18} className="text-discord-accent" />
                        <div>
                          <p className="text-sm font-medium text-discord-white">{t('Личные сообщения')}</p>
                          <p className="text-xs text-discord-muted mt-0.5">{t('Разрешить ЛС от участников серверов')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAllowDm(allowDm ? 0 : 1)}
                        className={`w-12 h-6 rounded-full transition-all duration-200 relative ${allowDm ? 'bg-discord-green shadow-lg shadow-discord-green/30' : 'bg-discord-muted'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${allowDm ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-discord-dark rounded-xl p-4 border border-discord-light/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Eye size={18} className="text-discord-accent" />
                        <div>
                          <p className="text-sm font-medium text-discord-white">{t('Показывать статус')}</p>
                          <p className="text-xs text-discord-muted mt-0.5">{t('Другие видят ваш статус онлайн')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowStatus(showStatus ? 0 : 1)}
                        className={`w-12 h-6 rounded-full transition-all duration-200 relative ${showStatus ? 'bg-discord-green shadow-lg shadow-discord-green/30' : 'bg-discord-muted'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${showStatus ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-discord-dark rounded-xl p-4 border border-discord-light/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserPlus size={18} className="text-discord-accent" />
                        <div>
                          <p className="text-sm font-medium text-discord-white">{t('Заявки в друзья')}</p>
                          <p className="text-xs text-discord-muted mt-0.5">{t('Разрешить отправку заявок в друзья')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAllowFriendReq(allowFriendReq ? 0 : 1)}
                        className={`w-12 h-6 rounded-full transition-all duration-200 relative ${allowFriendReq ? 'bg-discord-green shadow-lg shadow-discord-green/30' : 'bg-discord-muted'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${allowFriendReq ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-discord-dark rounded-xl p-4 border border-discord-light/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield size={18} className="text-discord-accent" />
                        <div>
                          <p className="text-sm font-medium text-discord-white">{t('Двухфакторная аутентификация')}</p>
                          <p className="text-xs text-discord-muted mt-0.5">{t('Дополнительная защита аккаунта')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setRequire2fa(require2fa ? 0 : 1)}
                        className={`w-12 h-6 rounded-full transition-all duration-200 relative ${require2fa ? 'bg-discord-green shadow-lg shadow-discord-green/30' : 'bg-discord-muted'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 ${require2fa ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password change */}
                <h3 className="text-sm font-bold text-discord-white uppercase mb-4 flex items-center gap-2">
                  <Lock size={16} className="text-discord-accent" />
                  {t('Смена пароля')}
                </h3>
                <div className="space-y-3 mb-6">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('Текущий пароль')}
                    className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text placeholder-discord-muted focus:outline-none focus:border-discord-accent/50 transition-colors"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('Новый пароль')}
                    className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text placeholder-discord-muted focus:outline-none focus:border-discord-accent/50 transition-colors"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('Подтвердите пароль')}
                    className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text placeholder-discord-muted focus:outline-none focus:border-discord-accent/50 transition-colors"
                  />
                  <button
                    onClick={handlePasswordChange}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:shadow-lg hover:shadow-discord-blurple/30 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? t('Сохранение...') : t('Сменить пароль')}
                  </button>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-sm text-discord-gray hover:text-discord-white transition-colors">
                    {t('Отмена')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:shadow-lg hover:shadow-discord-blurple/30 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {saved ? t('✓ Сохранено!') : loading ? t('Сохранение...') : t('Сохранить')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'generate' && (
              <div>
                <h2 className="text-xl font-bold text-discord-white mb-6">{t('AI Генерация изображений')}</h2>
                <p className="text-xs text-discord-muted mb-4">{t('Требуется запущенный Python-сервис Stable Diffusion на порту 8000')}</p>
                <GenerateTab user={user} />
              </div>
            )}

            {activeTab === 'secret' && (
              <SecretCodeTab user={user} onCasinoUnlock={onCasinoUnlock} />
            )}

            {activeTab === 'language' && (
              <div>
                <h2 className="text-xl font-bold text-discord-white mb-2">{t('Язык интерфейса')}</h2>
                <p className="text-sm text-discord-gray mb-6">{t('Выберите язык интерфейса')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors border ${
                        lang === l.code
                          ? 'bg-discord-accent/20 text-discord-accent border-discord-accent/30'
                          : 'bg-discord-dark hover:bg-discord-light/20 text-discord-gray border-discord-light/20'
                      }`}
                    >
                      <span className="text-lg">{l.flag}</span>
                      <span className="truncate">{l.label}</span>
                    </button>
                  ))}
                </div>
                <div className="text-discord-muted text-xs mt-4">
                  {t('Текущий язык')}: {languages.find((l) => l.code === lang)?.label}
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-xl font-bold text-discord-white mb-2">{t('Оформление')}</h2>
                <p className="text-sm text-discord-gray mb-6">{t('Выберите раскладку интерфейса')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LAYOUTS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setLayout(opt.id)}
                      className={`text-left p-4 rounded-xl border transition-colors ${
                        layout === opt.id
                          ? 'bg-discord-accent/20 border-discord-accent/40'
                          : 'bg-discord-dark hover:bg-discord-light/20 border-discord-light/20'
                      }`}
                    >
                      <div className={`text-sm font-semibold mb-1 ${layout === opt.id ? 'text-discord-accent' : 'text-discord-white'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-discord-gray">{t(opt.desc)}</div>
                    </button>
                  ))}
                </div>
                <div className="text-discord-muted text-xs mt-4">
                  {t('Активная раскладка')}: {LAYOUTS.find((l) => l.id === layout)?.label}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecretCodeTab({ user, onCasinoUnlock }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [casinoStatus, setCasinoStatus] = useState(null);
  const { t } = useI18n();

  React.useEffect(() => {
    fetch('/api/auth/casino-status', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(async r => { const t = await r.text(); return t ? JSON.parse(t) : {}; }).then(setCasinoStatus).catch(() => {});
  }, []);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ code: code.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setCode('');
        setCasinoStatus({ unlocked: true });
        if (onCasinoUnlock) onCasinoUnlock();
      } else {
        setError(data.error || t('Ошибка'));
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-discord-white mb-6">{t('Секретный код')}</h2>

      <div className="mb-6">
        <div className="bg-discord-dark/50 border border-discord-light/20 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-discord-yellow to-orange-500 flex items-center justify-center text-lg">🔑</div>
            <div>
              <h3 className="text-sm font-bold text-discord-white">{t('Ввести код')}</h3>
              <p className="text-[11px] text-discord-muted">{t('Введите код')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              placeholder={t('Введите код...')}
              className="flex-1 bg-discord-mid border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50 transition-colors"
            />
            <button
              onClick={handleRedeem}
              disabled={loading || !code.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-discord-blurple to-discord-accent hover:shadow-lg hover:shadow-discord-accent/30 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {loading ? '...' : t('Активировать')}
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-discord-green/10 border border-discord-green/30 text-discord-green px-4 py-3 rounded-xl text-sm mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-discord-red/10 border border-discord-red/30 text-discord-red px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
      </div>

      {casinoStatus && (
        <div className="bg-discord-dark/50 border border-discord-light/20 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-discord-white mb-3">{t('Статус')}</h3>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${casinoStatus.unlocked ? 'bg-discord-green' : 'bg-discord-red'}`} />
            <span className="text-sm text-discord-text">
              {casinoStatus.unlocked ? t('🎰 Казино разблокировано!') : t('Казино заблокировано')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
