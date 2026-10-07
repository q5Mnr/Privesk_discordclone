import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AtSign, SmilePlus, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🔥', '💯', '✅', '❌', '🚀', '⭐'];

function DmMessageItem({ message, user, showHeader, onUsernameClick }) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || []);

  const isOwn = message.user_id === user?.id;
  const timestamp = new Date(message.created_at + 'Z').toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit'
  });

  useEffect(() => { setReactions(message.reactions || []); }, [message.reactions]);

  const handleEdit = async () => {
    try {
      await apiPut(`/api/dm/${message.dm_channel_id}/messages/${message.id}`, { content: editContent });
      setIsEditing(false);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try {
      await apiDelete(`/api/dm/${message.dm_channel_id}/messages/${message.id}`);
    } catch (err) { console.error(err); }
  };

  const handleReaction = async (emoji) => {
    try {
      const res = await apiPost(`/api/dm/${message.dm_channel_id}/messages/${message.id}/reactions`, { emoji });
      if (res.reactions) setReactions(res.reactions);
      setShowEmojiPicker(false);
    } catch (err) { console.error(err); }
  };

  const reactionsBlock = reactions.length > 0 && (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
      {reactions.map((r, i) => {
        const hasReacted = (r.user_ids || '').includes(user?.id);
        return (
          <button
            key={i}
            onClick={() => handleReaction(r.emoji)}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
              hasReacted
                ? 'bg-discord-accent/30 border border-discord-accent/50 text-white'
                : 'bg-discord-light/30 border border-discord-light/40 text-discord-gray hover:bg-discord-accent/20'
            }`}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );

  const actionsBar = showActions && (
    <div className={`absolute -top-3 ${isOwn ? 'left-4' : 'right-4'} bg-discord-darker border border-discord-light/20 rounded-xl flex shadow-xl z-10`}>
      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="p-1.5 hover:bg-discord-light/40 rounded-l-xl text-discord-muted hover:text-discord-text transition-colors"
        title="Реакция"
      >
        <SmilePlus size={16} />
      </button>
      {isOwn && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
        >
          <Pencil size={16} />
        </button>
      )}
      {isOwn && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 hover:bg-discord-red/20 rounded-xl text-discord-muted hover:text-discord-red transition-colors"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );

  const emojiPicker = showEmojiPicker && (
    <div className={`absolute -top-12 ${isOwn ? 'left-4' : 'right-4'} bg-discord-darker border border-discord-light/20 rounded-xl p-2 flex gap-1 shadow-xl z-20`}>
      {EMOJI_LIST.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          className="w-8 h-8 hover:bg-discord-light/40 rounded-lg flex items-center justify-center text-lg transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  const deleteConfirm = showDeleteConfirm && (
    <div className={`absolute -top-16 ${isOwn ? 'left-4' : 'right-4'} bg-discord-darker border border-discord-light/20 rounded-xl p-3 shadow-xl z-20 w-64`}>
      <p className="text-sm text-discord-white mb-2">Удалить сообщение?</p>
      <p className="text-xs text-discord-muted mb-3">Это действие нельзя отменить.</p>
      <div className="flex gap-2">
        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-2 py-1 text-xs text-discord-text bg-discord-light/40 rounded-lg hover:bg-discord-light/60 transition-colors">
          Отмена
        </button>
        <button onClick={handleDelete} className="flex-1 px-2 py-1 text-xs text-white bg-discord-red rounded-lg hover:opacity-80 transition-colors">
          Удалить
        </button>
      </div>
    </div>
  );

  if (isOwn) {
    return (
      <div
        className={`group relative px-4 hover:bg-discord-light/10 transition-colors ${showHeader ? 'mt-4' : 'mt-0.5'}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); setShowDeleteConfirm(false); }}
      >
        {actionsBar}
        {emojiPicker}
        {deleteConfirm}
        <div className="flex items-end gap-4 justify-end">
          <div className="text-right min-w-0">
            {showHeader && (
              <div className="flex items-baseline gap-2 justify-end mb-0.5">
                {message.edited_at && <span className="text-[11px] text-discord-muted">(ред.)</span>}
                <span className="text-[11px] text-discord-muted">{timestamp}</span>
                <span className="font-medium text-discord-accent text-[15px]">Вы</span>
              </div>
            )}
            {isEditing ? (
              <div className="flex gap-2 justify-end">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                  className="bg-discord-dark border border-discord-light/20 px-3 py-1 rounded-xl text-discord-text text-sm focus:outline-none focus:border-discord-accent/50"
                  autoFocus
                />
                <button onClick={handleEdit} className="text-xs text-discord-accent hover:underline">OK</button>
              </div>
            ) : (
              <div className="bg-discord-accent/20 border border-discord-accent/30 rounded-2xl rounded-tr-sm px-3 py-2 inline-block max-w-full">
                <p className="text-discord-text text-[15px] break-words">{message.content}</p>
              </div>
            )}
            {reactionsBlock}
          </div>
          {showHeader ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-lg">
              {message.username?.[0]?.toUpperCase() || 'В'}
            </div>
          ) : (
            <div className="w-10 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative px-4 hover:bg-discord-light/10 transition-colors ${showHeader ? 'mt-4' : 'mt-0.5'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); setShowDeleteConfirm(false); }}
    >
      {actionsBar}
      {emojiPicker}
      {deleteConfirm}
      <div className="flex gap-4">
        {showHeader ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-lg">
            {message.username?.[0]?.toUpperCase() || '?'}
          </div>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          {showHeader && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-medium text-discord-white text-[15px]">{message.username}</span>
              {message.edited_at && <span className="text-[11px] text-discord-muted">(ред.)</span>}
              <span className="text-[11px] text-discord-muted">{timestamp}</span>
            </div>
          )}
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                className="flex-1 bg-discord-dark border border-discord-light/20 px-3 py-1 rounded-xl text-discord-text text-sm focus:outline-none focus:border-discord-accent/50"
                autoFocus
              />
              <button onClick={handleEdit} className="text-xs text-discord-accent hover:underline">OK</button>
            </div>
          ) : (
            <p className="text-discord-text text-[15px] break-words">{message.content}</p>
          )}
          {reactionsBlock}
        </div>
      </div>
    </div>
  );
}

