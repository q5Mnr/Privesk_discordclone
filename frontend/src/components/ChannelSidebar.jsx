import React, { useState, useEffect } from 'react';
import { Hash, Volume2, ChevronDown, ChevronRight, UserPlus, RefreshCw, Copy, Check, Settings, Calendar, MessageSquare, Zap } from 'lucide-react';
import { hasChannelDraft, getDraftPreview } from '../utils/drafts';

export default function ChannelSidebar({ server, channels, currentChannel, onSelectChannel, user, onOpenServerSettings, getChannelUnread, getChannelMention, onOpenEvents, onOpenBoosts }) {
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState(server.invite_code || '');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [, draftTick] = useState(0);

  useEffect(() => {
    const refresh = () => draftTick((n) => n + 1);
    window.addEventListener('channel_drafts_updated', refresh);
    return () => window.removeEventListener('channel_drafts_updated', refresh);
  }, []);

  const textChannels = channels.filter(c => c.type === 'text');
  const forumChannels = channels.filter(c => c.type === 'forum');
  const voiceChannels = channels.filter(c => c.type === 'voice');
  const isOwner = server.owner_id === user?.id;
  const isadmin = server.member_role === 'owner' || server.member_role === 'admin';

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/servers/${server.id}/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.invite_code) setInviteCode(data.invite_code);
    } catch (err) {
      console.error(err);
    }
    setRegenerating(false);
  };

  return (
    <div className="w-60 bg-discord-darker flex flex-col flex-shrink-0 border-r border-discord-light/30">
      <div className="h-14 px-4 flex items-center border-b border-discord-light/20 shadow-sm hover:bg-discord-light/20 transition-all duration-200 group">
        <h2 className="text-discord-white font-semibold text-[15px] truncate flex-1">{server.name}</h2>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenServerSettings?.(); }}
          className="p-1 text-discord-gray hover:text-discord-accent transition-colors opacity-0 group-hover:opacity-100"
          title="Настройки сервера"
        >
          <Settings size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {textChannels.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => toggleCategory('text')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-discord-muted uppercase tracking-wider px-2 mb-1 hover:text-discord-accent transition-colors w-full"
            >
              {collapsedCategories.text ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              Текстовые каналы
            </button>

            {!collapsedCategories.text && textChannels.map(channel => {
              const unread = getChannelUnread?.(channel.id) || 0;
              const mentions = getChannelMention?.(channel.id) || 0;
              const draft = currentChannel?.id !== channel.id && hasChannelDraft(channel.id);
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm group/ch transition-all duration-200 ${
                    currentChannel?.id === channel.id
                      ? 'bg-discord-blurple/20 text-discord-white border border-discord-blurple/30'
                      : mentions > 0
                      ? 'text-discord-white font-semibold hover:bg-discord-light/30'
                      : unread > 0
                      ? 'text-discord-white font-semibold hover:bg-discord-light/30'
                      : draft
                      ? 'text-discord-white hover:bg-discord-light/30'
                      : 'text-discord-gray hover:bg-discord-light/30 hover:text-discord-text'
                  }`}
                >
                  <Hash size={18} className={mentions > 0 ? 'text-discord-accent' : 'text-discord-muted'} />
                  {draft ? (
                    <span className="truncate flex-1 text-left">
                      <span className="text-discord-muted text-xs">Черновик: </span>
                      <span className="text-discord-gray italic">{getDraftPreview(channel.id)}</span>
                    </span>
                  ) : (
                    <span className="truncate flex-1 text-left">{channel.name}</span>
                  )}
                  {mentions > 0 && (
                    <span className="bg-discord-accent text-discord-darker text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {mentions > 99 ? '99+' : mentions}
                    </span>
                  )}
                  {mentions === 0 && unread > 0 && (
                    <span className="bg-discord-red text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {forumChannels.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => toggleCategory('forum')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-discord-muted uppercase tracking-wider px-2 mb-1 hover:text-discord-accent transition-colors w-full"
            >
              {collapsedCategories.forum ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              Форумы
            </button>

            {!collapsedCategories.forum && forumChannels.map(channel => {
              const unread = getChannelUnread?.(channel.id) || 0;
              const mentions = getChannelMention?.(channel.id) || 0;
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm transition-all duration-200 ${
                    currentChannel?.id === channel.id
                      ? 'bg-discord-blurple/20 text-discord-white border border-discord-blurple/30'
                      : mentions > 0
                      ? 'text-discord-white font-semibold hover:bg-discord-light/30'
                      : unread > 0
                      ? 'text-discord-white font-semibold hover:bg-discord-light/30'
                      : 'text-discord-gray hover:bg-discord-light/30 hover:text-discord-text'
                  }`}
                >
                  <MessageSquare size={18} className={mentions > 0 ? 'text-discord-accent' : 'text-discord-muted'} />
                  <span className="truncate flex-1 text-left">{channel.name}</span>
                  {mentions > 0 && (
                    <span className="bg-discord-accent text-discord-darker text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {mentions > 99 ? '99+' : mentions}
                    </span>
                  )}
                  {mentions === 0 && unread > 0 && (
                    <span className="bg-discord-red text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {voiceChannels.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => toggleCategory('voice')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-discord-muted uppercase tracking-wider px-2 mb-1 hover:text-discord-accent transition-colors w-full"
            >
              {collapsedCategories.voice ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              Голосовые каналы
            </button>

            {!collapsedCategories.voice && voiceChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm group transition-all duration-200 ${
                  currentChannel?.id === channel.id
                    ? 'bg-discord-blurple/20 text-discord-white border border-discord-blurple/30'
                    : 'text-discord-gray hover:bg-discord-light/30 hover:text-discord-text'
                }`}
              >
                <Volume2 size={18} className="text-discord-muted flex-shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={() => onOpenEvents?.()}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm text-discord-gray hover:bg-discord-light/30 hover:text-discord-accent transition-all duration-200"
          >
            <Calendar size={18} className="text-discord-muted" />
            <span className="truncate">События</span>
          </button>
        </div>
      </div>

      <div className="border-t border-discord-light/20">
        <button
          onClick={() => onOpenBoosts?.()}
          className="w-full flex items-center gap-2 px-4 py-3 text-discord-gray hover:bg-purple-500/10 hover:text-purple-400 transition-all duration-200"
        >
          <Zap size={18} />
          <span className="text-sm font-medium">Буст сервера</span>
        </button>

        <button
          onClick={() => setShowInvite(!showInvite)}
          className="w-full flex items-center gap-2 px-4 py-3 text-discord-gray hover:bg-discord-light/20 hover:text-discord-accent transition-all duration-200"
        >
          <UserPlus size={18} />
          <span className="text-sm font-medium">Пригласить людей</span>
        </button>

        {showInvite && (
          <div className="px-4 pb-3">
            <div className="bg-discord-mid rounded-xl p-3 border border-discord-light/20">
              <p className="text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">Код приглашения</p>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-discord-dark rounded-xl px-3 py-2 font-mono text-discord-white text-sm tracking-wider border border-discord-light/20">
                  {inviteCode}
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl bg-gradient-to-br from-discord-blurple to-discord-gradient2 hover:shadow-lg hover:shadow-discord-blurple/30 text-white transition-all duration-200 flex-shrink-0"
                  title="Скопировать"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              {(isOwner || isadmin) && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs text-discord-gray hover:text-discord-accent hover:bg-discord-light/20 transition-all duration-200"
                >
                  <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                  {regenerating ? 'Генерация...' : 'Сгенерировать новый код'}
                </button>
              )}

              <p className="text-[10px] text-discord-muted mt-2 text-center">
                Отправьте этот код человеку, чтобы он присоединился
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
