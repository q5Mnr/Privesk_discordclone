import React, { useState } from 'react';
import { MessageCircle, Plus, Compass, Users, Home, Bell, Settings, Hash, ChevronDown, ChevronRight, Crown, Terminal, Trophy, ShoppingCart, Coins, Gamepad2, TrendingUp } from 'lucide-react';
import SubscriptionBadge from './SubscriptionBadge';
import DeveloperMode from './DeveloperMode';
import { useI18n } from '../i18n/I18nContext';

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

function ServerSidebar({ servers, currentServer, onSelectServer, onCreateServer, onJoinServer, onGoHome, onSelectFriends, showFriends, getServerUnread, getServerMention, onOpenExplore, onOpenNotifications, showExplore, showNotifications, onOpenMessages, showMessages, onOpenCommunities, showCommunities, casinoUnlocked, onOpenCasino, showCasino, onOpenSubscriptions, showSubscriptions, onOpenCollection, showCollection, onOpenShop, showShop, onOpenStats, showStats, onSettings, user, layout = 'discord' }) {
  const [showDevMode, setShowDevMode] = useState(false);
  const { t } = useI18n();
  const isTelegram = layout === 'telegram';

  const isHome = !currentServer && !showFriends && !showExplore && !showNotifications && !showMessages && !showCommunities && !showCasino && !showSubscriptions && !showCollection && !showShop && !showStats;

  return (
    <div className="w-[260px] bg-discord-darker flex flex-col flex-shrink-0 border border-discord-light/20 rounded-2xl overflow-hidden">
      <div className="h-14 px-4 flex items-center border-b border-discord-light/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-discord-blurple to-discord-accent flex items-center justify-center shadow-lg shadow-discord-blurple/30">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-discord-white">Privesk</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {isTelegram ? (
          <>
            <NavBtn onClick={onOpenMessages} active={showMessages} icon={MessageCircle} label={t('Сообщения')} />
            <NavBtn onClick={onSelectFriends} active={showFriends} icon={Users} label={t('Друзья')} />
            <NavBtn onClick={onOpenExplore} active={showExplore} icon={Compass} label={t('Обзор')} />
            <NavBtn onClick={onOpenCommunities} active={showCommunities} icon={Users} label={t('Комьюнити')} />
            <NavBtn onClick={onOpenNotifications} active={showNotifications} icon={Bell} label={t('Уведомления')} />

            <div className="pt-3 pb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-discord-muted">{t('Серверы')}</div>
            {servers.map((s) => {
              const active = currentServer?.id === s.id;
              const unread = getServerUnread ? getServerUnread(s.id) : 0;
              const initials = (s.name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <button key={s.id} onClick={() => onSelectServer(s)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm ${
                    active ? 'bg-discord-accent/15 text-discord-accent' : 'text-discord-gray hover:text-discord-white hover:bg-discord-light/20'
                  }`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden bg-gradient-to-br from-discord-blurple to-discord-accent">
                    {s.icon ? <img src={s.icon} alt="" className="w-full h-full object-cover" /> : initials}
                  </div>
                  <span className="font-medium truncate flex-1 text-left">{s.name}</span>
                  {unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-discord-red text-white text-[10px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>
                  )}
                </button>
              );
            })}
            <NavBtn onClick={onCreateServer} active={false} icon={Plus} label={t('Создать сервер')} />
            <NavBtn onClick={onJoinServer} active={false} icon={Compass} label={t('Присоединиться')} />

            <div className="pt-3 pb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-discord-muted">{t('Ещё')}</div>
            <NavBtn onClick={onOpenCollection} active={showCollection} icon={Trophy} label={t('Коллекция')} />
            <NavBtn onClick={onOpenShop} active={showShop} icon={ShoppingCart} label={t('Магазин')} />
            {casinoUnlocked && (
              <NavBtn onClick={onOpenCasino} active={showCasino} emoji="🎰" label={t('Казино')}
                color={showCasino ? 'bg-gradient-to-r from-discord-yellow/20 to-orange-500/20 text-discord-yellow border border-discord-yellow/30' : ''} />
            )}
            <NavBtn onClick={onOpenSubscriptions} active={showSubscriptions} icon={Crown} label={t('Подписки')} />
            <NavBtn onClick={onOpenStats} active={showStats} icon={TrendingUp} label={t('Статистика')} />
            <NavBtn onClick={onSettings} active={false} icon={Settings} label={t('Настройки')} />
            <NavBtn onClick={() => setShowDevMode(true)} active={false} icon={Terminal} label="Dev Mode"
              color="text-green-400 hover:text-green-300 hover:bg-green-500/10" />
          </>
        ) : (
          <>
            <SidebarGroup label={t('Навигация')} icon={Compass} defaultOpen={true}>
              <NavBtn onClick={onGoHome} active={isHome} icon={Home} label={t('Главная')} />
              <NavBtn onClick={onOpenExplore} active={showExplore} icon={Compass} label={t('Обзор')} />
              <NavBtn onClick={onOpenMessages} active={showMessages} icon={MessageCircle} label={t('Сообщения')} />
              <NavBtn onClick={onOpenCommunities} active={showCommunities} icon={Users} label={t('Комьюнити')} />
              <NavBtn onClick={onOpenNotifications} active={showNotifications} icon={Bell} label={t('Уведомления')} />
            </SidebarGroup>

            <SidebarGroup label={t('Развлечения')} icon={Gamepad2} defaultOpen={true}>
              <NavBtn onClick={onOpenCollection} active={showCollection} icon={Trophy} label={t('Коллекция')} />
              <NavBtn onClick={onOpenShop} active={showShop} icon={ShoppingCart} label={t('Магазин')} />
              {casinoUnlocked && (
                <NavBtn onClick={onOpenCasino} active={showCasino} emoji="🎰" label={t('Казино')}
                  color={showCasino ? 'bg-gradient-to-r from-discord-yellow/20 to-orange-500/20 text-discord-yellow border border-discord-yellow/30' : ''} />
              )}
            </SidebarGroup>

            <SidebarGroup label={t('Аккаунт')} icon={Crown} defaultOpen={false}>
              <NavBtn onClick={onOpenSubscriptions} active={showSubscriptions} icon={Crown} label={t('Подписки')} />
              <NavBtn onClick={onOpenStats} active={showStats} icon={TrendingUp} label={t('Статистика')} />
              <NavBtn onClick={onSettings} active={false} icon={Settings} label={t('Настройки')} />
              <NavBtn onClick={() => setShowDevMode(true)} active={false} icon={Terminal} label="Dev Mode"
                color="text-green-400 hover:text-green-300 hover:bg-green-500/10" />
            </SidebarGroup>
          </>
        )}
      </div>

      <div className="border-t border-discord-light/20 p-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-discord-light/20 transition-all duration-200 cursor-pointer" onClick={onSettings}>
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md" style={{
              background: user?.profile_theme || 'linear-gradient(135deg, #3b82f6, #22d3ee)',
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
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
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
