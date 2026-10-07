import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Pencil, Trash2, SmilePlus, Reply, Pin, MessageSquare, Copy, Check } from 'lucide-react';
import { apiPost } from '../utils/api';

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🔥', '💯', '✅', '❌', '🚀', '⭐'];

const EMOJI_MAP = {
  star:'⭐',fire:'🔥',thumbsup:'👍',heart:'❤️',moon:'🌙',sun:'☀️',butterfly:'🦋',paw:'🐾',
  rocket:'🚀',gem:'💎',skull:'💀',lightning:'⚡',ice:'🧊',sword:'⚔️',shield:'🛡️',diamond:'💠',eye:'👁️',
  crown:'👑',trophy:'🏆',ghost:'👻',rainbow:'🌈',volcano:'🌋',crystal:'🔮',brain:'🧠',
  dragon:'🐉',unicorn:'🦄',alien:'👽',blackhole:'🕳️',shooting_star:'🌠',
  phoenix:'🔥',void:'🌑',time:'⏳',universe:'🌌',infinity:'♾️',
  admin_crown:'👑',devmode:'🔧',hacker:'💻',godmode:'⚡',sosiska:'🌭',
};

function renderMarkdown(text) {
  if (!text) return null;
  const elements = [];
  let key = 0;

  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBlockContent = '';
  let codeBlockLang = '';

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];

    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={key++} className="my-1 bg-black/40 rounded-lg p-3 overflow-x-auto border border-discord-light/10">
            <code className="text-sm text-green-400 font-mono whitespace-pre">{codeBlockContent}</code>
          </pre>
        );
        codeBlockContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line;
      continue;
    }

    if (line.startsWith('> ')) {
      elements.push(
        <div key={key++} className="border-l-4 border-discord-muted pl-3 my-1 text-discord-gray italic">
          {renderInlineMarkdown(line.slice(2))}
        </div>
      );
      continue;
    }

    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    elements.push(
      <p key={key++} className="text-discord-text text-[15px] break-words">
        {renderInlineMarkdown(line)}
      </p>
    );
  }

  if (inCodeBlock && codeBlockContent) {
    elements.push(
      <pre key={key++} className="my-1 bg-black/40 rounded-lg p-3 overflow-x-auto border border-discord-light/10">
        <code className="text-sm text-green-400 font-mono whitespace-pre">{codeBlockContent}</code>
      </pre>
    );
  }

  return elements.length === 1 ? elements[0] : <>{elements}</>;
}

