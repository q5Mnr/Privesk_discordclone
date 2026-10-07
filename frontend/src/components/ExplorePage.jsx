import React, { useState, useEffect } from 'react';
import { Compass, Users, Hash, ArrowLeft, Search, TrendingUp } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

export default function ExplorePage({ onJoinServer, onBack }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState(null);

  useEffect(() => { loadServers(); }, []);

  const loadServers = async () => {
    try {
      const data = await apiGet('/api/servers/explore');
      setServers(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleJoin = async (inviteCode) => {
    setJoining(inviteCode);
    try {
      const result = await apiPost(`/api/servers/join/${inviteCode}`);
      if (result.id) {
        onJoinServer(result);
      }
    } catch (err) { console.error(err); }
    setJoining(null);
  };

  const q = search.toLowerCase();
  const filtered = servers.filter(s =>
    !q || (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
  );

  const topServers = filtered.slice(0, 6);
  const restServers = filtered.slice(6);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="h-16 px-6 flex items-center border-b border-discord-light/20 bg-discord-mid/80 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={onBack} className="p-2 rounded-xl text-discord-muted hover:text-discord-white hover:bg-discord-light/30 transition-all mr-3">
          <ArrowLeft size={20} />
        </button>
        <Compass size={20} className="text-discord-accent mr-2" />
        <h2 className="text-discord-white font-bold">Explore Servers</h2>
        <div className="flex-1" />
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search servers..."
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl pl-10 pr-4 py-2 text-sm text-discord-text placeholder-discord-muted focus:outline-none focus:border-discord-accent/50 transition-colors"
          />
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-2 border-discord-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-discord-muted">Loading servers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Compass size={48} className="mx-auto mb-4 text-discord-muted opacity-50" />
            <h3 className="text-xl font-bold text-discord-white mb-2">No servers found</h3>
            <p className="text-discord-muted">{search ? 'Try a different search' : 'No public servers yet'}</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {topServers.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-discord-accent" />
                  <h3 className="text-lg font-bold text-discord-white">Featured</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topServers.map(server => (
                    <ServerCard key={server.id} server={server} onJoin={handleJoin} joining={joining} />
                  ))}
                </div>
              </div>
            )}

            {/* All servers */}
            {restServers.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-discord-white mb-4">All Servers</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restServers.map(server => (
                    <ServerCard key={server.id} server={server} onJoin={handleJoin} joining={joining} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ServerCard({ server, onJoin, joining }) {
  return (
    <div className="bg-discord-dark border border-discord-light/20 rounded-2xl p-5 hover:border-discord-accent/30 hover:shadow-lg hover:shadow-discord-accent/10 transition-all duration-300 group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:scale-105 transition-transform">
          {server.icon ? (
            <img src={server.icon} alt={server.name} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            server.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-discord-white font-bold truncate">{server.name}</h4>
          <div className="flex items-center gap-2 text-xs text-discord-muted">
            <span className="flex items-center gap-1"><Users size={11} /> {server.member_count || 0}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Hash size={11} /> {server.channel_count || 0} channels</span>
          </div>
        </div>
      </div>
      {server.description && (
        <p className="text-discord-muted text-xs mb-3 line-clamp-2">{server.description}</p>
      )}
      <button
        onClick={() => onJoin(server.invite_code)}
        disabled={joining === server.invite_code}
        className="w-full py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all shadow-lg disabled:opacity-50"
      >
        {joining === server.invite_code ? 'Joining...' : 'Join Server'}
      </button>
    </div>
  );
}
