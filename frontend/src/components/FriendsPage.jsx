import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Check, X, MoreVertical, MessageCircle, Trash2, Clock } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

export default function FriendsPage({ onSelectDm }) {
  const [tab, setTab] = useState('online');
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendError, setAddFriendError] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState('');
  const [actionMenu, setActionMenu] = useState(null);

  useEffect(() => {
    loadFriends();
    loadPending();

    const handleFriendRequest = (e) => {
      loadPending();
      if (Notification.permission === 'granted') {
        new Notification('Новая заявка в друзья', {
          body: `${e.detail.fromUsername} хочет добавить вас в друзья`,
          icon: e.detail.fromAvatar || undefined
        });
      }
    };

    const handleFriendAccepted = (e) => {
      loadFriends();
      loadPending();
    };

    window.addEventListener('friend_request', handleFriendRequest);
    window.addEventListener('friend_request_accepted', handleFriendAccepted);

    return () => {
      window.removeEventListener('friend_request', handleFriendRequest);
      window.removeEventListener('friend_request_accepted', handleFriendAccepted);
    };
  }, []);

  const loadFriends = async () => {
    try {
      const data = await apiGet('/api/auth/friends');
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPending = async () => {
    try {
      const data = await apiGet('/api/auth/friends/pending');
      setPending(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriend = async () => {
    if (!addFriendInput.trim()) return;
    setAddFriendError('');
    setAddFriendSuccess('');
    setLoading(true);

    try {
      const cleanTag = addFriendInput.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (cleanTag.length < 2) {
        setAddFriendError('Введите минимум 2 символа тега');
        setLoading(false);
        return;
      }

      const results = await apiGet(`/api/auth/search?q=${encodeURIComponent(cleanTag)}`);
      if (results.length === 0) {
        setAddFriendError('Пользователь не найден по этому тегу');
        setLoading(false);
        return;
      }

      const targetUser = results[0];
      const res = await apiPost(`/api/auth/friends/${targetUser.id}`);
      setAddFriendSuccess(res.message || `Заявка отправлена ${targetUser.username}#${targetUser.tag}!`);
      setAddFriendInput('');
      loadPending();
    } catch (err) {
      setAddFriendError(err.message);
    }
    setLoading(false);
  };

  const handleAcceptFriend = async (userId) => {
    try {
      await apiPut(`/api/auth/friends/${userId}/accept`);
      loadFriends();
      loadPending();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectFriend = async (userId) => {
    try {
      await apiDelete(`/api/auth/friends/${userId}`);
      loadPending();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (userId) => {
    try {
      await apiDelete(`/api/auth/friends/${userId}`);
      loadFriends();
      setActionMenu(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartDm = async (userId) => {
    try {
      const res = await fetch(`/api/dm/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.id && onSelectDm) {
        onSelectDm(data);
      }
    } catch (err) {
      console.error(err);
    }
    setActionMenu(null);
  };

  const handleSearchUsers = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await apiGet(`/api/auth/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const onlineFriends = friends.filter(f => f.status === 'online');
  const allFriends = friends;
  const pendingCount = pending.incoming.length;

  const tabs = [
    { id: 'online', label: 'В сети', count: onlineFriends.length },
    { id: 'all', label: 'Все', count: allFriends.length },
    { id: 'pending', label: 'Заявки', count: pendingCount },
    { id: 'blocked', label: 'Заблокированные', count: 0 },
  ];

  const filteredFriends = (() => {
    switch (tab) {
      case 'online': return onlineFriends;
      case 'all': return allFriends;
      case 'pending': return [];
      default: return [];
    }
  })();

  const displayFriends = searchQuery && tab !== 'pending'
    ? filteredFriends.filter(f => f.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredFriends;

  return (
    <div className="flex flex-col h-full bg-discord-mid">
      {/* Header */}
      <div className="h-14 px-4 flex items-center border-b border-discord-light/20 shadow-sm flex-shrink-0 gap-4">
        <div className="flex items-center gap-2 text-discord-white font-semibold">
          <MessageCircle size={20} className="text-discord-accent" />
          Друзья
        </div>

        <div className="w-px h-6 bg-discord-light/30" />

        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded-xl text-sm transition-all duration-200 ${
              tab === t.id
                ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30'
                : 'text-discord-gray hover:text-discord-text hover:bg-discord-light/30'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 bg-discord-mid text-[10px] px-1.5 py-0.5 rounded-full text-discord-gray border border-discord-light/20">
                {t.count}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => { setShowAddFriend(!showAddFriend); setAddFriendError(''); setAddFriendSuccess(''); }}
          className={`px-3 py-1 rounded-xl text-sm font-medium transition-all duration-200 ${
            showAddFriend
              ? 'bg-transparent text-discord-white border border-discord-accent/50'
              : 'bg-gradient-to-r from-discord-green to-emerald-400 hover:shadow-lg hover:shadow-discord-green/30 text-discord-darker'
          }`}
        >
          Добавить в друзья
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add Friend Panel */}
        {showAddFriend && (
          <div className="p-4 border-b border-discord-light/20">
            <h3 className="text-discord-white font-semibold mb-1">Добавить в друзья</h3>
            <p className="text-sm text-discord-gray mb-3">
              Введите тег пользователя (например: #e114)
            </p>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-accent font-mono font-bold">#</span>
                <input
                  type="text"
                  value={addFriendInput}
                  onChange={(e) => setAddFriendInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                  placeholder="тег"
                  maxLength={4}
                  className="w-full bg-discord-mid border border-discord-light/20 rounded-xl pl-7 pr-3 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 font-mono transition-colors"
                />
              </div>
              <button
                onClick={handleAddFriend}
                disabled={loading || !addFriendInput.trim()}
                className="px-4 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:shadow-lg hover:shadow-discord-blurple/30 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Поиск...' : 'Отправить заявку'}
              </button>
            </div>

            {addFriendError && (
              <p className="text-sm text-discord-red mt-2">{addFriendError}</p>
            )}
            {addFriendSuccess && (
              <p className="text-sm text-discord-green mt-2">{addFriendSuccess}</p>
            )}
          </div>
        )}

        {/* Search */}
        {tab !== 'pending' && (
          <div className="px-4 pt-4 pb-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Поиск"
                className="w-full bg-discord-mid border border-discord-light/20 rounded-xl pl-9 pr-3 py-2 text-sm text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-2">
          {/* Pending Tab */}
          {tab === 'pending' && (
            <div>
              {/* Incoming */}
              <h4 className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-2 px-2">
                Входящие заявки — {pending.incoming.length}
              </h4>
              {pending.incoming.length === 0 && (
                <p className="text-sm text-discord-muted px-2 mb-4">Нет входящих заявок</p>
              )}
              {pending.incoming.map(friend => (
                <div key={friend.request_id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-discord-light/20 transition-all duration-200 group mb-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center text-white font-medium">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        friend.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-discord-mid ${
                      friend.status === 'online' ? 'bg-discord-green' : 'bg-discord-muted'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{friend.username}<span className="text-discord-muted font-normal text-sm">#{friend.tag}</span></div>
                    <div className="text-xs text-discord-muted flex items-center gap-1">
                      <Clock size={10} />
                      Входящая заявка
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAcceptFriend(friend.id)}
                      className="p-2 rounded-full bg-discord-green/20 text-discord-green hover:bg-discord-green/30 transition-colors"
                      title="Принять"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleRejectFriend(friend.id)}
                      className="p-2 rounded-full bg-discord-red/20 text-discord-red hover:bg-discord-red/30 transition-colors"
                      title="Отклонить"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Outgoing */}
              <h4 className="text-xs font-semibold text-discord-gray uppercase tracking-wide mb-2 mt-6 px-1">
                Исходящие заявки — {pending.outgoing.length}
              </h4>
              {pending.outgoing.length === 0 && (
                <p className="text-sm text-discord-muted px-1 mb-4">Нет исходящих заявок</p>
              )}
              {pending.outgoing.map(friend => (
                <div key={friend.request_id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-discord-light/20 transition-colors group mb-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center text-white font-medium">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        friend.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-discord-mid ${
                      friend.status === 'online' ? 'bg-discord-green shadow-lg shadow-discord-green/50' : 'bg-discord-muted'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-discord-white font-medium">{friend.username}<span className="text-discord-muted font-normal text-sm">#{friend.tag}</span></div>
                    <div className="text-xs text-discord-muted flex items-center gap-1">
                      <Clock size={10} />
                      Ожидает ответа
                    </div>
                  </div>

                  <button
                    onClick={() => handleRejectFriend(friend.id)}
                    className="p-2 rounded-xl bg-discord-red/20 text-discord-red hover:bg-discord-red/30 transition-colors"
                    title="Отменить"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Friends List */}
          {tab !== 'pending' && (
            <div>
              <h4 className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-2 px-2">
                {tab === 'online' ? 'В сети' : 'Все'} — {displayFriends.length}
              </h4>

              {displayFriends.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-discord-muted">
                    {searchQuery ? 'Никого не найдено' : 'Пока нет друзей'}
                  </p>
                </div>
              )}

              {displayFriends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-discord-light/20 transition-all duration-200 group relative mb-0.5"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white font-medium">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        friend.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-discord-mid ${
                      friend.status === 'online' ? 'bg-discord-green shadow-lg shadow-discord-green/50' : 'bg-discord-muted'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-discord-white font-medium">{friend.username}<span className="text-discord-muted font-normal text-sm">#{friend.tag}</span></div>
                    <div className="text-xs text-discord-muted">
                      {friend.status === 'online' ? 'В сети' : 'Не в сети'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartDm(friend.id)}
                      className="p-1.5 rounded-xl bg-discord-mid hover:bg-discord-accent/20 text-discord-gray hover:text-discord-accent transition-all duration-200"
                      title="Написать сообщение"
                    >
                      <MessageCircle size={18} />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === friend.id ? null : friend.id)}
                        className="p-1.5 rounded-xl bg-discord-mid hover:bg-discord-light/30 text-discord-gray hover:text-discord-text transition-all duration-200"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {actionMenu === friend.id && (
                        <div className="absolute right-0 top-full mt-1 bg-discord-darker border border-discord-light/20 rounded-2xl shadow-2xl z-20 w-48 py-1">
                          <button
                            onClick={() => handleStartDm(friend.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-discord-gray hover:bg-discord-accent/10 hover:text-discord-accent transition-colors"
                          >
                            <MessageCircle size={14} />
                            Написать сообщение
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
                          >
                            <Trash2 size={14} />
                            Удалить из друзей
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Blocked Tab (placeholder) */}
          {tab === 'blocked' && (
            <div className="text-center py-12">
              <p className="text-discord-muted">Список заблокированных пуст</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
