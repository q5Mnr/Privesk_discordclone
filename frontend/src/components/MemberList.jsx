import React, { useState } from 'react';
import { Search, TrendingUp, MessageCircle } from 'lucide-react';
import SubscriptionBadge from './SubscriptionBadge';

const STATUS_COLORS = {
  online: 'bg-discord-green shadow-lg shadow-discord-green/50',
  idle: 'bg-discord-yellow',
  dnd: 'bg-discord-red',
  offline: 'bg-discord-muted',
};

const ROLE_ORDER = { owner: 0, admin: 1, moderator: 2, member: 3 };

function sortMembers(members) {
  return [...members].sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 3;
    const rb = ROLE_ORDER[b.role] ?? 3;
    if (ra !== rb) return ra - rb;
    const pa = a.roles?.[0]?.position ?? 0;
    const pb = b.roles?.[0]?.position ?? 0;
    if (pa !== pb) return pb - pa;
    return (a.username || '').localeCompare(b.username || '');
  });
}

function getGroupLabel(m) {
  const customRoles = (m.roles || []).filter(r => !r.is_default);
  if (customRoles.length > 0) return customRoles[0].name;
  switch (m.role) {
    case 'owner': return 'Владелец';
    case 'admin': return 'Админ';
    case 'moderator': return 'Модератор';
    default: return 'Участники';
  }
}

function getGroupColor(m) {
  const customRoles = (m.roles || []).filter(r => !r.is_default);
  if (customRoles.length > 0) return customRoles[0].color;
  switch (m.role) {
    case 'owner': return '#ffa502';
    case 'admin': return '#ff4757';
    case 'moderator': return '#00d4aa';
    default: return null;
  }
}

function MemberList({ members, onUsernameClick }) {
  const [search, setSearch] = useState('');
  const q = search.toLowerCase();
  const filtered = members.filter(m => !q || (m.username || '').toLowerCase().includes(q) || (m.nickname || '').toLowerCase().includes(q));
  const sorted = sortMembers(filtered);

  const groups = [];
  sorted.forEach(m => {
    const label = getGroupLabel(m);
    let group = groups.find(g => g.label === label);
    if (!group) {
      group = { label, color: getGroupColor(m), members: [] };
      groups.push(group);
    }
    group.members.push(m);
  });

  const roleOrder = { 'Владелец': 0, 'Админ': 1, 'Модератор': 2 };
  groups.sort((a, b) => {
    const oa = a.color ? (roleOrder[a.label] ?? (100 - (groups.indexOf(a)))) : 100;
    const ob = b.color ? (roleOrder[b.label] ?? (100 - (groups.indexOf(b)))) : 100;
    return oa - ob;
  });

  const onlineCount = members.filter(m => m.status === 'online' || m.status === 'idle' || m.status === 'dnd').length;

  const renderMember = (member) => {
    const color = (() => {
      const customRoles = (member.roles || []).filter(r => !r.is_default);
      if (customRoles.length > 0) return customRoles[0].color;
      if (member.role_color) return member.role_color;
      if (member.role === 'owner') return '#ffa502';
      if (member.role === 'admin') return '#ff4757';
      if (member.role === 'moderator') return '#00d4aa';
      return null;
    })();

    const badges = (() => {
      if (member.roles?.length > 0) {
        const customRoles = member.roles.filter(r => !r.is_default);
        return customRoles.map(r => ({ name: r.name, color: r.color }));
      }
      if (member.role_name) return [{ name: member.role_name, color: member.role_color }];
      return [];
    })();

    return (
      <div
        key={member.id}
        onClick={() => onUsernameClick?.(member.id)}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-discord-light/30 cursor-pointer transition-all duration-200 group ${
          member.status === 'offline' || !member.status ? 'opacity-50' : ''
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            member.status === 'dnd' ? 'bg-discord-red' : 'bg-gradient-to-br from-discord-blurple to-discord-gradient2'
          }`}>
            {member.avatar ? (
              <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              member.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-discord-darker ${STATUS_COLORS[member.status] || 'bg-discord-muted'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <span
            className="text-sm truncate block font-medium"
            style={{ color: color || undefined }}
          >
            {member.nickname || member.username}
          </span>
          <SubscriptionBadge tier={member.subscription} />
          {badges.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{ color: b.color, backgroundColor: `${b.color}20` }}
                >
                  {b.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <MessageCircle size={16} className="text-discord-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  return (
    <div className="w-[280px] bg-discord-darker flex flex-col flex-shrink-0 overflow-y-auto border-l border-discord-light/30">
      {/* Online Now Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-discord-white">Online Now</h3>
          <span className="text-xs text-discord-accent font-medium">{onlineCount}</span>
        </div>
      </div>

      {/* Member List */}
      <div className="px-2 flex-1 overflow-y-auto">
        {groups.map(group => (
          <div key={group.label} className="mb-4">
            <h4
              className="text-[11px] font-bold uppercase tracking-wider mb-2 px-3"
              style={{ color: group.color || '#5a5e7a' }}
            >
              {group.label} — {group.members.length}
            </h4>
            {group.members.map(m => renderMember(m))}
          </div>
        ))}
      </div>

      {/* Trending Section */}
      <div className="border-t border-discord-light/20 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-discord-accent" />
          <h4 className="text-xs font-bold text-discord-white uppercase tracking-wider">Trending</h4>
        </div>
        <div className="space-y-2">
          <div className="p-2 rounded-xl bg-discord-mid/50 border border-discord-light/10">
            <p className="text-xs text-discord-white font-medium truncate">Welcome to this server!</p>
            <p className="text-[10px] text-discord-muted mt-0.5">General Chat</p>
          </div>
          <div className="p-2 rounded-xl bg-discord-mid/50 border border-discord-light/10">
            <p className="text-xs text-discord-white font-medium truncate">Check out the rules</p>
            <p className="text-[10px] text-discord-muted mt-0.5">Info Channel</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MemberList);