export default function DmChat({ socket, user }) {
  const { dmId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [dmChannel, setDmChannel] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (dmId) {
      loadDmChannel();
      loadMessages();
      setTypingUsers({});
    }
  }, [dmId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket || !dmId) return;

    const handleDmMessage = (e) => {
      if (e.detail.dm_channel_id === dmId) {
        setMessages(prev => prev.some(m => m.id === e.detail.id) ? prev : [...prev, e.detail]);
      }
    };
    const handleDmEdited = (e) => {
      if (e.detail.dm_channel_id === dmId) {
        setMessages(prev => prev.map(m => m.id === e.detail.id ? { ...m, content: e.detail.content, edited_at: e.detail.edited_at } : m));
      }
    };
    const handleDmDeleted = (e) => {
      if (e.detail.dm_channel_id === dmId) {
        setMessages(prev => prev.filter(m => m.id !== e.detail.message_id));
      }
    };
    const handleDmReaction = (e) => {
      if (e.detail.dm_channel_id === dmId) {
        setMessages(prev => prev.map(m => m.id === e.detail.message_id ? { ...m, reactions: e.detail.reactions } : m));
      }
    };
    const handleTyping = (e) => {
      if (e.detail.channelId === dmId && e.detail.userId !== user?.id) {
        setTypingUsers(prev => ({ ...prev, [e.detail.userId]: e.detail.username }));
        setTimeout(() => setTypingUsers(prev => { const n = { ...prev }; delete n[e.detail.userId]; return n; }), 3000);
      }
    };
    const handleStopTyping = (e) => {
      if (e.detail.channelId === dmId) {
        setTypingUsers(prev => { const n = { ...prev }; delete n[e.detail.userId]; return n; });
      }
    };

    window.addEventListener('dm_message', handleDmMessage);
    window.addEventListener('dm_message_edited', handleDmEdited);
    window.addEventListener('dm_message_deleted', handleDmDeleted);
    window.addEventListener('dm_reaction_updated', handleDmReaction);
    window.addEventListener('dm_user_typing', handleTyping);
    window.addEventListener('dm_user_stop_typing', handleStopTyping);
    return () => {
      window.removeEventListener('dm_message', handleDmMessage);
      window.removeEventListener('dm_message_edited', handleDmEdited);
      window.removeEventListener('dm_message_deleted', handleDmDeleted);
      window.removeEventListener('dm_reaction_updated', handleDmReaction);
      window.removeEventListener('dm_user_typing', handleTyping);
      window.removeEventListener('dm_user_stop_typing', handleStopTyping);
    };
  }, [socket, dmId, user?.id]);

  const loadDmChannel = async () => {
    try {
      const data = await apiGet('/api/dm');
      const found = data.find(d => d.id === dmId);
      setDmChannel(found);
    } catch (err) { console.error(err); }
  };

  const loadMessages = async () => {
    if (!dmId) return;
    try {
      const data = await apiGet(`/api/dm/${dmId}/messages`);
      setMessages(data);
    } catch (err) { console.error(err); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !dmId) return;

    const content = newMessage;
    setNewMessage('');

    if (socket) {
      socket.emit('dm_stop_typing', { channelId: dmId });
    }

    try {
      const sentMsg = await apiPost(`/api/dm/${dmId}/messages`, { content });
      sentMsg.reactions = [];
      setMessages(prev => prev.some(m => m.id === sentMsg.id) ? prev : [...prev, sentMsg]);
    } catch (err) {
      console.error(err);
      setNewMessage(content);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socket && dmId) {
      socket.emit('dm_typing', { channelId: dmId, username: user?.username });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('dm_stop_typing', { channelId: dmId });
      }, 2000);
    }
  };

  const otherUser = dmChannel?.members?.[0];
  const typingList = Object.values(typingUsers);

  return (
    <div className="flex flex-col h-full bg-discord-mid">
      <div className="h-16 px-4 flex items-center border-b border-discord-light/20 shadow-sm flex-shrink-0 bg-discord-mid/80 backdrop-blur-xl">
        <AtSign size={20} className="text-discord-accent mr-2" />
        <h3 className="text-discord-white font-semibold">{otherUser?.username || 'Пользователь'}<span className="text-discord-muted font-normal text-sm">#{otherUser?.tag}</span></h3>
        <div className={`w-3 h-3 rounded-full ml-2 shadow-lg ${otherUser?.status === 'online' ? 'bg-discord-green shadow-discord-green/50' : 'bg-discord-muted'}`} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-3xl mb-4 shadow-2xl shadow-discord-blurple/30">
              {otherUser?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <h3 className="text-xl font-bold text-discord-white mb-2">{otherUser?.username}</h3>
            <p className="text-discord-muted">Это начало вашей переписки.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const showHeader = i === 0 || messages[i - 1]?.user_id !== msg.user_id;
          return (
            <DmMessageItem
              key={msg.id}
              message={{ ...msg, dm_channel_id: dmId }}
              user={user}
              showHeader={showHeader}
              onUsernameClick={() => {}}
            />
          );
        })}

        {typingList.length > 0 && (
          <div className="px-4 py-1 text-xs text-discord-muted">
            {typingList.join(', ')} {typingList.length === 1 ? 'печатает' : 'печатают'}...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="px-4 pb-6 flex-shrink-0">
        <div className="bg-discord-dark border border-discord-light/20 rounded-xl flex items-center focus-within:border-discord-accent/50 transition-colors">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder={`Написать @${otherUser?.username || 'пользователю'}`}
            className="flex-1 bg-transparent px-4 py-3 text-discord-text placeholder-discord-muted focus:outline-none text-sm"
          />
        </div>
      </form>
    </div>
  );
}
