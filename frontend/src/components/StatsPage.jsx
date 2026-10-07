import React, { useState, useEffect } from 'react';
import { X, Trophy, MessageCircle, Users, Coins, Gamepad2, Medal, Crown, Flame, TrendingUp, Award } from 'lucide-react';
import { apiGet } from '../utils/api';

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];
const MEDAL_ICONS = ['🥇', '🥈', '🥉'];
const RARITY_COLORS = { secret: '#a855f7', legendary: '#ef4444', epic: '#8b5cf6', rare: '#3b82f6', common: '#6b7280', admin: '#f59e0b' };
const RARITY_LABELS = { secret: 'Секретный', legendary: 'Легендарный', epic: 'Эпический', rare: 'Редкий', common: 'Обычный', admin: 'Админ' };

export default function StatsPage({ onClose, onOpenProfile }) {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [tab, setTab] = useState('stats');
  const [lbTab, setLbTab] = useState('coins');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([apiGet('/api/auth/stats'), apiGet('/api/auth/leaderboard')]);
        setStats(s);
        setLeaderboard(l);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const StatCard = ({ icon: Icon, label, value, color = 'text-discord-white', sub }) => (
    <div className="bg-discord-darker/50 rounded-xl p-4 border border-discord-light/10 hover:border-discord-accent/30 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-discord-muted font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-discord-muted mt-1">{sub}</p>}
    </div>
  );

  const LbUser = ({ item, rank, field, format }) => (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${rank <= 3 ? 'bg-discord-accent/5 border border-discord-accent/10' : 'hover:bg-discord-light/10'} transition-all cursor-pointer`}
      onClick={() => item.id && onOpenProfile?.(item.id)}>
      <span className={`text-lg w-8 text-center font-bold ${rank <= 3 ? MEDAL_COLORS[rank - 1] : 'text-discord-muted'}`}>
        {rank <= 3 ? MEDAL_ICONS[rank - 1] : `#${rank}`}
      </span>
      <div className="w-8 h-8 rounded-full bg-discord-accent/20 flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0">
        {item.avatar ? <img src={item.avatar} alt="" className="w-full h-full object-cover" /> : item.username?.[0]?.toUpperCase() || '?'}
      </div>
      <span className="flex-1 text-sm text-discord-white font-medium truncate">{item.username}</span>
      <span className="text-sm font-bold text-discord-yellow">{format ? format(item[field]) : item[field]}</span>
    </div>
  );

  if (loading) return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-discord-white animate-pulse text-lg">Загрузка...</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-discord-mid rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl border border-discord-light/20 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 via-purple-500/20 to-pink-500/20 px-6 py-4 flex items-center justify-between border-b border-discord-light/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-blue-400" />
            <h2 className="text-lg font-bold text-discord-white">Статистика и Рейтинги</h2>
          </div>
          <button onClick={onClose} className="text-discord-gray hover:text-discord-accent transition-colors"><X size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-discord-light/20 flex-shrink-0">
          {[['stats', 'Моя статистика', TrendingUp], ['leaderboard', 'Рейтинги', Trophy]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${tab === id ? 'text-discord-white border-b-2 border-discord-accent bg-discord-accent/5' : 'text-discord-muted hover:text-discord-gray'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'stats' && stats && (
            <div className="space-y-6">
              {/* User info */}
              <div className="flex items-center gap-4 bg-discord-darker/50 rounded-xl p-4 border border-discord-light/10">
                <div className="w-16 h-16 rounded-full bg-discord-accent/20 flex items-center justify-center text-2xl font-bold text-white overflow-hidden flex-shrink-0"
                  style={{ border: stats.user?.profile_border ? `3px solid ${stats.user.profile_border}` : 'none' }}>
                  {stats.user?.avatar ? <img src={stats.user.avatar} alt="" className="w-full h-full object-cover" /> : stats.user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-xl font-bold text-discord-white">{stats.user?.username}</p>
                  <p className="text-sm text-discord-muted">{stats.user?.role_name} • Аккаунт: {stats.stats?.account_age_days} дн.</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 font-bold">
                      ⚡ Ур. {stats.user?.level || 1}
                    </span>
                    <span className="text-[10px] text-discord-muted">{stats.user?.xp || 0} XP</span>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard icon={MessageCircle} label="Сообщений" value={stats.stats?.messages} color="text-blue-400" />
                <StatCard icon={Users} label="Друзей" value={stats.stats?.friends} color="text-green-400" />
                <StatCard icon={Coins} label="Монет" value={stats.user?.coins || 0} color="text-yellow-400" />
                <StatCard icon={Trophy} label="Достижений" value={`${stats.stats?.achievements}`} color="text-purple-400" />
                <StatCard icon={Award} label="Эмодзи" value={`${stats.stats?.emojis}`} color="text-pink-400" />
                <StatCard icon={Gamepad2} label="Побед в казино" value={stats.stats?.casino_wins} color="text-orange-400" sub={`Серия: ${stats.stats?.casino_streak}`} />
                <StatCard icon={Flame} label="Бонусов получено" value={stats.stats?.daily_claimed} color="text-red-400" />
                <StatCard icon={Crown} label="Серверов" value={stats.stats?.servers} color="text-discord-accent" />
              </div>

              {/* Rarest emoji */}
              {stats.stats?.equipped_emoji && (
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-xs text-discord-muted mb-2">Экипированный эмодзи</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stats.stats.equipped_emoji.emoji_id}</span>
                    <div>
                      <p className="text-sm font-bold text-discord-white">{stats.stats.equipped_emoji.emoji_id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'leaderboard' && leaderboard && (
            <div className="space-y-4">
              {/* Sub tabs */}
              <div className="flex gap-2">
                {[['coins', 'Монеты', Coins], ['messages', 'Сообщения', MessageCircle], ['casino', 'Казино', Gamepad2], ['achievements', 'Ачивки', Trophy], ['level', 'Уровни', TrendingUp]].map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setLbTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${lbTab === id ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-muted hover:text-discord-gray hover:bg-discord-light/10'}`}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                {lbTab === 'coins' && leaderboard.byCoins?.map((u, i) => <LbUser key={u.id} item={u} rank={i + 1} field="coins" format={v => `${v} 🪙`} />)}
                {lbTab === 'messages' && leaderboard.byMessages?.map((u, i) => <LbUser key={u.id} item={u} rank={i + 1} field="msg_count" format={v => `${v} 📨`} />)}
                {lbTab === 'casino' && leaderboard.byCasino?.map((u, i) => <LbUser key={u.id} item={u} rank={i + 1} field="casino_wins" format={v => `${v} 🎰`} />)}
                {lbTab === 'achievements' && leaderboard.byAchievements?.map((u, i) => <LbUser key={u.id} item={u} rank={i + 1} field="achieve_count" format={v => `${v} 🏆`} />)}
                {lbTab === 'level' && leaderboard.byLevel?.map((u, i) => <LbUser key={u.id} item={u} rank={i + 1} field="level" format={v => `⚡ ${v} (${u.xp || 0} XP)`} />)}
              </div>

              {((lbTab === 'coins' && !leaderboard.byCoins?.length) || (lbTab === 'messages' && !leaderboard.byMessages?.length) || (lbTab === 'casino' && !leaderboard.byCasino?.length) || (lbTab === 'achievements' && !leaderboard.byAchievements?.length)) && (
                <div className="text-center py-8 text-discord-muted text-sm">Пока нет данных</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
