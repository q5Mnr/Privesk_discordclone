import React, { useState, useEffect } from 'react';
import { X, Hash, Volume2, Users, ChevronRight, MessageCircle } from 'lucide-react';
import { apiGet } from '../utils/api';

export default function CommunitiesPage({ servers, onSelectServer, onSelectChannel, onClose }) {
  const [serverChannels, setServerChannels] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedServer, setExpandedServer] = useState(null);

  useEffect(() => { loadAllChannels(); }, []);

  async function loadAllChannels() {
    const data = {};
    for (const server of servers) {
      try {
        const channels = await apiGet(`/api/servers/${server.id}/channels`);
        data[server.id] = channels.filter(c => c.type === 'text');
      } catch (e) { data[server.id] = []; }
    }
    setServerChannels(data);
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-discord-mid">
      <div className="h-16 px-6 flex items-center border-b border-discord-light/20 bg-discord-mid/80 backdrop-blur-xl sticky top-0 z-10">
        <Users size={22} className="text-discord-accent mr-3" />
        <h2 className="text-xl font-bold text-discord-white">Все мои каналы</h2>
        <span className="ml-3 text-sm text-discord-muted">{servers.length} серверов</span>
      </div>

      <div className="p-6 max-w-3xl">
        {loading ? (
          <div className="text-center py-10 text-discord-muted">Загрузка каналов...</div>
        ) : servers.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏠</div>
            <h3 className="text-lg font-bold text-discord-white mb-2">Нет серверов</h3>
            <p className="text-sm text-discord-muted">Вы пока не состоите ни в одном сервере</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map(server => {
              const channels = serverChannels[server.id] || [];
              const isExpanded = expandedServer === server.id;
              return (
                <div key={server.id} className="bg-discord-dark/50 border border-discord-light/20 rounded-2xl overflow-hidden">
                  <div
                    onClick={() => setExpandedServer(isExpanded ? null : server.id)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-discord-light/10 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {server.icon ? (
                        <img src={server.icon} alt="" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        server.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-discord-white truncate">{server.name}</h3>
                      <p className="text-xs text-discord-muted">{channels.length} текстовых каналов</p>
                    </div>
                    <ChevronRight size={18} className={`text-discord-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  {isExpanded && (
                    <div className="border-t border-discord-light/20 px-4 py-2 space-y-1">
                      {channels.map(ch => (
                        <div
                          key={ch.id}
                          onClick={() => { onSelectServer(server); setTimeout(() => onSelectChannel(ch), 100); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-discord-light/15 cursor-pointer transition-all group"
                        >
                          <Hash size={16} className="text-discord-muted group-hover:text-discord-accent" />
                          <span className="text-sm text-discord-gray group-hover:text-discord-white">{ch.name}</span>
                        </div>
                      ))}
                      {channels.length === 0 && (
                        <p className="text-xs text-discord-muted py-2 px-3">Нет текстовых каналов</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
