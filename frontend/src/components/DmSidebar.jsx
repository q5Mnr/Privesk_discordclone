import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, Users, UserCheck, Search } from 'lucide-react';
import { apiGet } from '../utils/api';

export default function DmSidebar({ dmChannels, onSelectDm, onSelectFriends, showFriends, user }) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingCount = async () => {
    try {
      const data = await apiGet('/api/auth/friends/pending');
      setPendingCount(data.incoming?.length || 0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-60 bg-discord-darker flex flex-col flex-shrink-0 border-r border-discord-light/30">
      <div className="h-14 px-4 flex items-center border-b border-discord-light/20">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
          <input
            type="text"
            placeholder="Найти или начать чат"
            className="w-full bg-discord-mid text-sm text-discord-text pl-8 pr-3 py-2 rounded-xl border border-discord-light/20 focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <button
          onClick={onSelectFriends}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 transition-all duration-200 ${
            showFriends
              ? 'bg-discord-blurple/20 text-discord-white border border-discord-blurple/30'
              : 'text-discord-gray hover:bg-discord-light/30 hover:text-discord-text'
          }`}
        >
          <UserCheck size={20} className={showFriends ? 'text-discord-accent' : ''} />
          <span className="flex-1 text-left font-medium">Друзья</span>
          {pendingCount > 0 && (
            <span className="bg-discord-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendingCount}
            </span>
          )}
        </button>

        <div className="flex items-center justify-between px-2 mb-1 mt-4">
          <h4 className="text-[11px] font-bold text-discord-muted uppercase tracking-wider">
            Личные сообщения
          </h4>
          <button className="text-discord-muted hover:text-discord-accent transition-colors">
            <Plus size={16} />
          </button>
        </div>

        {dmChannels.map(dm => {
          const otherUser = dm.members?.[0];
          return (
            <button
              key={dm.id}
              onClick={() => onSelectDm(dm)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-discord-light/30 transition-all duration-200 group"
            >
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-sm font-medium">
                  {otherUser?.avatar ? (
                    <img src={otherUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    otherUser?.username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-darker ${
                  otherUser?.status === 'online' ? 'bg-discord-green shadow-lg shadow-discord-green/50' :
                  otherUser?.status === 'idle' ? 'bg-discord-yellow' :
                  otherUser?.status === 'dnd' ? 'bg-discord-red' :
                  'bg-discord-muted'
                }`} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <span className="text-discord-gray group-hover:text-discord-text transition-colors truncate block font-medium text-sm">
                  {otherUser?.username || 'Пользователь'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
