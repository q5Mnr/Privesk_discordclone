import React, { useState, useEffect, useRef } from 'react';
import { Hash, Users, Search, Pin, X, Reply, Volume2, Send, Smile } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';
import { getChannelDraft, setChannelDraft } from '../utils/drafts';
import MessageItem from './MessageItem';
import VoiceChannel from './VoiceChannel';
import EmojiPicker from './EmojiPicker';

export default function ChatArea({ channel, server, socket, user, onUsernameClick, members, onOpenThread, myPermissions }) {
  const canSendMessages = !server || (myPermissions & 1) !== 0;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showMembers, setShowMembers] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [ownedEmojis, setOwnedEmojis] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const draftSaveRef = useRef(null);
  const newMessageRef = useRef('');

  useEffect(() => {
    newMessageRef.current = newMessage;
  }, [newMessage]);

  useEffect(() => {
    if (user) {
      apiGet('/api/collection/my').then(d => setOwnedEmojis(d.emojis || [])).catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    if (!channel?.id) return;
    loadMessages();
    setTypingUsers([]);
    setReplyTo(null);
    setShowSearch(false);
    setShowPins(false);
    setSearchQuery('');
    setSearchResults([]);
    setNewMessage(getChannelDraft(channel.id));
    return () => {
      setChannelDraft(channel.id, newMessageRef.current);
    };
  }, [channel?.id]);

  useEffect(() => {
    const handleNewMessage = (e) => {
      setMessages(prev => {
        if (prev.some(m => m.id === e.detail.id)) return prev;
        return [...prev, e.detail];
      });
    };
    const handleEdited = (e) => {
      setMessages(prev => prev.map(m => m.id === e.detail.id ? e.detail : m));
    };
    const handleDeleted = (e) => {
      setMessages(prev => prev.filter(m => m.id !== e.detail.id));
    };
    const handleTyping = (e) => {
      if (e.detail.channelId === channel?.id && e.detail.userId !== user?.id) {
        setTypingUsers(prev => {
          if (!prev.find(u => u.userId === e.detail.userId)) {
            return [...prev, { userId: e.detail.userId, username: e.detail.username }];
          }
          return prev;
        });
      }
    };
    const handleStopTyping = (e) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== e.detail.userId));
    };
    const handleReactionUpdated = (e) => {
      const { message_id, reactions } = e.detail;
      setMessages(prev => prev.map(m =>
        m.id === message_id ? { ...m, reactions } : m
      ));
    };

    window.addEventListener('new_message', handleNewMessage);
    window.addEventListener('message_edited', handleEdited);
    window.addEventListener('message_deleted', handleDeleted);
    window.addEventListener('user_typing', handleTyping);
    window.addEventListener('user_stop_typing', handleStopTyping);
    window.addEventListener('reaction_updated', handleReactionUpdated);

    return () => {
      window.removeEventListener('new_message', handleNewMessage);
      window.removeEventListener('message_edited', handleEdited);
      window.removeEventListener('message_deleted', handleDeleted);
      window.removeEventListener('user_typing', handleTyping);
      window.removeEventListener('user_stop_typing', handleStopTyping);
      window.removeEventListener('reaction_updated', handleReactionUpdated);
    };
  }, [channel?.id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!channel) return;
    try {
      const data = await apiGet(`/api/messages/${channel.id}`);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage;
    const reply = replyTo;
    setNewMessage('');
    setReplyTo(null);
    setMentionQuery(null);
    setChannelDraft(channel.id, '');

    try {
      const sentMsg = await apiPost(`/api/messages/${channel.id}`, {
        content,
        reply_to: reply?.id || null
      });
      if (sentMsg && sentMsg.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
      if (socket) {
        socket.emit('stop_typing', { channelId: channel.id, serverId: server.id });
      }
    } catch (err) {
      console.error('Send failed:', err);
      setNewMessage(content);
      if (reply) setReplyTo(reply);
    }
  };

  const handleTyping = () => {
    if (socket && server) {
      socket.emit('typing', {
        channelId: channel.id,
        serverId: server.id,
        username: user.username
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && server) socket.emit('stop_typing', { channelId: channel.id, serverId: server.id });
    }, 3000);
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await apiGet(`/api/messages/${channel.id}/search?q=${encodeURIComponent(q)}`);
        setSearchResults(data);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);

    if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    draftSaveRef.current = setTimeout(() => {
      setChannelDraft(channel.id, val);
    }, 250);

    const atPos = val.lastIndexOf('@');
    if (atPos >= 0 && (atPos === 0 || val[atPos - 1] === ' ')) {
      const query = val.slice(atPos + 1).toLowerCase();
      if (query.length <= 20 && !query.includes(' ')) {
        setMentionQuery(query);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  const getFilteredMembers = () => {
    if (mentionQuery === null) return [];
    const list = (members || []).filter(m => m.id !== user?.id);
    if (!mentionQuery) return list.slice(0, 8);
    return list.filter(m => m.username.toLowerCase().includes(mentionQuery)).slice(0, 8);
  };

  const insertMention = (username) => {
    const atPos = newMessage.lastIndexOf('@');
    const before = newMessage.slice(0, atPos);
    setNewMessage(`${before}@${username} `);
    setMentionQuery(null);
  };

  const handleMentionKeyDown = (e) => {
    const filtered = getFilteredMembers();
    if (mentionQuery !== null && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && filtered.length > 0)) {
        e.preventDefault();
        insertMention(filtered[mentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
  };

  const handlePin = async (message) => {
    try {
      const res = await fetch(`/api/messages/${message.id}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.pinned !== undefined) {
        loadMessages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPins = async () => {
    try {
      const data = await apiGet(`/api/messages/${channel.id}/pins`);
      setPinnedMessages(data);
      setShowPins(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  if (channel.type === 'voice') {
    return (
      <div className="flex-1 flex flex-col bg-discord-mid">
        <div className="h-12 px-4 flex items-center border-b border-black/30 shadow-sm">
          <Volume2 size={20} className="text-discord-muted mr-2" />
          <h3 className="text-white font-semibold">{channel.name}</h3>
        </div>
        <VoiceChannel channel={channel} server={server} socket={socket} user={user} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-discord-mid min-w-0">
      {/* Header */}
      <div className="h-14 px-4 flex items-center border-b border-discord-light/20 shadow-sm flex-shrink-0">
        <Hash size={20} className="text-discord-accent mr-2" />
        <h3 className="text-discord-white font-semibold">{channel.name}</h3>
        {channel.topic && (
          <>
            <div className="w-px h-6 bg-discord-light/30 mx-3" />
            <span className="text-sm text-discord-gray truncate">{channel.topic}</span>
          </>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-discord-gray">
          <button onClick={loadPins} className="hover:text-discord-accent transition-colors" title="Закреплённые">
            <Pin size={20} />
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className="hover:text-discord-accent transition-colors" title="Поиск">
            <Search size={20} />
          </button>
          <button onClick={() => setShowMembers(!showMembers)} className="hover:text-discord-accent transition-colors">
            <Users size={20} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-discord-light/20 bg-discord-darker">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-discord-muted flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Поиск сообщений..."
              autoFocus
              className="flex-1 bg-transparent text-discord-text text-sm focus:outline-none placeholder-discord-muted"
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="text-discord-gray hover:text-discord-accent">
              <X size={16} />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto">
              <p className="text-xs text-discord-muted mb-1">Найдено: {searchResults.length}</p>
              {searchResults.map(msg => (
                <div
                  key={msg.id}
                  className="px-3 py-2 bg-discord-darkest rounded-xl mb-1 hover:bg-discord-light/30 transition-all duration-200 cursor-pointer border border-discord-light/10"
                  onClick={() => {
                    const el = document.getElementById(`msg-${msg.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setHighlightedMessageId(msg.id);
                    setTimeout(() => setHighlightedMessageId(null), 2000);
                    setShowSearch(false);
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-sm font-medium">{msg.username}</span>
                    <span className="text-[10px] text-discord-muted">#{msg.tag}</span>
                    <span className="text-[10px] text-discord-muted">{new Date(msg.created_at + 'Z').toLocaleString('ru-RU')}</span>
                  </div>
                  <p className="text-sm text-discord-text truncate">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pinned panel */}
      {showPins && (
        <div className="px-4 py-3 border-b border-discord-light/20 bg-discord-darker">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-discord-white flex items-center gap-1.5"><Pin size={14} /> Закреплённые</h4>
            <button onClick={() => setShowPins(false)} className="text-discord-gray hover:text-discord-accent"><X size={16} /></button>
          </div>
          {pinnedMessages.length === 0 ? (
            <p className="text-xs text-discord-muted">Нет закреплённых сообщений</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {pinnedMessages.map(msg => (
                <div key={msg.id} className="px-3 py-2 bg-discord-darkest rounded text-sm">
                  <span className="text-white font-medium">{msg.username}</span>
                  <span className="text-discord-muted text-xs ml-1">#{msg.tag}</span>
                  <p className="text-discord-text mt-0.5">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2" id="messages-container">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-discord-blurple/20 to-discord-accent/20 flex items-center justify-center mb-4 border border-discord-light/20">
              <Hash size={32} className="text-discord-accent" />
            </div>
            <h3 className="text-xl font-bold text-discord-white mb-2">Добро пожаловать в #{channel.name}!</h3>
            <p className="text-discord-gray">Это начало канала.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id}
            id={`msg-${msg.id}`}
            className={highlightedMessageId === msg.id ? 'message-highlight' : undefined}
          >
              <MessageItem
              message={msg}
              user={user}
              showHeader={i === 0 || messages[i - 1]?.user_id !== msg.user_id}
              onReply={handleReply}
              onPin={handlePin}
              onUsernameClick={onUsernameClick}
              onOpenThread={onOpenThread}
              myPermissions={myPermissions}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-sm text-discord-gray flex items-center gap-1">
          <span className="typing-indicator text-discord-accent">●●●</span>
          <span>{typingUsers.map(u => u.username).join(', ')} печатает...</span>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-discord-darker border-t border-discord-accent/30 flex items-center gap-2">
          <Reply size={14} className="text-discord-accent flex-shrink-0" />
          <span className="text-xs text-discord-muted">Ответ на</span>
          <span className="text-xs text-discord-white font-medium">{replyTo.username}#{replyTo.tag}</span>
          <span className="text-xs text-discord-gray truncate flex-1">{replyTo.content}</span>
          <button onClick={() => setReplyTo(null)} className="text-discord-gray hover:text-discord-accent">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="relative px-4 pb-6 flex-shrink-0">
        {mentionQuery !== null && getFilteredMembers().length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-discord-darker border border-discord-light/20 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-56 overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-bold text-discord-accent uppercase tracking-wider border-b border-discord-light/20">
              Упомянуть участника
            </div>
            {getFilteredMembers().map((m, i) => (
              <button
                key={m.id}
                onClick={() => insertMention(m.username)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-200 ${
                  i === mentionIndex ? 'bg-discord-blurple/20 text-discord-white' : 'text-discord-text hover:bg-discord-light/30'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    m.username?.[0]?.toUpperCase() || '?'
                  )}
                </span>
                <span className="font-medium">{m.username}</span>
                <span className="text-discord-muted text-xs">#{m.tag}</span>
              </button>
            ))}
          </div>
        )}
        {canSendMessages ? (
        <form onSubmit={handleSend} className="relative bg-discord-light/50 rounded-2xl flex items-center border border-discord-light/30 focus-within:border-discord-accent/30 transition-colors">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleMentionKeyDown}
            onInput={handleTyping}
            placeholder={replyTo ? `Ответить ${replyTo.username}...` : `Написать в #${channel.name}`}
            className="flex-1 bg-transparent px-4 py-3 text-discord-text placeholder-discord-muted focus:outline-none"
          />
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="px-2 py-3 text-discord-gray hover:text-discord-yellow transition-colors">
            <Smile size={20} />
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-3 text-discord-accent hover:text-white disabled:text-discord-muted transition-colors"
          >
            <Send size={20} />
          </button>
          {showEmojiPicker && (
            <EmojiPicker
              ownedEmojis={ownedEmojis}
              onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </form>
        ) : (
        <div className="bg-discord-light/50 rounded-2xl px-4 py-3 text-discord-muted text-sm text-center border border-discord-light/30">
          У вас нет прав отправлять сообщения в этом канале
        </div>
        )}
      </div>
    </div>
  );
}
