import React, { useState, useEffect } from 'react';
import { Bell, ArrowLeft, AtSign, Calendar, Clock, MessageCircle } from 'lucide-react';
import { apiGet } from '../utils/api';

export default function NotificationsPanel({ onBack, onNavigateToChannel }) {
  const [notifications, setNotifications] = useState({ mentions: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mentions');

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const data = await apiGet('/api/auth/notifications');
      setNotifications(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const formatTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt + 'Z');
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  };

  const formatEventTime = (dt) => {
    if (!dt) return '';
    const d = new Date(dt + 'Z');
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const unreadMentions = notifications.mentions.filter(m => !m.read).length;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="h-16 px-6 flex items-center border-b border-discord-light/20 bg-discord-mid/80 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={onBack} className="p-2 rounded-xl text-discord-muted hover:text-discord-white hover:bg-discord-light/30 transition-all mr-3">
          <ArrowLeft size={20} />
        </button>
        <Bell size={20} className="text-discord-accent mr-2" />
        <h2 className="text-discord-white font-bold">Notifications</h2>
        {unreadMentions > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-discord-red text-white text-[10px] font-bold rounded-full">
            {unreadMentions}
          </span>
        )}
        <div className="flex-1" />
        <div className="flex gap-1 bg-discord-dark border border-discord-light/20 rounded-xl p-1">
          <button
            onClick={() => setTab('mentions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'mentions' ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white'}`}
          >
            <AtSign size={12} className="inline mr-1" />Mentions
          </button>
          <button
            onClick={() => setTab('events')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'events' ? 'bg-gradient-to-r from-discord-blurple to-discord-gradient2 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white'}`}
          >
            <Calendar size={12} className="inline mr-1" />Events
          </button>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-2 border-discord-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-discord-muted">Loading notifications...</p>
          </div>
        ) : tab === 'mentions' ? (
          notifications.mentions.length === 0 ? (
            <div className="text-center py-16">
              <AtSign size={48} className="mx-auto mb-4 text-discord-muted opacity-50" />
              <h3 className="text-lg font-bold text-discord-white mb-2">No mentions</h3>
              <p className="text-discord-muted text-sm">When someone mentions you, it will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.mentions.map(m => (
                <div
                  key={m.id}
                  onClick={() => onNavigateToChannel?.(m.server_id, m.channel_id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    m.read
                      ? 'bg-discord-dark border-discord-light/20 hover:border-discord-accent/30'
                      : 'bg-discord-accent/5 border-discord-accent/20 hover:border-discord-accent/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-lg">
                      {m.sender_username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-discord-white">{m.sender_username}</span>
                        <span className="text-[10px] text-discord-muted">#{m.sender_tag}</span>
                        {!m.read && <span className="w-2 h-2 rounded-full bg-discord-accent" />}
                        <span className="text-[11px] text-discord-muted ml-auto">{formatTime(m.created_at)}</span>
                      </div>
                      <p className="text-discord-text text-sm truncate">{m.message_content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-discord-muted flex items-center gap-1">
                          <span className="text-discord-accent font-medium">#{m.channel_name}</span>
                          in {m.server_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          notifications.events.length === 0 ? (
            <div className="text-center py-16">
              <Calendar size={48} className="mx-auto mb-4 text-discord-muted opacity-50" />
              <h3 className="text-lg font-bold text-discord-white mb-2">No upcoming events</h3>
              <p className="text-discord-muted text-sm">Events from your servers will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.events.map(ev => (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl bg-discord-dark border border-discord-light/20 hover:border-discord-accent/30 transition-all cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-discord-accent/20 rounded-xl p-2 text-center flex-shrink-0 w-14">
                      <div className="text-discord-accent text-xl font-bold">{new Date(ev.start_time + 'Z').getDate()}</div>
                      <div className="text-discord-accent text-[10px] uppercase">{new Date(ev.start_time + 'Z').toLocaleDateString('ru-RU', { month: 'short' })}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-discord-white font-bold text-sm truncate">{ev.title}</h4>
                      {ev.description && <p className="text-discord-muted text-xs mt-0.5 truncate">{ev.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-discord-muted">
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatEventTime(ev.start_time)}</span>
                      </div>
                      <span className="text-[11px] text-discord-accent mt-1 inline-block">{ev.server_name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
