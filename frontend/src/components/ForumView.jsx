import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, Clock, Tag, X } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

export default function ForumView({ channel, server, user, onOpenThread }) {
  const [posts, setPosts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterTag, setFilterTag] = useState(null);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    loadPosts();
    loadTags();
  }, [channel?.id]);

  const loadPosts = async () => {
    try {
      const data = await apiGet(`/api/threads/channel/${channel.id}?archived=false`);
      setPosts(data);
    } catch (err) { console.error(err); }
  };

  const loadTags = async () => {
    try {
      const data = await apiGet(`/api/threads/tags/${channel.id}`);
      setAllTags(data);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const thread = await apiPost('/api/threads', {
        channel_id: channel.id,
        name: newTitle,
        tags: selectedTags
      });
      if (newContent.trim() && thread?.id) {
        await apiPost(`/api/threads/${thread.id}/messages`, { content: newContent });
      }
      setNewTitle('');
      setNewContent('');
      setSelectedTags([]);
      setShowCreate(false);
      loadPosts();
    } catch (err) { console.error(err); }
  };

  const toggleTag = (tagId) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const filtered = filterTag ? posts.filter(p => p.tags?.some(t => t.id === filterTag)) : posts;

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = (Date.now() - new Date(date + 'Z').getTime()) / 1000;
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff/60)}м назад`;
    if (diff < 86400) return `${Math.floor(diff/3600)}ч назад`;
    return `${Math.floor(diff/86400)}д назад`;
  };

  return (
    <div className="flex-1 flex flex-col bg-discord-mid min-w-0">
      <div className="h-12 px-4 flex items-center border-b border-black/30 shadow-sm flex-shrink-0">
        <span className="text-discord-muted mr-2">💬</span>
        <h3 className="text-white font-semibold">{channel.name}</h3>
        {channel.topic && (
          <>
            <div className="w-px h-6 bg-discord-light mx-3" />
            <span className="text-sm text-discord-gray truncate">{channel.topic}</span>
          </>
        )}
        <div className="flex-1" />
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-sm font-medium transition-all shadow-lg">
          <Plus size={16} /> Создать пост
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="px-4 py-2 flex gap-1.5 flex-wrap border-b border-black/30">
          <button onClick={() => setFilterTag(null)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filterTag ? 'bg-discord-blurple text-white' : 'bg-discord-light text-discord-gray hover:text-white'}`}>
            Все
          </button>
          {allTags.map(tag => (
            <button key={tag.id} onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-white transition-opacity"
              style={{ backgroundColor: tag.color, opacity: filterTag && filterTag !== tag.id ? 0.4 : 1 }}>
              {tag.emoji} {tag.name}
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="px-4 py-3 border-b border-black/30 bg-discord-darker">
          <form onSubmit={handleCreate}>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Заголовок поста"
              className="w-full bg-discord-light rounded px-3 py-2 text-discord-text text-sm mb-2 focus:outline-none" autoFocus />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Описание (необязательно)"
              className="w-full bg-discord-light rounded px-3 py-2 text-discord-text text-sm mb-2 focus:outline-none resize-none h-20" />
            {allTags.length > 0 && (
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {allTags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium text-white transition-opacity ${selectedTags.includes(tag.id) ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-80'}`}
                    style={{ backgroundColor: tag.color }}>
                    {tag.emoji} {tag.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-discord-gray hover:text-white transition-colors">Отмена</button>
              <button type="submit" disabled={!newTitle.trim()} className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-sm font-medium disabled:opacity-50 transition-all shadow-lg">Опубликовать</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-3">💬</span>
            <h3 className="text-xl font-bold text-white mb-1">Нет постов</h3>
            <p className="text-discord-gray text-sm">Создайте первый пост в этом форуме</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(post => (
              <button key={post.id} onClick={() => onOpenThread?.(post, channel)}
                className="w-full bg-discord-dark border border-discord-light/20 hover:border-discord-accent/30 rounded-xl p-4 transition-all text-left group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {post.creator?.avatar ? (
                      <img src={post.creator.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      post.creator?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-[15px] group-hover:text-discord-blurple transition-colors truncate">{post.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-discord-muted">
                      <span>{post.creator?.username}#{post.creator?.tag}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.message_count || 0}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(post.last_message?.created_at || post.created_at)}</span>
                    </div>
                    {post.tags?.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {post.tags.map(tag => (
                          <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: tag.color }}>
                            {tag.emoji} {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
