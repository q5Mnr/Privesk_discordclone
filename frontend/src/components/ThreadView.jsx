import React, { useState, useEffect, useRef } from 'react';
import { X, Hash, Send, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

function ThreadMessage({ message, user }) {
  const isOwn = message.user_id === user?.id;
  const timestamp = new Date(message.created_at + 'Z').toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`group px-4 py-1 hover:bg-discord-light/10 transition-colors ${isOwn ? 'flex flex-row-reverse gap-3' : 'flex gap-4'}`}>
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5 shadow-lg ${isOwn ? 'ml-2' : ''}`}>
        {message.avatar ? (
          <img src={message.avatar} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          message.username?.[0]?.toUpperCase() || '?'
        )}
      </div>
      <div className={`min-w-0 ${isOwn ? 'text-right' : ''}`}>
        <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'justify-end' : ''}`}>
          <span className="font-medium text-[13px] text-discord-white">{message.username}</span>
          <span className="text-[10px] text-discord-muted">#{message.tag}</span>
          <span className="text-[10px] text-discord-muted">{timestamp}</span>
        </div>
        <p className="text-discord-text text-[14px] break-words">{message.content}</p>
      </div>
    </div>
  );
}

export default function ThreadView({ thread, onClose, user, socket }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [threadInfo, setThreadInfo] = useState(thread);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
    if (socket) socket.emit('join_thread', thread.id);
    return () => { if (socket) socket.emit('leave_thread', thread.id); };
  }, [thread?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => {
      const msg = e.detail;
      if (msg.thread_id === thread?.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };
    window.addEventListener('thread_message', handler);
    return () => window.removeEventListener('thread_message', handler);
  }, [thread?.id]);

  const loadMessages = async () => {
    try {
      const data = await apiGet(`/api/threads/${thread.id}/messages`);
      setMessages(data);
    } catch (err) { console.error(err); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const msg = await apiPost(`/api/threads/${thread.id}/messages`, { content: newMessage });
      setNewMessage('');
      if (msg && msg.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch (err) { console.error(err); }
  };

  const handleArchive = async () => {
    try {
      await fetch(`/api/threads/${thread.id}/${threadInfo.archived ? 'unarchive' : 'archive'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setThreadInfo(prev => ({ ...prev, archived: prev.archived ? 0 : 1 }));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить ветку и все сообщения?')) return;
    try {
      await fetch(`/api/threads/${thread.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex flex-col h-full bg-discord-mid border-l border-discord-light/20" style={{ width: 400, minWidth: 400 }}>
      <div className="h-16 px-4 flex items-center border-b border-discord-light/20 shadow-sm flex-shrink-0 gap-2 bg-discord-mid/80 backdrop-blur-xl">
        <Hash size={18} className="text-discord-accent" />
        <h3 className="text-discord-white font-semibold text-sm truncate flex-1">{threadInfo.name}</h3>
        <span className="text-xs text-discord-muted">{threadInfo.message_count || 0} сообщений</span>
        <button onClick={handleArchive} className="p-1.5 rounded-xl text-discord-muted hover:text-discord-white hover:bg-discord-light/30 transition-all" title={threadInfo.archived ? 'Разархивировать' : 'Архивировать'}>
          {threadInfo.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
        </button>
        <button onClick={handleDelete} className="p-1.5 rounded-xl text-discord-muted hover:text-discord-red hover:bg-discord-red/10 transition-all" title="Удалить">
          <Trash2 size={16} />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-xl text-discord-muted hover:text-discord-white hover:bg-discord-light/30 transition-all">
          <X size={18} />
        </button>
      </div>

      {threadInfo.tags?.length > 0 && (
        <div className="px-4 py-2 flex gap-1.5 flex-wrap border-b border-discord-light/20">
          {threadInfo.tags.map(tag => (
            <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
              {tag.emoji} {tag.name}
            </span>
          ))}
        </div>
      )}

      {threadInfo.archived ? (
        <div className="flex-1 flex items-center justify-center text-discord-muted text-sm">
          <div className="text-center">
            <Archive size={32} className="mx-auto mb-2 text-discord-muted" />
            <p>Ветка архивирована</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto py-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Hash size={36} className="text-discord-muted mb-2" />
                <p className="text-discord-muted text-sm">Начало ветки «{threadInfo.name}»</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ThreadMessage key={msg.id} message={msg} user={user} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="px-3 pb-4 flex-shrink-0">
            <div className="bg-discord-dark border border-discord-light/20 rounded-xl flex items-center focus-within:border-discord-accent/50 transition-colors">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Написать в ветку..."
                className="flex-1 bg-transparent px-4 py-3 text-discord-text text-sm placeholder-discord-muted focus:outline-none"
              />
              <button type="submit" disabled={!newMessage.trim()} className="px-3 py-3 text-discord-accent hover:text-white disabled:text-discord-muted transition-colors">
                <Send size={18} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