function renderInlineMarkdown(text) {
  if (!text) return null;
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliest = -1;
    let matchType = '';
    let matchLen = 0;

    const boldStar = remaining.indexOf('**');
    const italicStar = remaining.indexOf('*');
    const codeTick = remaining.indexOf('`');
    const strikeTilde = remaining.indexOf('~~');
    const mentionIdx = remaining.indexOf('@');

    const candidates = [
      { pos: boldStar, type: 'bold', len: 2 },
      { pos: strikeTilde, type: 'strike', len: 2 },
      { pos: codeTick, type: 'code', len: 1 },
      { pos: italicStar, type: 'italic', len: 1 },
      { pos: mentionIdx, type: 'mention', len: 1 },
    ].filter(c => c.pos >= 0).sort((a, b) => a.pos - b.pos);

    if (candidates.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const first = candidates[0];

    if (first.pos > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first.pos)}</span>);
    }

    remaining = remaining.slice(first.pos);

    if (first.type === 'bold' && remaining.startsWith('**')) {
      const end = remaining.indexOf('**', 2);
      if (end > 2) {
        parts.push(<strong key={key++} className="font-bold text-discord-white">{remaining.slice(2, end)}</strong>);
        remaining = remaining.slice(end + 2);
        continue;
      }
    }

    if (first.type === 'strike' && remaining.startsWith('~~')) {
      const end = remaining.indexOf('~~', 2);
      if (end > 2) {
        parts.push(<s key={key++} className="line-through text-discord-gray">{remaining.slice(2, end)}</s>);
        remaining = remaining.slice(end + 2);
        continue;
      }
    }

    if (first.type === 'code' && remaining.startsWith('`')) {
      const end = remaining.indexOf('`', 1);
      if (end > 1) {
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 bg-black/30 rounded text-pink-400 text-[13px] font-mono border border-discord-light/10">
            {remaining.slice(1, end)}
          </code>
        );
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    if (first.type === 'italic' && remaining.startsWith('*') && !remaining.startsWith('**')) {
      const end = remaining.indexOf('*', 1);
      if (end > 1) {
        parts.push(<em key={key++} className="italic text-discord-white">{remaining.slice(1, end)}</em>);
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    if (first.type === 'mention' && remaining.startsWith('@')) {
      const m = remaining.slice(1).match(/^(\w+)/);
      if (m) {
        parts.push(
          <span key={key++} className="bg-discord-blurple/30 text-discord-blurple hover:bg-discord-blurple/50 rounded px-1 py-0.5 cursor-pointer transition-colors font-medium">
            @{m[1]}
          </span>
        );
        remaining = remaining.slice(1 + m[1].length);
        continue;
      }
    }

    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return parts;
}

function renderContent(text) {
  if (!text) return null;
  return renderMarkdown(text);
}

function MessageItem({ message, user, showHeader, onReply, onPin, onUsernameClick, onOpenThread, myPermissions }) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || []);

  const isOwn = message.user_id === user?.id;
  const canManageMessages = isOwn || ((myPermissions || 0) & 2) !== 0;
  const canPin = isOwn || ((myPermissions || 0) & 512) !== 0;
  const timestamp = new Date(message.created_at + 'Z').toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const getTextColor = () => {
    if (message.role_color) return message.role_color;
    if (message.user_name_color) {
      if (message.user_name_color.startsWith('linear')) return message.user_name_color;
      return message.user_name_color;
    }
    return null;
  };

  const handleEdit = async () => {
    try {
      await fetch(`/api/messages/${message.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: editContent })
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/messages/${message.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateThread = async () => {
    const name = prompt('Название треда:');
    if (!name?.trim()) return;
    try {
      const thread = await apiPost('/api/threads', {
        channel_id: message.channel_id,
        name: name.trim()
      });
      if (onOpenThread && thread) {
        onOpenThread(thread, { id: message.channel_id });
      }
    } catch (err) { console.error(err); }
  };

  const handleCopyText = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReaction = async (emoji) => {
    try {
      const res = await fetch(`/api/messages/${message.id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (data.reactions) setReactions(data.reactions);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setReactions(message.reactions || []);
  }, [message.reactions]);

  if (isOwn) {
    return (
      <div
        className={`group relative px-4 hover:bg-discord-light/20 transition-colors ${showHeader ? 'mt-4' : 'mt-0.5'}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); setShowDeleteConfirm(false); }}
      >
        {showActions && (
          <div className="absolute -top-3 right-4 bg-discord-darker border border-discord-light/20 rounded-xl flex shadow-xl z-10">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-discord-light/40 rounded-l-xl text-discord-muted hover:text-discord-text transition-colors"
              title="Реакция"
            >
              <SmilePlus size={16} />
            </button>
            <button
              onClick={() => onReply?.(message)}
              className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
              title="Ответить"
            >
              <Reply size={16} />
            </button>
            {message.content && (
              <button
                onClick={handleCopyText}
                className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
                title={copied ? 'Скопировано' : 'Копировать текст'}
              >
                {copied ? <Check size={16} className="text-discord-green" /> : <Copy size={16} />}
              </button>
            )}
            <button
              onClick={() => onPin?.(message)}
              className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
              title="Закрепить"
            >
              <Pin size={16} />
            </button>
            <button
              onClick={handleCreateThread}
              className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
              title="Создать тред"
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 hover:bg-discord-red/20 rounded-xl text-discord-muted hover:text-discord-red transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute -top-12 right-4 bg-discord-darker border border-discord-light/20 rounded-xl p-2 flex gap-1 shadow-xl z-20">
            {EMOJI_LIST.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="w-8 h-8 hover:bg-discord-light rounded flex items-center justify-center text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {showDeleteConfirm && (
          <div className="absolute -top-16 right-4 bg-discord-darker border border-discord-light/20 rounded-xl p-3 shadow-xl z-20 w-64">
            <p className="text-sm text-white mb-2">Удалить сообщение?</p>
            <p className="text-xs text-discord-gray mb-3">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-2 py-1 text-xs text-white bg-discord-light rounded hover:bg-discord-lighter transition-colors">
                Отмена
              </button>
              <button onClick={handleDelete} className="flex-1 px-2 py-1 text-xs text-white bg-discord-red rounded hover:opacity-80 transition-colors">
                Удалить
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <div className="min-w-0 flex-1 flex flex-col items-end">
            {showHeader && (
              <div className="flex items-baseline gap-2 mb-0.5">
                {message.edited_at && (
                  <span className="text-xs text-discord-muted">(ред.)</span>
                )}
                <span className="text-xs text-discord-muted">{timestamp}</span>
                <button
                  onClick={() => onUsernameClick?.(message.user_id)}
                  className="font-medium hover:underline cursor-pointer text-[15px] text-right"
                  style={getTextColor()?.startsWith('linear') ? { background: getTextColor(), WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: getTextColor() || '#ffffff' }}
                >
                  {message.username}
                  {message.equipped_emoji_id && EMOJI_MAP[message.equipped_emoji_id] && (
                    <span className="ml-1 text-sm" title="Значок на профиле">{EMOJI_MAP[message.equipped_emoji_id]}</span>
                  )}
                  {message.user_level >= 2 && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border"
                      style={{
                        backgroundColor: message.user_level >= 50 ? 'rgba(245,158,11,0.15)' : message.user_level >= 25 ? 'rgba(139,92,246,0.15)' : message.user_level >= 10 ? 'rgba(59,130,246,0.15)' : 'rgba(107,114,128,0.15)',
                        borderColor: message.user_level >= 50 ? 'rgba(245,158,11,0.3)' : message.user_level >= 25 ? 'rgba(139,92,246,0.3)' : message.user_level >= 10 ? 'rgba(59,130,246,0.3)' : 'rgba(107,114,128,0.3)',
                        color: message.user_level >= 50 ? '#f59e0b' : message.user_level >= 25 ? '#8b5cf6' : message.user_level >= 10 ? '#3b82f6' : '#9ca3af',
                      }}
                      title={`Уровень ${message.user_level}`}>
                      Lvl {message.user_level}
                    </span>
                  )}
                  <span className="text-discord-muted font-normal text-xs ml-0.5">#{message.tag}</span>
                </button>
              </div>
            )}

            {message.reply_to && message.reply_to_message && (
              <div className="flex items-center gap-1.5 mb-1 text-xs text-discord-muted">
                <span className="font-medium text-discord-gray">
                  {message.reply_to_message.username}#{message.reply_to_message.tag}
                </span>
                <span className="truncate max-w-xs opacity-70">{message.reply_to_message.content}</span>
                <Reply size={12} className="flex-shrink-0" />
              </div>
            )}

            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="flex-1 bg-discord-light px-2 py-1 rounded text-discord-text text-sm focus:outline-none"
                  autoFocus
                />
                <button onClick={handleEdit} className="text-xs text-discord-blurple hover:underline">
                  Сохранить
                </button>
              </div>
            ) : (
              <div className="bg-discord-blurple/20 border border-discord-blurple/30 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[70%]">
                <p className="text-discord-text text-[15px] break-words">{renderContent(message.content)}</p>
              </div>
              )}

            {message.attachments?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {message.attachments.map(att => (
                  <div key={att.id}>
                    {att.mime_type?.startsWith('image/') ? (
                      <img src={att.url} alt={att.original_name} className="max-w-sm max-h-64 rounded object-cover cursor-pointer hover:opacity-90" />
                    ) : (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-discord-darker/50 px-3 py-2 rounded text-sm text-discord-blurple hover:underline">
                        📎 {att.original_name}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {reactions.map((r, i) => {
                  const hasReacted = r.user_ids?.includes(user?.id);
                  return (
                    <button
                      key={i}
                      onClick={() => handleReaction(r.emoji)}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                        hasReacted
                          ? 'bg-discord-blurple/30 border border-discord-blurple/50 text-white'
                          : 'bg-discord-blurple/20 border border-discord-blurple/30 text-discord-blurple hover:bg-discord-blurple/30'
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {showHeader ? (
            <button
              onClick={() => onUsernameClick?.(message.user_id)}
              className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-0.5 hover:opacity-80 transition-opacity"
            >
              {message.avatar ? (
                <img src={message.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                message.username?.[0]?.toUpperCase() || '?'
              )}
            </button>
          ) : (
            <div className="w-10 flex-shrink-0 flex items-center justify-center">
              <span className="text-[10px] text-discord-muted opacity-0 group-hover:opacity-100 transition-opacity">
                {timestamp}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative px-4 hover:bg-discord-light/20 transition-colors ${showHeader ? 'mt-4' : 'mt-0.5'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); setShowDeleteConfirm(false); }}
    >
      {showActions && (
          <div className="absolute -top-3 right-4 bg-discord-darker border border-discord-light/20 rounded-xl flex shadow-xl z-10">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 hover:bg-discord-light rounded-l-lg text-discord-gray hover:text-discord-text transition-colors"
            title="Реакция"
          >
            <SmilePlus size={16} />
          </button>
          <button
            onClick={() => onReply?.(message)}
            className="p-1.5 hover:bg-discord-light text-discord-gray hover:text-discord-text transition-colors"
            title="Ответить"
          >
            <Reply size={16} />
          </button>
          {message.content && (
            <button
              onClick={handleCopyText}
              className="p-1.5 hover:bg-discord-light text-discord-gray hover:text-discord-text transition-colors"
              title={copied ? 'Скопировано' : 'Копировать текст'}
            >
              {copied ? <Check size={16} className="text-discord-green" /> : <Copy size={16} />}
            </button>
          )}
          {canPin && (
            <button
              onClick={() => onPin?.(message)}
              className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
              title="Закрепить"
            >
              <Pin size={16} />
            </button>
          )}
          <button
            onClick={handleCreateThread}
            className="p-1.5 hover:bg-discord-light text-discord-gray hover:text-discord-text transition-colors"
            title="Создать тред"
          >
            <MessageSquare size={16} />
          </button>
          {canManageMessages && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-discord-light/40 text-discord-muted hover:text-discord-text transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 hover:bg-discord-red/20 rounded-xl text-discord-muted hover:text-discord-red transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      )}

      {showEmojiPicker && (
          <div className="absolute -top-12 right-4 bg-discord-darker border border-discord-light/20 rounded-xl p-2 flex gap-1 shadow-xl z-20">
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="w-8 h-8 hover:bg-discord-light rounded flex items-center justify-center text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
          <div className="absolute -top-16 right-4 bg-discord-darker border border-discord-light/20 rounded-xl p-3 shadow-xl z-20 w-64">
          <p className="text-sm text-white mb-2">Удалить сообщение?</p>
          <p className="text-xs text-discord-gray mb-3">Это действие нельзя отменить.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-2 py-1 text-xs text-white bg-discord-light rounded hover:bg-discord-lighter transition-colors">
              Отмена
            </button>
            <button onClick={handleDelete} className="flex-1 px-2 py-1 text-xs text-white bg-discord-red rounded hover:opacity-80 transition-colors">
              Удалить
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {showHeader ? (
          <button
            onClick={() => onUsernameClick?.(message.user_id)}
            className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 mt-0.5 hover:opacity-80 transition-opacity"
          >
            {message.avatar ? (
              <img src={message.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              message.username?.[0]?.toUpperCase() || '?'
            )}
          </button>
        ) : (
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <span className="text-[10px] text-discord-muted opacity-0 group-hover:opacity-100 transition-opacity">
              {timestamp}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {showHeader && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <button
                onClick={() => onUsernameClick?.(message.user_id)}
                className="font-medium hover:underline cursor-pointer text-[15px] text-left"
                style={getTextColor()?.startsWith('linear') ? { background: getTextColor(), WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: getTextColor() || '#ffffff' }}
              >
                {message.username}
                {message.equipped_emoji_id && EMOJI_MAP[message.equipped_emoji_id] && (
                  <span className="ml-1 text-sm" title="Значок на профиле">{EMOJI_MAP[message.equipped_emoji_id]}</span>
                )}
                {message.user_level >= 2 && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border"
                    style={{
                      backgroundColor: message.user_level >= 50 ? 'rgba(245,158,11,0.15)' : message.user_level >= 25 ? 'rgba(139,92,246,0.15)' : message.user_level >= 10 ? 'rgba(59,130,246,0.15)' : 'rgba(107,114,128,0.15)',
                      borderColor: message.user_level >= 50 ? 'rgba(245,158,11,0.3)' : message.user_level >= 25 ? 'rgba(139,92,246,0.3)' : message.user_level >= 10 ? 'rgba(59,130,246,0.3)' : 'rgba(107,114,128,0.3)',
                      color: message.user_level >= 50 ? '#f59e0b' : message.user_level >= 25 ? '#8b5cf6' : message.user_level >= 10 ? '#3b82f6' : '#9ca3af',
                    }}
                    title={`Уровень ${message.user_level}`}>
                    Lvl {message.user_level}
                  </span>
                )}
                <span className="text-discord-muted font-normal text-xs ml-0.5">#{message.tag}</span>
              </button>
              <span className="text-xs text-discord-muted">{timestamp}</span>
              {message.edited_at && (
                <span className="text-xs text-discord-muted">(ред.)</span>
              )}
            </div>
          )}

          {message.reply_to && message.reply_to_message && (
            <div className="flex items-center gap-1.5 mb-1 text-xs text-discord-muted">
              <Reply size={12} className="flex-shrink-0" />
              <span className="font-medium text-discord-gray">
                {message.reply_to_message.username}#{message.reply_to_message.tag}
              </span>
              <span className="truncate max-w-xs opacity-70">{message.reply_to_message.content}</span>
            </div>
          )}

          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="flex-1 bg-discord-light px-2 py-1 rounded text-discord-text text-sm focus:outline-none"
                autoFocus
              />
              <button onClick={handleEdit} className="text-xs text-discord-blurple hover:underline">
                Сохранить
              </button>
            </div>
          ) : (
            <p className="text-discord-text text-[15px] break-words">{renderContent(message.content)}</p>
          )}

          {message.attachments?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {message.attachments.map(att => (
                <div key={att.id}>
                  {att.mime_type?.startsWith('image/') ? (
                    <img src={att.url} alt={att.original_name} className="max-w-sm max-h-64 rounded object-cover cursor-pointer hover:opacity-90" />
                  ) : (
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-discord-darker/50 px-3 py-2 rounded text-sm text-discord-blurple hover:underline">
                      📎 {att.original_name}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {reactions.map((r, i) => {
                const hasReacted = r.user_ids?.includes(user?.id);
                return (
                  <button
                    key={i}
                    onClick={() => handleReaction(r.emoji)}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                      hasReacted
                        ? 'bg-discord-blurple/30 border border-discord-blurple/50 text-white'
                        : 'bg-discord-blurple/20 border border-discord-blurple/30 text-discord-blurple hover:bg-discord-blurple/30'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(MessageItem);
