import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Trophy, Sparkles, Lock, Check, Eye, EyeOff, Search, User } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

const RARITY_CONFIG = {
  common: { label: 'Обычный', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', glow: '' },
  rare: { label: 'Редкий', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  epic: { label: 'Эпический', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
  legendary: { label: 'Легендарный', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/30' },
  secret: { label: 'Секретный', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', glow: 'shadow-pink-500/30' },
  admin: { label: 'Админ', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-red-500/30' },
};

const HOW_TO = {
  first_message: 'Отправьте любое сообщение в любом канале или ЛС',
  send_100: 'Напишите 100 сообщений суммарно во всех каналах',
  send_1000: 'Напишите 1000 сообщений суммарно',
  win_casino: 'Выиграйте комбинацию 3 одинаковых символов в казино (разблокируйте кодом «777»)',
  win_10_casino: 'Выиграйте 10 раз в казино',
  win_streak_5: 'Выиграйте 5 раз подряд в казино не проиграв ни разу',
  first_friend: 'Добавьте первого друга и дождитесь принятия заявки',
  have_10_friends: 'Имейте 10 принятых заявок в друзья',
  join_server: 'Вступите в любой сервер через «Исследовать» или по ссылке',
  join_5_servers: 'Вступите в 5 разных серверов',
  create_server: 'Создайте свой сервер через кнопку «+» на боковой панели',
  voice_1_hour: 'Проведите 1 час суммарно в голосовых каналах',
  collector_5: 'Соберите 5 эмодзи из коллекции (за другие достижения)',
  collector_10: 'Соберите 10 эмодзи',
  collector_20: 'Соберите 20 эмодзи',
  rich: 'Накопите 10000 монет на балансе',
  reaction_giver: 'Поставьте 50 реакций на сообщения (кликните на эмодзи под сообщением)',
  night_owl: 'Отправьте сообщение после 00:00 (полночь)',
  early_bird: 'Отправьте сообщение до 07:00 утра',
  phoenix_achievement: 'Выиграйте 50 раз в казино — почти невозможно',
  void_achievement: 'Имейте 100 друзей одновременно — нужно пригласить всех',
  time_achievement: 'Ждите 30 дней и напишите 500 сообщений',
  universe_achievement: 'Напишите 10000 сообщений — нужна вечная активность',
  infinity_achievement: 'Соберите ВСЕ эмодзи коллекции — финальный босс',
  admin_role: 'Станьте администратором сервера',
  devmode_achievement: 'Активируйте режим разработчика',
  hacker_achievement: 'Получите роль админа',
  godmode_achievement: 'Полная власть над сервером',
  sosiska_achievement: 'Купите подписку «Сосиска» — даёт ВСЁ',
};

const CollectionPage = ({ user, onBack }) => {
  const [tab, setTab] = useState('collection');
  const [emojis, setEmojis] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [myCollection, setMyCollection] = useState([]);
  const [myAchievements, setMyAchievements] = useState([]);
  const [equipped, setEquipped] = useState([]);
  const [stats, setStats] = useState({ total: 0, common: 0, rare: 0, epic: 0, legendary: 0, secret: 0, admin: 0 });
  const [filterRarity, setFilterRarity] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [isHidden, setIsHidden] = useState(false);
  const [viewUserId, setViewUserId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setError(null);
    try {
      const [cat, my] = await Promise.all([
        apiGet('/api/collection/catalog'),
        apiGet('/api/collection/my')
      ]);
      setEmojis(cat?.emojis || []);
      setAllAchievements(cat?.achievements || []);
      setMyCollection(my?.collection || []);
      setMyAchievements(my?.achievements || []);
      setEquipped(my?.equipped || []);
      setStats(my?.stats || { total: 0, common: 0, rare: 0, epic: 0, legendary: 0, secret: 0, admin: 0 });

      if (user?.id) {
        try {
          const profile = await apiGet('/api/collection/profile/' + user.id);
          setIsHidden(!!profile?.hidden);
        } catch (e) {}
      }
    } catch (e) {
      console.error('Collection load error:', e);
      setError(e.message || 'Ошибка загрузки');
    }
    setLoading(false);
  };

  const loadViewUser = async (userId) => {
    try {
      const data = await apiGet('/api/collection/profile/' + userId);
      setViewData(data);
      setViewUserId(userId);
      setTab('view');
    } catch (e) {
      setToast({ text: 'Не удалось загрузить коллекцию', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchUsername.trim()) return;
    try {
      const data = await apiGet('/api/auth/search?query=' + encodeURIComponent(searchUsername));
      setSearchResults(data?.users || []);
    } catch (e) {
      setSearchResults([]);
    }
  };

  const handleEquip = async (emojiId) => {
    try {
      await apiPost('/api/collection/equip', { emoji_id: emojiId });
      setToast({ text: 'Эмодзи установлен на профиль!', type: 'success' });
      loadData();
    } catch (e) {
      setToast({ text: 'Ошибка', type: 'error' });
    }
    setTimeout(() => setToast(null), 2000);
  };

  const handleUnequip = async () => {
    try {
      await apiPost('/api/collection/unequip', {});
      setToast({ text: 'Эмодзи убран с профиля', type: 'success' });
      loadData();
    } catch (e) {}
    setTimeout(() => setToast(null), 2000);
  };

  const handleTogglePrivacy = async () => {
    try {
      const data = await apiPost('/api/collection/toggle-privacy', {});
      setIsHidden(data?.hidden);
      setToast({ text: data?.hidden ? 'Коллекция скрыта от других' : 'Коллекция теперь видна всем', type: 'success' });
    } catch (e) {
      setToast({ text: 'Ошибка', type: 'error' });
    }
    setTimeout(() => setToast(null), 2000);
  };

  const handleCheckAchievements = async () => {
    try {
      const data = await apiPost('/api/collection/check-achievements', {});
      if (data.newAchievements?.length > 0) {
        setToast({ text: `Получено ${data.newAchievements.length} новых достижений!`, type: 'success' });
      } else {
        setToast({ text: 'Новых достижений нет', type: 'info' });
      }
      loadData();
    } catch (e) {
      setToast({ text: 'Ошибка проверки', type: 'error' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  const myEmojiIds = myCollection.map(c => c.emoji_id);
  const earnedIds = myAchievements.map(a => a.achievement_id);
  const filteredEmojis = filterRarity === 'all' ? emojis : emojis.filter(e => e.rarity === filterRarity);

  if (loading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-discord-mid flex items-center justify-center">
        <div className="text-discord-gray">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-discord-mid relative">
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-discord-blurple text-white'
        }`}>{toast.text}</div>
      )}

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="h-16 px-6 flex items-center border-b border-discord-light/20 bg-discord-mid/80 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={onBack} className="mr-4 text-discord-gray hover:text-discord-accent transition-colors">
          <ArrowLeft size={20} />
        </button>
        <Trophy size={20} className="text-yellow-400 mr-2" />
        <h2 className="text-xl font-bold text-discord-white">Коллекция</h2>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleTogglePrivacy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors font-medium ${
              isHidden ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}>
            {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            {isHidden ? 'Скрыто' : 'Видно'}
          </button>
          <button onClick={handleCheckAchievements}
            className="px-3 py-1.5 bg-discord-blurple/20 text-discord-blurple rounded-lg text-xs hover:bg-discord-blurple/30 transition-colors font-medium">
            Проверить достижения
          </button>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="px-6 py-4">
        <div className="bg-gradient-to-r from-discord-darker to-discord-dark rounded-2xl p-5 border border-discord-light/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-discord-white font-bold text-lg">{user?.username}</h3>
              <p className="text-discord-gray text-sm">Коллекция и достижения</p>
            </div>
            {equipped.length > 0 && (
              <div className="flex items-center gap-2 bg-discord-light/10 px-3 py-1.5 rounded-full">
                {equipped.map(eid => {
                  const em = emojis.find(e => e.id === eid);
                  return em ? <span key={eid} className="text-xl">{em.emoji}</span> : null;
                })}
                <span className="text-discord-white text-xs">На профиле</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Всего', value: stats.total || 0, color: 'text-discord-white' },
              { label: 'Обычные', value: stats.common || 0, color: 'text-gray-400' },
              { label: 'Редкие', value: stats.rare || 0, color: 'text-blue-400' },
              { label: 'Эпические', value: stats.epic || 0, color: 'text-purple-400' },
              { label: 'Легендарные', value: stats.legendary || 0, color: 'text-yellow-400' },
              { label: 'Секретные', value: stats.secret || 0, color: 'text-pink-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-discord-gray text-[10px]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-1 mb-4 flex-wrap">
        {[
          { id: 'collection', label: 'Коллекция', icon: Sparkles, count: myCollection.length },
          { id: 'achievements', label: 'Достижения', icon: Trophy, count: `${earnedIds.length}/${allAchievements.length}` },
          { id: 'catalog', label: 'Каталог', icon: Star, count: `${myEmojiIds.length}/${emojis.length}` },
          { id: 'search', label: 'Чужие', icon: User, count: '' },
        ].map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === id ? 'bg-discord-blurple text-white' : 'text-discord-gray hover:text-discord-white hover:bg-discord-light/10'
            }`}>
            <Icon size={16} />
            <span>{label}</span>
            {count && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-white/20' : 'bg-discord-light/10'}`}>{count}</span>}
          </button>
        ))}
      </div>

      <div className="px-6 pb-8">
        {/* Collection Tab */}
        {tab === 'collection' && (
          <div className="space-y-4">
            {myCollection.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📦</div>
                <div className="text-discord-white font-semibold mb-1">Коллекция пуста</div>
                <div className="text-discord-gray text-sm">Выполняйте достижения, чтобы получить эмодзи</div>
              </div>
            ) : (
              <>
                {equipped.length > 0 && (
                  <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-discord-white text-sm font-semibold">На профиле</span>
                      <button onClick={handleUnequip} className="text-red-400 text-xs hover:text-red-300">Убрать</button>
                    </div>
                    <div className="flex items-center gap-3">
                      {equipped.map(eid => {
                        const emoji = emojis.find(e => e.id === eid);
                        if (!emoji) return null;
                        const rarity = RARITY_CONFIG[emoji.rarity];
                        return (
                          <div key={eid} className={`text-3xl p-2 rounded-xl ${rarity.bg} border ${rarity.border} shadow-lg ${rarity.glow}`}>
                            {emoji.emoji}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-6 gap-3">
                  {myCollection.map(item => {
                    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                    const isEquipped = equipped.includes(item.emoji_id);
                    return (
                      <div key={item.emoji_id}
                        className={`relative p-3 rounded-xl border text-center cursor-pointer transition-all hover:scale-105 ${rarity.bg} ${rarity.border} ${isEquipped ? 'ring-2 ring-discord-blurple' : ''}`}
                        onClick={() => handleEquip(item.emoji_id)}>
                        {isEquipped && <div className="absolute -top-1 -right-1 w-4 h-4 bg-discord-blurple rounded-full flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                        <div className="text-3xl mb-1">{item.emoji}</div>
                        <div className="text-discord-white text-xs font-medium truncate">{item.name}</div>
                        <div className={`text-[10px] ${rarity.color}`}>{rarity.label}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {tab === 'achievements' && (
          <div className="space-y-3">
            <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10 mb-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-discord-white font-semibold text-sm">Прогресс</h4>
                <span className="text-discord-blurple text-sm font-bold">{earnedIds.length} / {allAchievements.length}</span>
              </div>
              <div className="w-full h-2 bg-discord-light/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-discord-blurple to-discord-accent rounded-full transition-all"
                  style={{ width: `${allAchievements.length ? (earnedIds.length / allAchievements.length) * 100 : 0}%` }} />
              </div>
            </div>

            {allAchievements.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🏆</div>
                <div className="text-discord-white font-semibold mb-1">Достижений пока нет</div>
                <div className="text-discord-gray text-sm">Начните активность на сервере!</div>
              </div>
            ) : (
              <>
                {allAchievements.filter(a => {
                  const emojiInfo = emojis.find(e => e.id === a.emoji);
                  return !emojiInfo || (emojiInfo.rarity !== 'admin' && emojiInfo.rarity !== 'secret');
                }).map(ach => {
                const earned = earnedIds.includes(ach.id);
                const emojiInfo = emojis.find(e => e.id === ach.emoji);
                return (
                  <div key={ach.id}
                    className={`rounded-xl border transition-all ${
                      earned
                        ? 'bg-discord-darker border-green-500/30'
                        : 'bg-discord-darker/50 border-discord-light/5'
                    }`}>
                    <div className="flex items-center gap-4 p-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        earned ? 'bg-green-500/20' : 'bg-discord-light/10'
                      }`}>
                        {earned ? ach.icon : <Lock size={20} className="text-discord-gray" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${earned ? 'text-discord-white' : 'text-discord-gray'}`}>{ach.name}</span>
                          {earned && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-bold">ПОЛУЧЕНО</span>}
                        </div>
                        <div className="text-discord-muted text-xs">{ach.description}</div>
                      </div>
                      {emojiInfo && (
                        <div className="text-center flex-shrink-0">
                          <div className="text-2xl mb-0.5">{emojiInfo.emoji}</div>
                          <div className={`text-[10px] ${RARITY_CONFIG[emojiInfo.rarity]?.color}`}>
                            {RARITY_CONFIG[emojiInfo.rarity]?.label}
                          </div>
                        </div>
                      )}
                    </div>
                    {!earned && HOW_TO[ach.id] && (
                      <div className="px-4 pb-3 -mt-1">
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-discord-blurple/5 border border-discord-blurple/10">
                          <span className="text-xs mt-0.5">💡</span>
                          <span className="text-discord-gray text-[11px] leading-relaxed">{HOW_TO[ach.id]}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {allAchievements.some(a => {
                const emojiInfo = emojis.find(e => e.id === a.emoji);
                return emojiInfo && (emojiInfo.rarity === 'secret' || emojiInfo.rarity === 'admin');
              }) && (
                <>
                  <div className="flex items-center gap-2 mt-4 mb-2">
                    <div className="h-px flex-1 bg-discord-light/10" />
                    <span className="text-[11px] text-pink-400 font-bold uppercase tracking-wider">Секретные и Админ достижения</span>
                    <div className="h-px flex-1 bg-discord-light/10" />
                  </div>
                  {allAchievements.filter(a => {
                    const emojiInfo = emojis.find(e => e.id === a.emoji);
                    return emojiInfo && (emojiInfo.rarity === 'secret' || emojiInfo.rarity === 'admin');
                  }).map(ach => {
                    const earned = earnedIds.includes(ach.id);
                    const emojiInfo = emojis.find(e => e.id === ach.emoji);
                    const isSecret = emojiInfo?.rarity === 'secret';
                    const isAdmin = emojiInfo?.rarity === 'admin';
                    const rarity = RARITY_CONFIG[emojiInfo?.rarity] || RARITY_CONFIG.common;
                    return (
                      <div key={ach.id}
                        className={`rounded-xl border transition-all ${
                          earned
                            ? `${rarity.bg} ${rarity.border}`
                            : 'bg-discord-darker/50 border-discord-light/5'
                        }`}>
                        <div className="flex items-center gap-4 p-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                            earned ? `${rarity.bg}` : 'bg-discord-light/10'
                          }`}>
                            {earned ? ach.icon : <Lock size={20} className="text-discord-gray" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${earned ? 'text-discord-white' : 'text-discord-gray'}`}>{ach.name}</span>
                              {isSecret && <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 rounded text-[10px] font-bold">СЕКРЕТ</span>}
                              {isAdmin && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold">АДМИН</span>}
                              {earned && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-bold">ПОЛУЧЕНО</span>}
                            </div>
                            <div className="text-discord-muted text-xs">{ach.description}</div>
                          </div>
                          {emojiInfo && (
                            <div className="text-center flex-shrink-0">
                              <div className="text-2xl mb-0.5">{earned ? emojiInfo.emoji : '❓'}</div>
                              <div className={`text-[10px] ${rarity.color}`}>{rarity.label}</div>
                            </div>
                          )}
                        </div>
                        {!earned && HOW_TO[ach.id] && (
                          <div className="px-4 pb-3 -mt-1">
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-pink-500/5 border border-pink-500/10">
                              <span className="text-xs mt-0.5">🔒</span>
                              <span className="text-discord-gray text-[11px] leading-relaxed">{isSecret ? '??? — Условие засекречено' : HOW_TO[ach.id]}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              </>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {tab === 'catalog' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['all', 'common', 'rare', 'epic', 'legendary', 'secret', 'admin'].map(r => (
                <button key={r} onClick={() => setFilterRarity(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    filterRarity === r
                      ? r === 'all' ? 'bg-discord-blurple text-white'
                        : r === 'common' ? 'bg-gray-500 text-white'
                        : r === 'rare' ? 'bg-blue-500 text-white'
                        : r === 'epic' ? 'bg-purple-500 text-white'
                        : r === 'legendary' ? 'bg-yellow-500 text-white'
                        : r === 'secret' ? 'bg-pink-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-discord-light/10 text-discord-gray hover:text-discord-white'
                  }`}>
                  {r === 'all' ? 'Все' : RARITY_CONFIG[r]?.label} ({r === 'all' ? emojis.length : emojis.filter(e => e.rarity === r).length})
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {filteredEmojis.map(emoji => {
                const owned = myEmojiIds.includes(emoji.id);
                const rarity = RARITY_CONFIG[emoji.rarity] || RARITY_CONFIG.common;
                const isSecretLocked = (emoji.rarity === 'secret' || emoji.rarity === 'admin') && !owned;
                return (
                  <div key={emoji.id}
                    className={`relative p-3 rounded-xl border text-center transition-all ${
                      owned ? `${rarity.bg} ${rarity.border}` : 'bg-discord-darker/50 border-discord-light/5 opacity-50'
                    }`}>
                    {owned && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                    <div className="text-3xl mb-1">{isSecretLocked ? '❓' : emoji.emoji}</div>
                    <div className="text-discord-white text-xs font-medium truncate">{isSecretLocked ? '???' : emoji.name}</div>
                    <div className={`text-[10px] ${rarity.color}`}>{rarity.label}</div>
                    {!owned && <Lock size={10} className="absolute bottom-1 right-1 text-discord-muted" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Users Tab */}
        {tab === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-gray" />
                <input value={searchUsername} onChange={e => setSearchUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
                  placeholder="Введите имя пользователя..."
                  className="w-full pl-10 pr-4 py-2.5 bg-discord-darker border border-discord-light/20 rounded-lg text-discord-white text-sm placeholder-discord-gray focus:outline-none focus:border-discord-blurple" />
              </div>
              <button onClick={handleSearchUsers}
                className="px-4 py-2.5 bg-discord-blurple text-white rounded-lg text-sm font-medium hover:bg-discord-blurple/80 transition-colors">
                Найти
              </button>
            </div>
            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-discord-darker rounded-xl border border-discord-light/10 hover:border-discord-blurple/30 transition-colors cursor-pointer"
                  onClick={() => loadViewUser(u.id)}>
                  <div className="w-10 h-10 rounded-full bg-discord-blurple/20 flex items-center justify-center text-discord-white font-bold text-sm">
                    {(u.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-discord-white text-sm font-semibold truncate">{u.username}</div>
                    <div className="text-discord-gray text-xs">Нажмите, чтобы посмотреть коллекцию</div>
                  </div>
                </div>
              ))}
              {searchUsername && searchResults.length === 0 && (
                <div className="text-center py-8 text-discord-gray text-sm">Пользователи не найдены</div>
              )}
              {!searchUsername && (
                <div className="text-center py-8 text-discord-gray text-sm">Введите имя для поиска</div>
              )}
            </div>
          </div>
        )}

        {/* View User Collection Tab */}
        {tab === 'view' && viewData && (
          <div className="space-y-4">
            <button onClick={() => setTab('search')} className="text-discord-blurple text-sm hover:underline flex items-center gap-1">
              <ArrowLeft size={14} /> Назад к поиску
            </button>
            {viewData.hidden ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔒</div>
                <div className="text-discord-white font-semibold mb-1">Коллекция скрыта</div>
                <div className="text-discord-gray text-sm">Пользователь скрыл свою коллекцию</div>
              </div>
            ) : (
              <>
                <div className="bg-discord-darker rounded-xl p-4 border border-discord-light/10">
                  <div className="text-discord-white font-semibold text-sm mb-2">
                    Всего эмодзи: {viewData.totalEmoji} | Достижений: {viewData.totalAchievements}
                  </div>
                  {viewData.equipped?.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-discord-gray text-xs">На профиле:</span>
                      {viewData.equipped.map((e, i) => (
                        <span key={i} className="text-xl" title={`${e.name} (${RARITY_CONFIG[e.rarity]?.label})`}>{e.emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
                {viewData.collection?.length > 0 && (
                  <div>
                    <div className="text-discord-white text-sm font-semibold mb-2">Эмодзи</div>
                    <div className="grid grid-cols-6 gap-3">
                      {viewData.collection.map(item => {
                        const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                        return (
                          <div key={item.emoji_id} className={`p-3 rounded-xl border text-center ${rarity.bg} ${rarity.border}`}>
                            <div className="text-3xl mb-1">{item.emoji}</div>
                            <div className="text-discord-white text-xs font-medium truncate">{item.name}</div>
                            <div className={`text-[10px] ${rarity.color}`}>{rarity.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {viewData.achievementsList?.length > 0 && (
                  <div>
                    <div className="text-discord-white text-sm font-semibold mb-2">Достижения</div>
                    <div className="grid grid-cols-2 gap-2">
                      {viewData.achievementsList.map(ach => (
                        <div key={ach.achievement_id} className="flex items-center gap-2 p-2 bg-discord-darker rounded-lg border border-discord-light/10">
                          <span className="text-xl">{ach.icon}</span>
                          <div>
                            <div className="text-discord-white text-xs font-semibold">{ach.name}</div>
                            <div className="text-discord-gray text-[10px]">{ach.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
