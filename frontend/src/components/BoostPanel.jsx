import React, { useState, useEffect } from 'react';
import { X, Zap, Users, Clock, Coins } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

const TIER_COLORS = ['', '#3b82f6', '#8b5cf6', '#f59e0b'];
const TIER_NAMES = ['Нет буста', 'Базовый', 'Продвинутый', 'Максимальный'];
const TIER_ICONS = ['', '⭐', '🌟', '💫'];

export default function BoostPanel({ serverId, onClose, user }) {
  const [boosts, setBoosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [tier, setTier] = useState(0);
  const [myBoost, setMyBoost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const load = async () => {
    try {
      const [bData, myData] = await Promise.all([
        apiGet(`/api/boosts/server/${serverId}`),
        apiGet(`/api/boosts/server/${serverId}/me`).catch(() => ({ boost: null })),
      ]);
      setBoosts(bData.boosts || []);
      setTotal(bData.total || 0);
      setTier(bData.tier || 0);
      setMyBoost(myData.boost || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [serverId]);

  const handleBuy = async (tierNum) => {
    if (buying) return;
    setBuying(true);
    try {
      const res = await apiPost(`/api/boosts/server/${serverId}`, { tier: tierNum });
      if (res.success) {
        await load();
      } else {
        alert(res.error || 'Ошибка');
      }
    } catch (e) { alert('Ошибка сервера'); }
    setBuying(false);
  };

  const tiers = [
    { tier: 1, name: 'Базовый', cost: 500, days: 7, color: '#3b82f6', icon: '⭐', perks: ['+10% монет за сообщения', 'Буст-значок'] },
    { tier: 2, name: 'Продвинутый', cost: 1500, days: 14, color: '#8b5cf6', icon: '🌟', perks: ['+25% монет', 'Буст-значок', 'Приоритет в голосовых'] },
    { tier: 3, name: 'Максимальный', cost: 3000, days: 30, color: '#f59e0b', icon: '💫', perks: ['+50% монет', 'Буст-значок', 'Приоритет', 'Эксклюзивный эмодзи'] },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-discord-mid rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl border border-discord-light/20 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-discord-light/20 flex-shrink-0"
          style={{ background: tier >= 3 ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))' : tier >= 2 ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))' : tier >= 1 ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.15))' : 'rgba(0,0,0,0.2)' }}>
          <div className="flex items-center gap-3">
            <Zap size={24} style={{ color: tier >= 3 ? '#f59e0b' : tier >= 2 ? '#8b5cf6' : tier >= 1 ? '#3b82f6' : '#6b7280' }} />
            <div>
              <h2 className="text-lg font-bold text-discord-white">Буст сервера</h2>
              <p className="text-xs text-discord-muted">
                {total > 0 ? `${TIER_ICONS[tier]} Уровень ${tier}: ${TIER_NAMES[tier]} (${total} буст${total > 1 ? (total < 5 ? 'а' : 'ов') : ''})` : 'Пока нет бустов'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-discord-gray hover:text-discord-accent transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Current boost status */}
          {myBoost && (
            <div className="rounded-xl p-4 border" style={{ backgroundColor: TIER_COLORS[myBoost.tier] + '15', borderColor: TIER_COLORS[myBoost.tier] + '40' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{TIER_ICONS[myBoost.tier]}</span>
                <span className="text-sm font-bold text-discord-white">{TIER_NAMES[myBoost.tier]} буст активен</span>
              </div>
              <p className="text-xs text-discord-muted">
                Истекает: {new Date(myBoost.expires_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}

          {/* Boost tiers */}
          {tiers.map(t => (
            <div key={t.tier} className={`rounded-xl p-4 border transition-all ${myBoost?.tier === t.tier ? 'ring-2' : 'hover:border-discord-accent/30'}`}
              style={{ borderColor: t.color + '40', backgroundColor: t.color + '08', ringColor: t.color }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-discord-white">{t.name}</p>
                    <p className="text-[10px] text-discord-muted">{t.days} дней</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: t.color }}>{t.cost} 🪙</p>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                {t.perks.map((p, i) => (
                  <p key={i} className="text-xs text-discord-gray flex items-center gap-1.5">
                    <span style={{ color: t.color }}>✓</span> {p}
                  </p>
                ))}
              </div>
              <button onClick={() => handleBuy(t.tier)} disabled={buying || (myBoost && myBoost.tier >= t.tier)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                  myBoost && myBoost.tier >= t.tier
                    ? 'bg-discord-gray/10 text-discord-muted cursor-not-allowed'
                    : 'text-white hover:opacity-90'
                }`}
                style={myBoost?.tier >= t.tier ? {} : { backgroundColor: t.color }}>
                {myBoost && myBoost.tier >= t.tier ? 'Текущий/лучше' : `Купить за ${t.cost} 🪙`}
              </button>
            </div>
          ))}

          {/* Boosters list */}
          {boosts.length > 0 && (
            <div>
              <p className="text-xs text-discord-muted font-bold uppercase tracking-wider mb-2">Бустеры сервера</p>
              <div className="space-y-1">
                {boosts.map(b => (
                  <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-discord-darker/50 border border-discord-light/10">
                    <div className="w-6 h-6 rounded-full bg-discord-accent/20 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                      {b.avatar ? <img src={b.avatar} alt="" className="w-full h-full object-cover" /> : b.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-discord-white flex-1">{b.username}</span>
                    <span className="text-xs" style={{ color: TIER_COLORS[b.tier] }}>{TIER_ICONS[b.tier]} {TIER_NAMES[b.tier]}</span>
                    <span className="text-[10px] text-discord-muted">
                      <Clock size={10} className="inline mr-0.5" />
                      {new Date(b.expires_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && !loading && (
            <div className="text-center py-6">
              <p className="text-discord-muted text-sm">Бустите сервер, чтобы получить бонусы!</p>
              <p className="text-discord-muted text-xs mt-1">Бусты помогают серверу расти</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
