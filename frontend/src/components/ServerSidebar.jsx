import React, { useState } from 'react';
import { MessageCircle, Plus, Compass, Users, Home, Bell, Settings, Hash, ChevronDown, ChevronRight, Crown, Terminal, Trophy, ShoppingCart, Coins, Gamepad2, TrendingUp } from 'lucide-react';
import SubscriptionBadge from './SubscriptionBadge';
import DeveloperMode from './DeveloperMode';

function SidebarGroup({ label, icon: Icon, children, defaultOpen = true, active = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-discord-muted hover:text-discord-gray transition-colors">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {Icon && <Icon size={12} />}
        <span>{label}</span>
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

function NavBtn({ onClick, active, icon: Icon, emoji, label, color = '' }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
        active
          ? `bg-discord-accent/15 text-discord-accent ${color}`
          : 'text-discord-gray hover:text-discord-white hover:bg-discord-light/20'
      }`}>
      {emoji ? <span className="text-base">{emoji}</span> : <Icon size={18} className={active ? 'text-discord-accent' : ''} />}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ServerSidebar({ servers, currentServer, onSelectServer, onCreateServer, onJoinServer, onGoHome, onSelectFriends, showFriends, getServerUnread, getServerMention, onOpenExplore, onOpenNotifications, showExplore, showNotifications, onOpenMessages, showMessages, onOpenCommunities, showCommunities, casinoUnlocked, onOpenCasino, showCasino, onOpenChess, showChess, onOpenSubscriptions, showSubscriptions, onOpenCollection, showCollection, onOpenShop, showShop, onOpenStats, showStats, onSettings, user }) {
  const [showDevMode, setShowDevMode] = useState(false);

  const isHome = !currentServer && !showFriends && !showExplore && !showNotifications && !showMessages && !showCommunities && !showCasino && !showChess && !showSubscriptions && !showCollection && !showShop && !showStats;

  return (
    <div className="w-[260px] bg-discord-darker flex flex-col flex-shrink-0 border-r border-discord-light/30">
      <div className="h-14 px-4 flex items-center border-b border-discord-light/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-discord-blurple to-discord-accent flex items-center justify-center shadow-lg shadow-discord-blurple/30">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-discord-white">Privesk</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        <SidebarGroup label="Навигация" icon={Compass} defaultOpen={true}>
          <NavBtn onClick={onGoHome} active={isHome} icon={Home} label="Главная" />
          <NavBtn onClick={onOpenExplore} active={showExplore} icon={Compass} label="Обзор" />
          <NavBtn onClick={onOpenMessages} active={showMessages} icon={MessageCircle} label="Сообщения" />
          <NavBtn onClick={onOpenCommunities} active={showCommunities} icon={Users} label="Комьюнити" />
          <NavBtn onClick={onOpenNotifications} active={showNotifications} icon={Bell} label="Уведомления" />
        </SidebarGroup>

        <SidebarGroup label="Развлечения" icon={Gamepad2} defaultOpen={true}>
          <NavBtn onClick={onOpenCollection} active={showCollection} icon={Trophy} label="Коллекция" />
          <NavBtn onClick={onOpenShop} active={showShop} icon={ShoppingCart} label="Магазин" />
          {casinoUnlocked && (
            <NavBtn onClick={onOpenCasino} active={showCasino} emoji="🎰" label="Казино"
              color={showCasino ? 'bg-gradient-to-r from-discord-yellow/20 to-orange-500/20 text-discord-yellow border border-discord-yellow/30' : ''} />
          )}
          <NavBtn onClick={onOpenChess} active={showChess} emoji="♞" label="Шахматы"
            color={showChess ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30' : ''} />
        </SidebarGroup>

        <SidebarGroup label="Аккаунт" icon={Crown} defaultOpen={false}>
          <NavBtn onClick={onOpenSubscriptions} active={showSubscriptions} icon={Crown} label="Подписки" />
          <NavBtn onClick={onOpenStats} active={showStats} icon={TrendingUp} label="Статистика" />
          <NavBtn onClick={onSettings} active={false} icon={Settings} label="Настройки" />
          <NavBtn onClick={() => setShowDevMode(true)} active={false} icon={Terminal} label="Dev Mode"
            color="text-green-400 hover:text-green-300 hover:bg-green-500/10" />
        </SidebarGroup>
      </div>

      <div className="border-t border-discord-light/20 p-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-discord-light/20 transition-all duration-200 cursor-pointer" onClick={onSettings}>
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md" style={{
              background: user?.profile_theme || 'linear-gradient(135deg, #6c5ce7, #a855f7)',
              border: user?.profile_border ? `2px solid ${user.profile_border}` : 'none',
              boxShadow: user?.profile_border ? `0 0 6px ${user.profile_border}40` : 'none'
            }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-discord-darker bg-discord-green" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={user?.name_color ? (user.name_color.startsWith('linear') ? { background: user.name_color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: user.name_color }) : { color: 'white' }}>{user?.username || 'User'}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-discord-muted truncate">@{user?.tag || '0000'}</p>
              <SubscriptionBadge tier={user?.subscription} />
            </div>
          </div>
          {user?.coins > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
              <Coins size={10} className="text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-bold">{user.coins}</span>
            </div>
          )}
        </div>
      </div>

      {showDevMode && (
        <DeveloperMode user={user} onClose={() => setShowDevMode(false)} />
      )}
    </div>
  );
}

export default React.memo(ServerSidebar);
