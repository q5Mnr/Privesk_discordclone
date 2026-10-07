import React, { useState, useEffect } from 'react';
import { X, Hash, Volume2, Plus, Trash2, Edit3, Shield, Ban, UserMinus, ChevronDown, Users, Settings, AlertTriangle, MessageSquare } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Обзор', icon: Settings },
  { id: 'channels', label: 'Каналы', icon: Hash },
  { id: 'roles', label: 'Роли', icon: Shield },
  { id: 'members', label: 'Участники', icon: Users },
  { id: 'bans', label: 'Баны', icon: Ban },
  { id: 'security', label: 'Безопасность', icon: AlertTriangle },
];

export default function ServerSettings({ server, channels, members, onClose, onUpdate, user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [serverName, setServerName] = useState(server?.name || '');
  const [description, setDescription] = useState(server?.description || '');
  const [defaultNotifications, setDefaultNotifications] = useState(server?.default_notifications || 'all');
  const [afkTimeout, setAfkTimeout] = useState(server?.afk_timeout || 300);
  const [verificationLevel, setVerificationLevel] = useState(server?.verification_level || 0);
  const [require2fa, setRequire2fa] = useState(server?.require_2fa || 0);
  const [explicitFilter, setExplicitFilter] = useState(server?.explicit_filter || 0);
  const [antiSpam, setAntiSpam] = useState(server?.anti_spam || 0);
  const [antiRaid, setAntiRaid] = useState(server?.anti_raid || 0);
  const [blockLinks, setBlockLinks] = useState(server?.block_links || 0);
  const [lockdown, setLockdown] = useState(server?.lockdown || 0);
  const [slowmodeGlobal, setSlowmodeGlobal] = useState(server?.slowmode_global || 0);
  const [maxRoleMembers, setMaxRoleMembers] = useState(server?.max_role_members || 0);
  const [isPublic, setIsPublic] = useState(server?.is_public || 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const myRole = server?.my_role || server?.member_role || 'member';
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const isMod = myRole === 'owner' || myRole === 'admin' || myRole === 'moderator';

  useEffect(() => {
    setServerName(server?.name || '');
    setDescription(server?.description || '');
    setDefaultNotifications(server?.default_notifications || 'all');
    setAfkTimeout(server?.afk_timeout || 300);
    setVerificationLevel(server?.verification_level || 0);
    setRequire2fa(server?.require_2fa || 0);
    setExplicitFilter(server?.explicit_filter || 0);
    setAntiSpam(server?.anti_spam || 0);
    setAntiRaid(server?.anti_raid || 0);
    setBlockLinks(server?.block_links || 0);
    setLockdown(server?.lockdown || 0);
    setSlowmodeGlobal(server?.slowmode_global || 0);
    setMaxRoleMembers(server?.max_role_members || 0);
  }, [server]);

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...options.headers,
      },
    });
    return res.json();
  };

  const handleSaveOverview = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await apiFetch(`/api/servers/${server.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: serverName, description, default_notifications: defaultNotifications, afk_timeout: afkTimeout, verification_level: verificationLevel, is_public: isPublic }),
      });
      if (data.id) {
        onUpdate({ ...server, name: serverName, description, default_notifications: defaultNotifications, afk_timeout: afkTimeout, verification_level: verificationLevel, is_public: isPublic });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || 'Ошибка');
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await apiFetch(`/api/servers/${server.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          require_2fa: require2fa,
          explicit_filter: explicitFilter,
          anti_spam: antiSpam,
          anti_raid: antiRaid,
          block_links: blockLinks,
          lockdown: lockdown,
          slowmode_global: slowmodeGlobal,
          max_role_members: maxRoleMembers,
        }),
      });
      if (data.id) {
        onUpdate({ ...server, require_2fa: require2fa, explicit_filter: explicitFilter, anti_spam: antiSpam, anti_raid: antiRaid, block_links: blockLinks, lockdown: lockdown, slowmode_global: slowmodeGlobal, max_role_members: maxRoleMembers });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || 'Ошибка');
      }
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-discord-darker border border-discord-light/20 rounded-2xl w-full max-w-3xl shadow-2xl flex" style={{ height: '70vh' }}>
        {/* Sidebar */}
        <div className="w-48 bg-discord-dark border-r border-discord-light/20 rounded-l-2xl p-4 flex flex-col gap-1 flex-shrink-0">
          <h3 className="text-[11px] font-bold text-discord-accent uppercase px-2 mb-2 tracking-wider">{server.name}</h3>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left ${
                  activeTab === tab.id
                    ? 'bg-discord-accent/15 text-discord-accent font-medium'
                    : 'text-discord-muted hover:text-discord-text hover:bg-discord-light/20'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-discord-muted hover:text-discord-white p-1.5 rounded-xl hover:bg-discord-light/30 transition-all">
            <X size={24} />
          </button>

          {error && (
            <div className="mb-4 bg-discord-red/20 border border-discord-red/30 text-discord-red px-4 py-2 rounded-xl text-sm">
              {error}
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewTab
              server={server}
              serverName={serverName}
              setServerName={setServerName}
              description={description}
              setDescription={setDescription}
              defaultNotifications={defaultNotifications}
              setDefaultNotifications={setDefaultNotifications}
              afkTimeout={afkTimeout}
              setAfkTimeout={setAfkTimeout}
              verificationLevel={verificationLevel}
              setVerificationLevel={setVerificationLevel}
              channels={channels}
              onSave={handleSaveOverview}
              saving={saving}
              saved={saved}
              onDelete={async () => {
                if (confirm('Вы уверены что хотите удалить сервер?')) {
                  await apiFetch(`/api/servers/${server.id}`, { method: 'DELETE' });
                  onUpdate(null);
                  onClose();
                }
              }}
              onLeave={async () => {
                if (confirm('Вы уверены что хотите покинуть сервер?')) {
                  const myMember = members.find(m => m.id === user.id || m.user_id === user.id);
                  if (myMember) {
                    await apiFetch(`/api/servers/${server.id}/members/${myMember.member_id}`, { method: 'DELETE' });
                    onUpdate(null);
                    onClose();
                  }
                }
              }}
              isOwner={isOwner}
              isPublic={isPublic}
              setIsPublic={setIsPublic}
            />
          )}

          {activeTab === 'channels' && (
            <ChannelsTab
              server={server}
              channels={channels}
              isAdmin={isAdmin}
              onUpdate={onUpdate}
            />
          )}

          {activeTab === 'roles' && (
            <RolesTab
              server={server}
              isAdmin={isMod}
              onUpdate={onUpdate}
            />
          )}

          {activeTab === 'members' && (
            <MembersTab
              server={server}
              members={members}
              user={user}
              isAdmin={isMod}
              isOwner={isOwner}
              onUpdate={onUpdate}
            />
          )}

          {activeTab === 'bans' && (
            <BansTab
              server={server}
              isAdmin={isMod}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              server={server}
              require2fa={require2fa}
              setRequire2fa={setRequire2fa}
              explicitFilter={explicitFilter}
              setExplicitFilter={setExplicitFilter}
              antiSpam={antiSpam}
              setAntiSpam={setAntiSpam}
              antiRaid={antiRaid}
              setAntiRaid={setAntiRaid}
              blockLinks={blockLinks}
              setBlockLinks={setBlockLinks}
              lockdown={lockdown}
              setLockdown={setLockdown}
              slowmodeGlobal={slowmodeGlobal}
              setSlowmodeGlobal={setSlowmodeGlobal}
              maxRoleMembers={maxRoleMembers}
              setMaxRoleMembers={setMaxRoleMembers}
              onSave={handleSaveSecurity}
              saving={saving}
              saved={saved}
              isOwner={isOwner}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ server, serverName, setServerName, description, setDescription, defaultNotifications, setDefaultNotifications, afkTimeout, setAfkTimeout, verificationLevel, setVerificationLevel, channels, onSave, saving, saved, onDelete, onLeave, isOwner, isPublic, setIsPublic }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-discord-white mb-6">Настройки сервера</h2>

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Название сервера</label>
        <input
          type="text"
          value={serverName}
          onChange={(e) => setServerName(e.target.value)}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors"
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="О чём этот сервер?"
          rows={3}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 resize-none transition-colors"
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Уведомления по умолчанию</label>
        <select
          value={defaultNotifications}
          onChange={(e) => setDefaultNotifications(e.target.value)}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors"
        >
          <option value="all">Все сообщения</option>
          <option value="mentions">Только @упоминания</option>
        </select>
        <p className="text-xs text-discord-muted mt-1">Определяет, будут ли участники получать уведомления по умолчанию</p>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">AFK Тайм-аут (сек)</label>
        <select
          value={afkTimeout}
          onChange={(e) => setAfkTimeout(Number(e.target.value))}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors"
        >
          <option value={60}>1 минута</option>
          <option value={300}>5 минут</option>
          <option value={900}>15 минут</option>
          <option value={1800}>30 минут</option>
          <option value={3600}>1 час</option>
        </select>
        <p className="text-xs text-discord-muted mt-1">Время без активности перед перемещением в AFK-канал</p>
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Уровень верификации</label>
        <select
          value={verificationLevel}
          onChange={(e) => setVerificationLevel(Number(e.target.value))}
          className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors"
        >
          <option value={0}>Нет</option>
          <option value={1}>Низкий (email)</option>
          <option value={2}>Средний (5 мин на сервере)</option>
          <option value={3}>Высокий (10 мин)</option>
        </select>
        <p className="text-xs text-discord-muted mt-1">Требовать верификацию для участия в чате</p>
      </div>

      <div className="mb-6">
        <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Инвайт-код</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={server?.invite_code || ''}
            className="flex-1 bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text font-mono text-sm"
          />
          <button
            onClick={() => { navigator.clipboard.writeText(server?.invite_code || ''); }}
            className="px-4 py-2.5 bg-discord-light/30 hover:bg-discord-light/50 text-discord-text text-sm rounded-xl transition-colors"
          >
            Копировать
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="mb-6">
          <label className="block text-[11px] font-bold text-discord-accent uppercase mb-2 tracking-wider">Видимость сервера</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPublic(0)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                !isPublic ? 'border-discord-accent bg-discord-accent/10 text-discord-accent' : 'border-discord-light/20 bg-discord-dark text-discord-muted hover:border-discord-light/40'
              }`}
            >
              🔒 Приватный
            </button>
            <button
              onClick={() => setIsPublic(1)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                isPublic ? 'border-discord-accent bg-discord-accent/10 text-discord-accent' : 'border-discord-light/20 bg-discord-dark text-discord-muted hover:border-discord-light/40'
              }`}
            >
              🌐 Публичный
            </button>
          </div>
          <p className="text-xs text-discord-muted mt-1.5">{isPublic ? 'Сервер виден в Explore и доступен всем' : 'Сервер скрыт, вступить можно только по инвайт-ссылке'}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isOwner && (
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-discord-red hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all"
            >
              Покинуть сервер
            </button>
          )}
          {isOwner && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-discord-red hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all"
            >
              Удалить сервер
            </button>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg"
        >
          {saved ? '✓ Сохранено!' : saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function ChannelsTab({ server, channels, isAdmin, onUpdate }) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [editingChannel, setEditingChannel] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSlowmode, setEditSlowmode] = useState(0);
  const [editNsfw, setEditNsfw] = useState(false);
  const [creating, setCreating] = useState(false);

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...options.headers,
      },
    });
    return res.json();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const data = await apiFetch(`/api/servers/${server.id}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name: newName, type: newType }),
    });
    if (data.id) {
      onUpdate({ ...server, channels: [...channels, data] });
      setNewName('');
    }
    setCreating(false);
  };

  const handleRename = async (channelId) => {
    if (!editName.trim()) return;
    const data = await apiFetch(`/api/servers/${server.id}/channels/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editName, slowmode: editSlowmode, nsfw: editNsfw }),
    });
    if (data.id) {
      onUpdate({ ...server, channels: channels.map(c => c.id === channelId ? data : c) });
      setEditingChannel(null);
    }
  };

  const handleDelete = async (channelId) => {
    if (!confirm('Удалить канал?')) return;
    await apiFetch(`/api/servers/${server.id}/channels/${channelId}`, { method: 'DELETE' });
    onUpdate({ ...server, channels: channels.filter(c => c.id !== channelId) });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-discord-white mb-6">Управление каналами</h2>

      {isAdmin && (
        <div className="flex gap-2 mb-6">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50"
          >
            <option value="text">Текстовый</option>
            <option value="voice">Голосовой</option>
            <option value="forum">Форум</option>
          </select>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название канала"
            className="flex-1 bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-discord-green hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={16} /> Создать
          </button>
        </div>
      )}

      <div className="space-y-1">
        {channels.map(channel => (
          <div key={channel.id} className="flex items-center gap-2 px-3 py-2 bg-discord-dark border border-discord-light/20 rounded-xl group hover:bg-discord-light/10 transition-colors">
            {channel.type === 'voice' ? <Volume2 size={18} className="text-discord-muted" /> : channel.type === 'forum' ? <MessageSquare size={18} className="text-discord-muted" /> : <Hash size={18} className="text-discord-muted" />}

            {editingChannel === channel.id ? (
              <div className="flex-1 flex flex-col gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(channel.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(channel.id)}
                  autoFocus
                  className="bg-discord-dark border border-discord-light/20 rounded-xl px-2 py-1 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50"
                />
                {channel.type === 'text' && (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-discord-gray">
                      <select
                        value={editSlowmode}
                        onChange={(e) => setEditSlowmode(Number(e.target.value))}
                        className="bg-discord-dark border border-discord-light/20 rounded-xl px-2 py-1 text-discord-text text-xs focus:outline-none"
                      >
                        <option value={0}>Без ограничений</option>
                        <option value={5}>5 сек</option>
                        <option value={10}>10 сек</option>
                        <option value={30}>30 сек</option>
                        <option value={60}>1 мин</option>
                        <option value={120}>2 мин</option>
                        <option value={300}>5 мин</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-discord-gray cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editNsfw}
                        onChange={(e) => setEditNsfw(e.target.checked)}
                        className="rounded"
                      />
                      18+
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <span className="flex-1 text-discord-text text-sm">{channel.name}</span>
            )}

            <span className="text-xs text-discord-muted">{channel.type === 'voice' ? 'Голосовой' : channel.type === 'forum' ? 'Форум' : 'Текстовый'}</span>

            {isAdmin && editingChannel !== channel.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingChannel(channel.id); setEditName(channel.name); setEditSlowmode(channel.slowmode || 0); setEditNsfw(!!channel.nsfw); }}
                  className="p-1 text-discord-gray hover:text-discord-text transition-colors"
                >
                  <Edit3 size={14} />
                </button>
                {channel.name !== 'general' && (
                  <button
                    onClick={() => handleDelete(channel.id)}
                    className="p-1 text-discord-gray hover:text-discord-red transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersTab({ server, members, user, isAdmin, isOwner, onUpdate }) {
  const [actionMember, setActionMember] = useState(null);
  const [actionType, setActionType] = useState('');
  const [reason, setReason] = useState('');
  const [roles, setRoles] = useState([]);
  const [memberRolesMap, setMemberRolesMap] = useState({});
  const [openRolesMenu, setOpenRolesMenu] = useState(null);
  const [search, setSearch] = useState('');

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...options.headers,
      },
    });
    return res.json();
  };

  useEffect(() => {
    loadRoles();
    loadAllMemberRoles();
  }, [server?.id, members]);

  useEffect(() => {
    if (openRolesMenu === null) return;
    const handler = (e) => {
      if (!e.target.closest('[data-roles-menu]')) setOpenRolesMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openRolesMenu]);

  const loadRoles = async () => {
    const data = await apiFetch(`/api/messages/roles/${server.id}`);
    if (Array.isArray(data)) setRoles(data);
  };

  const loadAllMemberRoles = async () => {
    const map = {};
    for (const m of members) {
      const memberId = m.member_id || m.id;
      try {
        const data = await apiFetch(`/api/messages/${server.id}/members/${memberId}/roles`);
        if (Array.isArray(data)) map[memberId] = data;
      } catch (e) {}
    }
    setMemberRolesMap(map);
  };

  const handleKick = async () => {
    if (!actionMember) return;
    const memberId = actionMember.member_id || actionMember.id;
    await apiFetch(`/api/servers/${server.id}/members/${memberId}`, { method: 'DELETE' });
    onUpdate({ ...server, members: members.filter(m => (m.member_id || m.id) !== memberId) });
    setActionMember(null);
  };

  const handleBan = async () => {
    if (!actionMember) return;
    const userId = actionMember.user_id || actionMember.id;
    await apiFetch(`/api/servers/${server.id}/bans`, {
      method: 'POST',
      body: JSON.stringify({ userId, reason }),
    });
    onUpdate({
      ...server,
      members: members.filter(m => m.id !== userId && m.user_id !== userId),
    });
    setActionMember(null);
    setReason('');
  };

  const handleRoleChange = async (member, newRole) => {
    const memberId = member.member_id || member.id;
    await apiFetch(`/api/servers/${server.id}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole }),
    });
    onUpdate({
      ...server,
      members: members.map(m =>
        (m.member_id || m.id) === memberId ? { ...m, role: newRole } : m
      ),
    });
  };

  const handleToggleRole = async (member, roleId) => {
    const memberId = member.member_id || member.id;
    const result = await apiFetch(`/api/messages/${server.id}/members/${memberId}/assign-role`, {
      method: 'PUT',
      body: JSON.stringify({ role_id: roleId }),
    });
    if (result.roles) {
      setMemberRolesMap(prev => ({ ...prev, [memberId]: result.roles }));
      const topRole = result.roles[0] || null;
      onUpdate({
        ...server,
        members: members.map(m =>
          (m.member_id || m.id) === memberId
            ? { ...m, role_name: topRole?.name || null, role_color: topRole?.color || null }
            : m
        ),
      });
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Владелец' };
      case 'admin': return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Админ' };
      case 'moderator': return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Модератор' };
      default: return { bg: 'bg-discord-light/20', text: 'text-discord-gray', label: 'Участник' };
    }
  };

  const ROLE_SORT = { owner: 0, admin: 1, moderator: 2, member: 3 };
  const q = search.toLowerCase();
  const sortedMembers = members
    .filter(m => !q || (m.username || '').toLowerCase().includes(q) || (m.nickname || '').toLowerCase().includes(q) || (m.tag || '').toLowerCase().includes(q))
    .sort((a, b) => {
      const ra = ROLE_SORT[a.role] ?? 3;
      const rb = ROLE_SORT[b.role] ?? 3;
      if (ra !== rb) return ra - rb;
      const pa = (memberRolesMap[a.member_id || a.id]?.[0]?.position) ?? 0;
      const pb = (memberRolesMap[b.member_id || b.id]?.[0]?.position) ?? 0;
      if (pa !== pb) return pb - pa;
      return (a.username || '').localeCompare(b.username || '');
    });

  return (
    <div>
      <h2 className="text-xl font-bold text-discord-white mb-6">Участники ({members.length})</h2>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Поиск участников..."
        className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-sm text-white placeholder-discord-muted mb-4 focus:outline-none focus:border-discord-accent/50"
      />

      <div className="space-y-1">
        {sortedMembers.map(member => {
          const badge = getRoleBadge(member.role);
          const isCurrentUser = member.id === user.id || member.user_id === user.id;
          const isTargetOwner = member.role === 'owner';
          const memberId = member.member_id || member.id;
          const assignedRoles = memberRolesMap[memberId] || [];

          return (
            <div key={member.id || member.user_id} className="flex items-center gap-3 px-3 py-2 bg-discord-dark border border-discord-light/20 rounded-xl group hover:bg-discord-light/10 transition-colors">
              <div className="w-9 h-9 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(member.username || '?')[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-discord-text text-sm font-medium truncate">
                    {member.nickname || member.username}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                  {assignedRoles.map(r => (
                    <span key={r.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: r.color + '30', color: r.color }}>
                      {r.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-discord-muted">{member.username}#{member.tag}</span>
                  {member.nickname && (
                    <span className="text-xs text-discord-muted">• {member.nickname}</span>
                  )}
                </div>
              </div>

              {isAdmin && !isCurrentUser && !isTargetOwner && (
                <div className="flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isOwner && (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      className="bg-discord-dark border border-discord-light/20 rounded-xl px-2 py-1 text-xs text-discord-text focus:outline-none focus:border-discord-accent/50"
                    >
                      <option value="member">Участник</option>
                      <option value="moderator">Модератор</option>
                      <option value="admin">Админ</option>
                    </select>
                  )}
                  <div className="relative" data-roles-menu>
                    <button
                      onClick={() => setOpenRolesMenu(openRolesMenu === memberId ? null : memberId)}
                      className="px-2 py-1 bg-discord-dark border border-discord-light/20 rounded-xl text-xs text-discord-text hover:bg-discord-light/20 transition-colors"
                    >
                      Роли ▾
                    </button>
                    {openRolesMenu === memberId && (
                      <div className="absolute right-0 top-full mt-1 bg-discord-dark rounded-xl shadow-xl border border-discord-light/20 p-2 z-20 w-48">
                        {roles.filter(r => !r.is_default).length === 0 ? (
                          <p className="text-xs text-discord-muted px-2 py-1">Нет ролей</p>
                        ) : roles.filter(r => !r.is_default).map(r => {
                          const isChecked = assignedRoles.some(ar => ar.id === r.id);
                          return (
                            <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-discord-light/20 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleRole(member, r.id)}
                                className="rounded"
                              />
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                              <span className="text-xs text-discord-text truncate">{r.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setActionMember(member); setActionType('kick'); }}
                    className="p-1 text-discord-gray hover:text-yellow-400 transition-colors"
                    title="Кикнуть"
                  >
                    <UserMinus size={14} />
                  </button>
                  <button
                    onClick={() => { setActionMember(member); setActionType('ban'); }}
                    className="p-1 text-discord-gray hover:text-discord-red transition-colors"
                    title="Забанить"
                  >
                    <Ban size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Modal */}
      {actionMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60" onClick={() => setActionMember(null)}>
          <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-discord-white mb-4">
              {actionType === 'kick' ? 'Кикнуть участника' : 'Забанить участника'}
            </h3>
            <p className="text-discord-gray text-sm mb-4">
              {actionType === 'kick'
                ? `Вы уверены что хотите кикнуть ${actionMember.username}?`
                : `Вы уверены что хотите забанить ${actionMember.username}?`
              }
            </p>
            {actionType === 'ban' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-discord-accent uppercase tracking-wider mb-2">Причина</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Причина бана (необязательно)"
                  className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActionMember(null)}
                className="px-4 py-2 text-sm text-discord-gray hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={actionType === 'kick' ? handleKick : handleBan}
                className="px-4 py-2 bg-discord-red hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {actionType === 'kick' ? 'Кикнуть' : 'Забанить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BansTab({ server, isAdmin }) {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...options.headers,
      },
    });
    return res.json();
  };

  useEffect(() => {
    loadBans();
  }, [server?.id]);

  const loadBans = async () => {
    setLoading(true);
    const data = await apiFetch(`/api/servers/${server.id}/bans`);
    if (Array.isArray(data)) setBans(data);
    setLoading(false);
  };

  const handleUnban = async (userId) => {
    await apiFetch(`/api/servers/${server.id}/bans/${userId}`, { method: 'DELETE' });
    setBans(bans.filter(b => b.user_id !== userId));
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Ban size={48} className="text-discord-muted mx-auto mb-4" />
        <p className="text-discord-gray">У вас нет прав для просмотра банов</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-discord-white mb-6">Забаненные участники</h2>

      {loading ? (
        <p className="text-discord-gray">Загрузка...</p>
      ) : bans.length === 0 ? (
        <div className="text-center py-12">
          <Ban size={48} className="text-discord-muted mx-auto mb-4" />
          <p className="text-discord-gray">Нет забаненных участников</p>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск забаненных..."
            className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-sm text-white placeholder-discord-muted mb-4 focus:outline-none focus:border-discord-accent/50"
          />
          <div className="space-y-1">
            {bans.filter(b => {
              const q = search.toLowerCase();
              return !q || (b.username || '').toLowerCase().includes(q) || (b.reason || '').toLowerCase().includes(q);
            }).map(ban => (
            <div key={ban.user_id} className="flex items-center gap-3 px-3 py-2 bg-discord-dark border border-discord-light/20 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-discord-red flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(ban.username || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-discord-text text-sm font-medium">{ban.username}#{ban.tag}</div>
                {ban.reason && (
                  <div className="text-xs text-discord-muted">Причина: {ban.reason}</div>
                )}
              </div>
              <button
                onClick={() => handleUnban(ban.user_id)}
                className="px-3 py-1 bg-discord-green hover:opacity-90 text-white text-xs font-medium rounded-xl transition-colors"
              >
                Разбанить
              </button>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}

function SecurityTab({ server, require2fa, setRequire2fa, explicitFilter, setExplicitFilter, antiSpam, setAntiSpam, antiRaid, setAntiRaid, blockLinks, setBlockLinks, lockdown, setLockdown, slowmodeGlobal, setSlowmodeGlobal, maxRoleMembers, setMaxRoleMembers, onSave, saving, saved, isOwner }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-discord-white mb-6">Настройки безопасности</h2>
      {!isOwner && (
        <p className="text-xs text-discord-yellow mb-4 bg-discord-yellow/10 border border-discord-yellow/30 px-3 py-2 rounded-xl">Только владелец сервера может менять настройки безопасности</p>
      )}

      <div className="space-y-4">
        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Режим блокировки (Lockdown)</p>
              <p className="text-xs text-discord-muted mt-0.5">Только модераторы и выше могут писать в чат</p>
            </div>
            <button
              disabled={!isOwner}
              onClick={() => setLockdown(lockdown ? 0 : 1)}
              className={`w-12 h-6 rounded-full transition-colors relative ${lockdown ? 'bg-discord-green' : 'bg-discord-muted'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${lockdown ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Блокировка ссылок</p>
              <p className="text-xs text-discord-muted mt-0.5">Запретить отправку ссылок всем участникам</p>
            </div>
            <button
              disabled={!isOwner}
              onClick={() => setBlockLinks(blockLinks ? 0 : 1)}
              className={`w-12 h-6 rounded-full transition-colors relative ${blockLinks ? 'bg-discord-green' : 'bg-discord-muted'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${blockLinks ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Фильтр контента 18+</p>
              <p className="text-xs text-discord-muted mt-0.5">Блокировать ссылки для участников без ролей</p>
            </div>
            <button
              disabled={!isOwner}
              onClick={() => setExplicitFilter(explicitFilter ? 0 : 1)}
              className={`w-12 h-6 rounded-full transition-colors relative ${explicitFilter ? 'bg-discord-green' : 'bg-discord-muted'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${explicitFilter ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Анти-спам</p>
              <p className="text-xs text-discord-muted mt-0.5">Ограничить частоту отправки сообщений</p>
            </div>
            <select
              disabled={!isOwner}
              value={antiSpam}
              onChange={(e) => setAntiSpam(Number(e.target.value))}
              className="bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-1.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent/50"
            >
              <option value={0}>Выкл</option>
              <option value={1}>Мягкий (5 сек)</option>
              <option value={2}>Строгий (3 сек)</option>
            </select>
          </div>
        </div>

        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Анти-рейд</p>
              <p className="text-xs text-discord-muted mt-0.5">Автоматически банить подозрительные массовые входы</p>
            </div>
            <button
              disabled={!isOwner}
              onClick={() => setAntiRaid(antiRaid ? 0 : 1)}
              className={`w-12 h-6 rounded-full transition-colors relative ${antiRaid ? 'bg-discord-green' : 'bg-discord-muted'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${antiRaid ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Требовать 2FA для модераторов</p>
              <p className="text-xs text-discord-muted mt-0.5">Модераторы обязаны включить двухфакторную аутентификацию</p>
            </div>
            <button
              disabled={!isOwner}
              onClick={() => setRequire2fa(require2fa ? 0 : 1)}
              className={`w-12 h-6 rounded-full transition-colors relative ${require2fa ? 'bg-discord-green' : 'bg-discord-muted'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${require2fa ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Глобальный слоумод</p>
              <p className="text-xs text-discord-muted mt-0.5">Задержка между сообщениями для всех каналов (сек)</p>
            </div>
            <select
              disabled={!isOwner}
              value={slowmodeGlobal}
              onChange={(e) => setSlowmodeGlobal(Number(e.target.value))}
              className="bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-1.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent/50"
            >
              <option value={0}>Выкл</option>
              <option value={5}>5 сек</option>
              <option value={10}>10 сек</option>
              <option value={30}>30 сек</option>
              <option value={60}>1 мин</option>
            </select>
          </div>
        </div>

        <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Лимит участников на роль</p>
              <p className="text-xs text-discord-muted mt-0.5">Макс. число людей, которым можно назначить одну роль (0 = без лимита)</p>
            </div>
            <select
              disabled={!isOwner}
              value={maxRoleMembers}
              onChange={(e) => setMaxRoleMembers(Number(e.target.value))}
              className="bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-1.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent/50"
            >
              <option value={0}>Без лимита</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onSave}
          disabled={saving || !isOwner}
          className="px-6 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 shadow-lg text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {saved ? '✓ Сохранено!' : saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

function RolesTab({ server, isAdmin }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#99aab5');
  const [editingRole, setEditingRole] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPermissions, setEditPermissions] = useState(0);
  const [showPerms, setShowPerms] = useState(null);

  const PRESET_COLORS = ['#99aab5', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e91e63', '#00bcd4'];

  const PERMISSIONS = [
    { bit: 1, label: 'Отправлять сообщения', desc: 'Может писать в текстовых каналах' },
    { bit: 2, label: 'Управлять сообщениями', desc: 'Удалять и редактировать чужие сообщения' },
    { bit: 4, label: 'Прикреплять файлы', desc: 'Может загружать файлы' },
    { bit: 8, label: 'Добавлять реакции', desc: 'Может ставить реакции на сообщения' },
    { bit: 16, label: 'Управлять каналами', desc: 'Создавать, редактировать, удалять каналы' },
    { bit: 32, label: 'Управлять ролями', desc: 'Создавать, редактировать, удалять роли' },
    { bit: 64, label: 'Кикать участников', desc: 'Исключать участников из сервера' },
    { bit: 128, label: 'Банить участников', desc: 'Блокировать участников на сервере' },
    { bit: 256, label: 'Управлять сервером', desc: 'Изменять название, описание, иконку сервера' },
    { bit: 512, label: 'Закреплять сообщения', desc: 'Закреплять сообщения в каналах' },
  ];

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        ...options.headers,
      },
    });
    return res.json();
  };

  useEffect(() => {
    loadRoles();
  }, [server?.id]);

  const loadRoles = async () => {
    setLoading(true);
    const data = await apiFetch(`/api/messages/roles/${server.id}`);
    if (Array.isArray(data)) setRoles(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const data = await apiFetch(`/api/messages/roles/${server.id}`, {
      method: 'POST',
      body: JSON.stringify({ name: newName, color: newColor, permissions: 0 }),
    });
    if (data.id) {
      setRoles([...roles, data]);
      setNewName('');
      setNewColor('#99aab5');
    }
  };

  const handleUpdate = async (roleId) => {
    if (!editName.trim()) return;
    const data = await apiFetch(`/api/messages/roles/${server.id}/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editName, color: editColor, permissions: editPermissions }),
    });
    if (data.id) {
      setRoles(roles.map(r => r.id === roleId ? data : r));
      setEditingRole(null);
    }
  };

  const handleDelete = async (roleId) => {
    if (!confirm('Удалить роль? Участники потеряют её.')) return;
    await apiFetch(`/api/messages/roles/${server.id}/${roleId}`, { method: 'DELETE' });
    setRoles(roles.filter(r => r.id !== roleId));
  };

  const togglePermission = (bit) => {
    setEditPermissions(prev => prev ^ bit);
  };

  const formatPermissions = (perms) => {
    if (!perms) return 'Без прав';
    const names = PERMISSIONS.filter(p => perms & p.bit).map(p => p.label);
    return names.length > 0 ? names.join(', ') : 'Без прав';
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield size={48} className="text-discord-muted mx-auto mb-4" />
        <p className="text-discord-gray">У вас нет прав для управления ролями</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-discord-white mb-6">Роли сервера</h2>

      {/* Create new role */}
      <div className="bg-discord-dark border border-discord-light/20 rounded-xl p-4 mb-6">
        <p className="text-sm font-bold text-white mb-3">Создать новую роль</p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название роли"
            className="flex-1 bg-discord-dark border border-discord-light/20 rounded-xl px-3 py-2 text-discord-text text-sm focus:outline-none focus:border-discord-accent/50"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
            title="Цвет роли"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 shadow-lg text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={16} /> Создать
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Roles list */}
      {loading ? (
        <p className="text-discord-gray">Загрузка...</p>
      ) : roles.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={48} className="text-discord-muted mx-auto mb-4" />
          <p className="text-discord-gray">Нет ролей. Создайте первую роль выше.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {roles.length === 0 ? (
            <p className="text-discord-gray">Нет ролей. Создайте первую роль выше.</p>
          ) : roles.map(role => (
            <div key={role.id} className="bg-discord-dark border border-discord-light/20 rounded-xl group">
              <div className="flex items-center gap-3 px-3 py-2 hover:bg-discord-light/10 transition-colors">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />

                {editingRole === role.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(role.id)}
                      autoFocus
                      disabled={role.is_default}
                      className={`flex-1 bg-discord-dark border border-discord-light/20 rounded-xl px-2 py-1 text-sm focus:outline-none focus:border-discord-accent/50 ${role.is_default ? 'text-discord-gray cursor-not-allowed' : 'text-discord-text'}`}
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                    />
                    <button onClick={() => handleUpdate(role.id)} className="text-xs text-discord-blurple hover:underline">OK</button>
                    <button onClick={() => setEditingRole(null)} className="text-xs text-discord-gray hover:underline">Отмена</button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium" style={{ color: role.color }}>{role.name}</span>
                    <span className="text-xs text-discord-muted truncate max-w-[200px]" title={formatPermissions(role.permissions)}>
                      {formatPermissions(role.permissions)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setShowPerms(showPerms === role.id ? null : role.id); }}
                        className="p-1 text-discord-gray hover:text-green-400 transition-colors"
                        title="Права"
                      >
                        <Shield size={14} />
                      </button>
                      <button
                        onClick={() => { setEditingRole(role.id); setEditName(role.name); setEditColor(role.color); setEditPermissions(role.permissions || 0); }}
                        className="p-1 text-discord-gray hover:text-discord-text transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      {!role.is_default && (
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="p-1 text-discord-gray hover:text-discord-red transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Permissions panel */}
              {showPerms === role.id && editingRole !== role.id && (
                <div className="px-3 pb-3 pt-1 border-t border-discord-light/10">
                  <p className="text-xs font-bold text-discord-accent uppercase tracking-wider mb-2">Права роли</p>
                  <div className="grid grid-cols-2 gap-1">
                    {PERMISSIONS.map(p => (
                      <label key={p.bit} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-discord-light/10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!(role.permissions & p.bit)}
                          onChange={async () => {
                            const newPerms = role.permissions ^ p.bit;
                            const data = await apiFetch(`/api/messages/roles/${server.id}/${role.id}`, {
                              method: 'PUT',
                              body: JSON.stringify({ permissions: newPerms }),
                            });
                            if (data.id) {
                              setRoles(roles.map(r => r.id === role.id ? data : r));
                            }
                          }}
                          className="rounded"
                        />
                        <div>
                          <span className="text-xs text-discord-text">{p.label}</span>
                          <span className="block text-[10px] text-discord-muted">{p.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
