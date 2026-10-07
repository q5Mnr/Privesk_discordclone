import React, { useState, useRef, useEffect } from 'react';
import { Settings, Mic, MicOff, Headphones, Plus, Check, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserPanel({ user, onLogout, onSettings }) {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const panelRef = useRef(null);
  const { accounts, switchAccount, addAccount } = useAuth();

  useEffect(() => {
    if (!showAccounts) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowAccounts(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAccounts]);

  return (
    <div className="bg-discord-darker border-t border-discord-light/20 relative">
      <div className="p-2 flex items-center gap-2">
        <div className="relative flex items-center gap-2.5 flex-1 min-w-0 px-2 py-2 rounded-xl hover:bg-discord-light/30 transition-all duration-200">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-lg shadow-discord-blurple/20">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || '?'
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-discord-darker ${
              user?.status === 'online' ? 'bg-discord-green shadow-lg shadow-discord-green/50' :
              user?.status === 'idle' ? 'bg-discord-yellow' :
              user?.status === 'dnd' ? 'bg-discord-red' :
              'bg-discord-muted'
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-discord-white truncate">{user?.username}</div>
            <div className="text-xs text-discord-muted truncate">@{user?.username?.toLowerCase()}</div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMuted(!muted)}
            className={`p-2 rounded-xl hover:bg-discord-light/40 transition-all duration-200 ${
              muted ? 'text-discord-red' : 'text-discord-gray hover:text-discord-text'
            }`}
            title={muted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {muted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={() => setDeafened(!deafened)}
            className={`p-2 rounded-xl hover:bg-discord-light/40 transition-all duration-200 ${
              deafened ? 'text-discord-red' : 'text-discord-gray hover:text-discord-text'
            }`}
            title={deafened ? 'Включить звук' : 'Выключить звук'}
          >
            {deafened ? <Headphones size={18} className="text-discord-red" /> : <Headphones size={18} />}
          </button>

          <button
            onClick={onSettings}
            className="p-2 rounded-xl hover:bg-discord-light/40 text-discord-gray hover:text-discord-text transition-all duration-200"
            title="Настройки"
          >
            <Settings size={18} />
          </button>

          <div ref={panelRef} className="relative">
            <button
              onClick={() => setShowAccounts(!showAccounts)}
              className={`p-2 rounded-xl hover:bg-discord-light/40 transition-all duration-200 ${showAccounts ? 'text-discord-accent bg-discord-accent/10' : 'text-discord-gray hover:text-discord-text'}`}
              title="Аккаунты"
            >
              <ArrowLeftRight size={18} />
            </button>

            {showAccounts && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-discord-darker rounded-2xl shadow-2xl border border-discord-light/20 overflow-hidden z-50">
                <div className="p-3 border-b border-discord-light/20">
                  <p className="text-[11px] font-bold text-discord-accent uppercase tracking-wider">Переключить аккаунт</p>
                </div>

                <div className="p-2 max-h-60 overflow-y-auto">
                  {accounts.map(acc => (
                    <div
                      key={acc.user?.id}
                      onClick={() => {
                        if (acc.token !== localStorage.getItem('token')) {
                          switchAccount(acc.token);
                        }
                        setShowAccounts(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                        acc.user?.id === user?.id ? 'bg-discord-accent/15 border border-discord-accent/30' : 'hover:bg-discord-light/30'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {acc.user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-darker ${
                          acc.user?.status === 'online' ? 'bg-discord-green' :
                          acc.user?.status === 'idle' ? 'bg-discord-yellow' :
                          acc.user?.status === 'dnd' ? 'bg-discord-red' :
                          'bg-discord-muted'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-discord-white truncate">{acc.user?.username}<span className="text-discord-muted text-xs">#{acc.user?.tag}</span></div>
                      </div>
                      {acc.user?.id === user?.id && <Check size={16} className="text-discord-green flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                <div className="p-2 border-t border-discord-light/20">
                  <div
                    onClick={() => {
                      addAccount();
                      setShowAccounts(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-discord-light/30 transition-all duration-200"
                  >
                    <div className="w-9 h-9 rounded-full bg-discord-mid flex items-center justify-center text-discord-gray flex-shrink-0 border border-discord-light/30">
                      <Plus size={18} />
                    </div>
                    <span className="text-sm text-discord-gray">Добавить аккаунт</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
