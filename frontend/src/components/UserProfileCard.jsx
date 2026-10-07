import React, { useState, useEffect } from 'react';
import { X, MessageCircle, UserPlus, UserMinus } from 'lucide-react';

const RARITY_STYLES = {
  common: { label: 'Обычный', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  rare: { label: 'Редкий', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  epic: { label: 'Эпический', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  legendary: { label: 'Легендарный', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  secret: { label: 'Секретный', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  admin: { label: 'Админ', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

export default function UserProfileCard({ userId, onClose, onMessage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [equippedEmoji, setEquippedEmoji] = useState([]);

  useEffect(() => {
    loadProfile();
    loadCollection();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/auth/profile/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.id) setProfile(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadCollection = async () => {
    try {
      const res = await fetch(`/api/collection/profile/${userId}`);
      const data = await res.json();
      if (data.equipped) setEquippedEmoji(data.equipped);
    } catch (err) {}
  };

  const handleFriendAction = async () => {
    if (!profile) return;
    if (profile.friendship) {
      await fetch(`/api/auth/friends/${profile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } else {
      await fetch(`/api/auth/friends/${profile.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    }
    loadProfile();
  };

  const statusColors = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    dnd: 'bg-red-500',
    offline: 'bg-gray-500',
  };

  const statusLabels = {
    online: 'В сети',
    idle: 'Не активен',
    dnd: 'Не беспокоить',
    offline: 'Не в сети',
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-discord-darker border border-discord-light/20 rounded-2xl w-80 p-6 text-center" onClick={e => e.stopPropagation()}>
          <div className="text-discord-muted">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const themeStyle = profile.profile_theme ? { background: profile.profile_theme } : { background: 'linear-gradient(135deg, #6c5ce7, #a855f7)' };
  const hasBorder = !!profile.profile_border;
  const borderStyle = hasBorder ? { border: `4px solid ${profile.profile_border}`, boxShadow: `0 0 16px ${profile.profile_border}55` } : {};
  const nameStyle = profile.name_color ? (profile.name_color.startsWith('linear') ? { background: profile.name_color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : { color: profile.name_color }) : { color: 'white' };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-discord-darker border border-discord-light/20 rounded-2xl w-80 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Banner */}
        <div className="h-16 relative" style={themeStyle}>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-10 relative">
          <div className="w-20 h-20 rounded-full bg-discord-blurple border-4 border-discord-darkest flex items-center justify-center text-white text-2xl font-bold" style={borderStyle}>
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold" style={nameStyle}>{profile.username}</h3>
            <span className="text-discord-muted text-sm">#{profile.tag}</span>
            {profile.level >= 2 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border"
                style={{
                  backgroundColor: profile.level >= 50 ? 'rgba(245,158,11,0.15)' : profile.level >= 25 ? 'rgba(139,92,246,0.15)' : profile.level >= 10 ? 'rgba(59,130,246,0.15)' : 'rgba(107,114,128,0.15)',
                  borderColor: profile.level >= 50 ? 'rgba(245,158,11,0.3)' : profile.level >= 25 ? 'rgba(139,92,246,0.3)' : profile.level >= 10 ? 'rgba(59,130,246,0.3)' : 'rgba(107,114,128,0.3)',
                  color: profile.level >= 50 ? '#f59e0b' : profile.level >= 25 ? '#8b5cf6' : profile.level >= 10 ? '#3b82f6' : '#9ca3af',
                }}>
                ⚡ Lvl {profile.level}
              </span>
            )}
            {profile.subscription === 'privet' && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-[10px] font-bold shadow-lg shadow-blue-500/30">PRIVET</span>
            )}
            {profile.subscription === 'privet_plus' && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold shadow-lg shadow-purple-500/30">PRIVET+</span>
            )}
            {profile.subscription === 'sosiska' && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold shadow-lg shadow-orange-500/30">🌭 СОСИСКА</span>
            )}
          </div>

          {equippedEmoji.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              {equippedEmoji.map((e, i) => {
                const rarity = RARITY_STYLES[e.rarity] || RARITY_STYLES.common;
                return (
                  <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg ${rarity.bg} border ${rarity.border}`} title={`${e.name} — ${rarity.label}`}>
                    <span className="text-lg">{e.emoji}</span>
                    <span className={`text-[10px] font-bold ${rarity.color}`}>{rarity.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${statusColors[profile.status] || 'bg-gray-500'}`} />
            <span className="text-sm text-discord-gray">{statusLabels[profile.status] || 'Неизвестно'}</span>
          </div>

          {profile.custom_status && (
            <p className="text-sm text-discord-text mb-3">{profile.custom_status}</p>
          )}

          {profile.profile_bio && (
            <p className="text-xs text-discord-gray mb-3 italic">"{profile.profile_bio}"</p>
          )}

          {equippedEmoji.length > 0 && (
            <div className="mb-3 bg-discord-dark/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-[10px] text-discord-muted mb-1">Коллекция</div>
              <div className="flex items-center gap-1 flex-wrap">
                {equippedEmoji.map((e, i) => {
                  const rarity = RARITY_STYLES[e.rarity] || RARITY_STYLES.common;
                  return (
                    <div key={i} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${rarity.bg} border ${rarity.border}`}>
                      <span className="text-sm">{e.emoji}</span>
                      <span className={`text-[9px] font-bold ${rarity.color}`}>
                        {rarity.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {profile.mutualServers?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-discord-gray uppercase mb-1">Общие серверы</p>
              <div className="flex gap-1">
                {profile.mutualServers.map(s => (
                  <div key={s.id} className="w-8 h-8 rounded-full bg-discord-light flex items-center justify-center text-xs text-white font-bold" title={s.name}>
                    {s.icon || s.name[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-discord-muted mb-4">
            Участник с {new Date(profile.created_at + 'Z').toLocaleDateString('ru-RU')}
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onMessage?.(profile.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-discord-light hover:bg-discord-lighter rounded text-sm text-discord-text transition-colors"
            >
              <MessageCircle size={16} />
              Написать
            </button>
            <button
              onClick={handleFriendAction}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white transition-all shadow-lg ${
                profile.friendship === 'accepted'
                  ? 'bg-discord-red hover:opacity-90'
                  : profile.friendship === 'pending'
                  ? 'bg-discord-yellow hover:opacity-90'
                  : 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90'
              }`}
            >
              {profile.friendship === 'accepted' ? (
                <><UserMinus size={16} /> Удалить из друзей</>
              ) : profile.friendship === 'pending' ? (
                'Заявка отправлена'
              ) : (
                <><UserPlus size={16} /> Добавить в друзья</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
