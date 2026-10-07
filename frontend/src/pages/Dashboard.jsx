import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../utils/api';
import ServerSidebar from '../components/ServerSidebar';
import ChannelSidebar from '../components/ChannelSidebar';
import ChatArea from '../components/ChatArea';
import DmSidebar from '../components/DmSidebar';
import DmChat from '../components/DmChat';
import MemberList from '../components/MemberList';
import FriendsPage from '../components/FriendsPage';
import CreateServerModal from '../components/CreateServerModal';
import JoinServerModal from '../components/JoinServerModal';
import SettingsModal from '../components/SettingsModal';
import ServerSettings from '../components/ServerSettings';
import UserProfileCard from '../components/UserProfileCard';
import ThreadView from '../components/ThreadView';
import ForumView from '../components/ForumView';
import EventsPanel from '../components/EventsPanel';
import OnboardingScreen from '../components/OnboardingScreen';
import ExplorePage from '../components/ExplorePage';
import NotificationsPanel from '../components/NotificationsPanel';
import CasinoGame from '../components/CasinoGame';
import ChessGame from '../components/ChessGame';
import SubscriptionsPage from '../components/SubscriptionsPage';
import CollectionPage from '../components/CollectionPage';
import ShopPage from '../components/ShopPage';
import CommunitiesPage from '../components/CommunitiesPage';
import StatsPage from '../components/StatsPage';
import BoostPanel from '../components/BoostPanel';
import { Search } from 'lucide-react';

export default function Dashboard() {
  const { user, socket, logout, updateUser } = useAuth();
  const [servers, setServers] = useState([]);
  const [currentServer, setCurrentServer] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [dmChannels, setDmChannels] = useState([]);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const [unreadData, setUnreadData] = useState([]);
  const [mentionData, setMentionData] = useState({ servers: [], channels: [] });
  const [mentionToast, setMentionToast] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [showEvents, setShowEvents] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [myPermissions, setMyPermissions] = useState(0xFFFFFFFF);
  const [showExplore, setShowExplore] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showCommunities, setShowCommunities] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [casinoUnlocked, setCasinoUnlocked] = useState(false);
  const [showCasino, setShowCasino] = useState(false);
  const [showChess, setShowChess] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [userSubscription, setUserSubscription] = useState('free');
  const [showStats, setShowStats] = useState(false);
  const [showBoosts, setShowBoosts] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      setServers([]);
      setCurrentServer(null);
      setCurrentChannel(null);
      setChannels([]);
      setMembers([]);
      setDmChannels([]);
      setUnreadData([]);
      setMentionData({ servers: [], channels: [] });
      setActiveThread(null);
      setShowEvents(false);
      setShowOnboarding(false);
      setShowExplore(false);
      setShowNotifications(false);
      loadServers();
      loadDmChannels();
      loadUnread();
      loadMentions();
      loadCasinoStatus();
      loadSubscription();
    }
  }, [user?.id]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', (message) => {
        if (message.channel_id === currentChannel?.id) {
          window.dispatchEvent(new CustomEvent('new_message', { detail: message }));
        } else if (message.server_id) {
          setUnreadData(prev => prev.map(srv => {
            if (srv.server_id !== message.server_id) return srv;
            return {
              ...srv,
              channels: srv.channels.map(ch =>
                ch.id === message.channel_id ? { ...ch, unread_count: (ch.unread_count || 0) + 1 } : ch
              )
            };
          }));
        }
      });

      socket.on('message_edited', (message) => {
        window.dispatchEvent(new CustomEvent('message_edited', { detail: message }));
      });

      socket.on('message_deleted', (data) => {
        window.dispatchEvent(new CustomEvent('message_deleted', { detail: data }));
      });

      socket.on('dm_message', (message) => {
        window.dispatchEvent(new CustomEvent('dm_message', { detail: message }));
        loadDmChannels();
      });

      socket.on('dm_message_edited', (message) => {
        window.dispatchEvent(new CustomEvent('dm_message_edited', { detail: message }));
      });

      socket.on('dm_message_deleted', (data) => {
        window.dispatchEvent(new CustomEvent('dm_message_deleted', { detail: data }));
      });

      socket.on('dm_reaction_updated', (data) => {
        window.dispatchEvent(new CustomEvent('dm_reaction_updated', { detail: data }));
      });

      socket.on('dm_user_typing', (data) => {
        window.dispatchEvent(new CustomEvent('dm_user_typing', { detail: data }));
      });

      socket.on('dm_user_stop_typing', (data) => {
        window.dispatchEvent(new CustomEvent('dm_user_stop_typing', { detail: data }));
      });

      socket.on('user_typing', (data) => {
        window.dispatchEvent(new CustomEvent('user_typing', { detail: data }));
      });

      socket.on('user_stop_typing', (data) => {
        window.dispatchEvent(new CustomEvent('user_stop_typing', { detail: data }));
      });

      socket.on('voice_users', (data) => {
        window.dispatchEvent(new CustomEvent('voice_users', { detail: data }));
      });

      socket.on('reaction_updated', (data) => {
        window.dispatchEvent(new CustomEvent('reaction_updated', { detail: data }));
      });

      socket.on('user_status', (data) => {
        setMembers(prev => prev.map(m =>
          m.id === data.userId ? { ...m, status: data.status } : m
        ));
        setDmChannels(prev => prev.map(dm => ({
          ...dm,
          members: dm.members?.map(m =>
            m.id === data.userId ? { ...m, status: data.status } : m
          )
        })));
      });

      socket.on('friend_request', (data) => {
        window.dispatchEvent(new CustomEvent('friend_request', { detail: data }));
      });

      socket.on('friend_request_accepted', (data) => {
        window.dispatchEvent(new CustomEvent('friend_request_accepted', { detail: data }));
      });

      socket.on('mention', (data) => {
        window.dispatchEvent(new CustomEvent('mention', { detail: data }));
        loadMentions();
        setMentionToast(data);
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.15;
          osc.start();
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.stop(ctx.currentTime + 0.3);
        } catch (e) {}
        setTimeout(() => setMentionToast(null), 4000);
      });

      socket.on('thread_created', (thread) => {
        window.dispatchEvent(new CustomEvent('thread_created', { detail: thread }));
      });

      socket.on('thread_message', (data) => {
        window.dispatchEvent(new CustomEvent('thread_message', { detail: data }));
      });

      socket.on('event_created', (event) => {
        window.dispatchEvent(new CustomEvent('event_created', { detail: event }));
      });

      socket.on('event_updated', (event) => {
        window.dispatchEvent(new CustomEvent('event_updated', { detail: event }));
      });

      socket.on('event_deleted', (data) => {
        window.dispatchEvent(new CustomEvent('event_deleted', { detail: data }));
      });

      socket.on('event_rsvp', (data) => {
        window.dispatchEvent(new CustomEvent('event_rsvp', { detail: data }));
      });

      socket.on('level_up', (data) => {
        setMentionToast({ type: 'level', level: data.level, text: `🎉 Вы достигли уровня ${data.level}!` });
        setTimeout(() => setMentionToast(null), 4000);
        apiGet('/api/auth/me').then(u => updateUser(u)).catch(() => {});
      });

      return () => {
        socket.off('new_message');
        socket.off('message_edited');
        socket.off('message_deleted');
        socket.off('dm_message');
        socket.off('dm_message_edited');
        socket.off('dm_message_deleted');
        socket.off('dm_reaction_updated');
        socket.off('dm_user_typing');
        socket.off('dm_user_stop_typing');
        socket.off('user_typing');
        socket.off('user_stop_typing');
        socket.off('voice_users');
        socket.off('reaction_updated');
        socket.off('user_status');
        socket.off('friend_request');
        socket.off('friend_request_accepted');
        socket.off('mention');
        socket.off('thread_created');
        socket.off('thread_message');
        socket.off('event_created');
        socket.off('event_updated');
        socket.off('event_deleted');
        socket.off('event_rsvp');
        socket.off('level_up');
      };
    }
  }, [socket, currentChannel, activeThread]);

  const loadServers = async () => {
    try {
      const data = await apiGet('/api/servers');
      setServers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDmChannels = async () => {
    try {
      const data = await apiGet('/api/dm');
      setDmChannels(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUnread = async () => {
    try {
      const data = await apiGet('/api/auth/unread');
      setUnreadData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMentions = async () => {
    try {
      const data = await apiGet('/api/auth/mentions');
      setMentionData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCasinoStatus = async () => {
    try {
      const data = await apiGet('/api/auth/casino-status');
      setCasinoUnlocked(!!data.unlocked);
    } catch (err) {
      console.error('casino-status error:', err);
    }
  };

  const loadSubscription = async () => {
    try {
      const data = await apiGet('/api/auth/subscription');
      setUserSubscription(data.subscription);
    } catch (err) {}
  };

  const markAsRead = async (channelId) => {
    try {
      await fetch(`/api/auth/read/${channelId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUnreadData(prev => prev.map(srv => ({
        ...srv,
        channels: srv.channels.map(ch =>
          ch.id === channelId ? { ...ch, unread_count: 0 } : ch
        )
      })));
      setMentionData(prev => ({
        ...prev,
        channels: prev.channels.map(ch =>
          ch.id === channelId ? { ...ch, mention_count: 0 } : ch
        ),
        servers: prev.servers.map(s => ({
          ...s,
          mention_count: s.channels?.reduce?.((sum, ch) => sum + (ch.id === channelId ? 0 : (ch.mention_count || 0)), 0) ?? s.mention_count
        }))
      }));
      loadMentions();
    } catch (err) {
      console.error(err);
    }
  };

  const selectServer = async (server) => {
    setShowFriends(false);
    setActiveThread(null);
    setShowEvents(false);
    setCurrentServer(server);
    setMyPermissions(0xFFFFFFFF);
    try {
      const data = await apiGet(`/api/servers/${server.id}`);
      setCurrentServer(prev => ({ ...prev, ...data }));
      setChannels(data.channels || []);
      setMembers(data.members || []);
      if (data.channels?.length > 0) {
        const textChannel = data.channels.find(c => c.type === 'text') || data.channels[0];
        selectChannel(textChannel);
      }
      checkOnboarding(server.id);
      try {
        const permData = await apiGet(`/api/messages/${server.id}/my-permissions`);
        setMyPermissions(permData.permissions);
      } catch {}
    } catch (err) {
      console.error(err);
    }
  };

  const checkOnboarding = async (serverId) => {
    try {
      const data = await apiGet(`/api/onboarding/check/${serverId}`);
      if (!data.completed) {
        setShowOnboarding(true);
      }
    } catch (err) {}
  };

  const handleServerSettingsUpdate = (updatedServer) => {
    if (updatedServer === null) {
      setCurrentServer(null);
      setCurrentChannel(null);
      loadServers();
    } else {
      setCurrentServer(updatedServer);
      if (updatedServer.channels) setChannels(updatedServer.channels);
      if (updatedServer.members) setMembers(updatedServer.members);
      setServers(prev => prev.map(s => s.id === updatedServer.id ? { ...s, ...updatedServer } : s));
    }
  };

  const selectChannel = (channel) => {
    if (currentChannel && socket) {
      socket.emit('leave_channel', currentChannel.id);
    }
    setActiveThread(null);
    setShowEvents(false);
    setCurrentChannel(channel);
    if (socket) {
      socket.emit('join_channel', channel.id);
    }
    markAsRead(channel.id);
  };

  const selectDm = (dm) => {
    setShowFriends(false);
    setCurrentServer(null);
    setCurrentChannel(null);
    setActiveThread(null);
    setShowEvents(false);
    navigate(`/channels/@me/${dm.id}`);
  };

  const selectFriends = () => {
    setShowFriends(true);
    setCurrentServer(null);
    setCurrentChannel(null);
    setActiveThread(null);
    setShowEvents(false);
    navigate('/channels/@me');
  };

  const handleCreateServer = async (serverData) => {
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(serverData)
      });
      const data = await res.json();
      if (data.server) {
        await loadServers();
        selectServer(data.server);
        setShowCreateServer(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinServer = async (inviteCode) => {
    const res = await fetch(`/api/servers/join/${inviteCode}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.server) {
      await loadServers();
      selectServer(data.server);
      setShowJoinServer(false);
    } else {
      throw new Error(data.error || 'Ошибка');
    }
  };

  const openProfile = (userId) => {
    setProfileUserId(userId);
    setShowProfile(true);
  };

  const getChannelUnread = (channelId) => {
    for (const srv of unreadData) {
      const ch = srv.channels?.find(c => c.id === channelId);
      if (ch) return ch.unread_count || 0;
    }
    return 0;
  };

  const getServerUnread = (serverId) => {
    const srv = unreadData.find(s => s.server_id === serverId);
    if (!srv) return 0;
    return srv.channels.reduce((sum, ch) => sum + (ch.unread_count || 0), 0);
  };

  const getChannelMention = (channelId) => {
    const ch = mentionData.channels?.find(c => c.id === channelId);
    return ch?.mention_count || 0;
  };

  const getServerMention = (serverId) => {
    const srv = mentionData.servers?.find(s => s.server_id === serverId);
    return srv?.mention_count || 0;
  };

  const handleOpenThread = (thread, parentChannel) => {
    setActiveThread({ thread, parentChannel });
  };

  const handleCloseThread = () => {
    setActiveThread(null);
  };

  const handleOpenEvents = () => {
    setShowEvents(true);
  };

  const isForumChannel = currentChannel?.type === 'forum';

  return (
    <div className="flex h-screen overflow-hidden">
      <ServerSidebar
        servers={servers}
        currentServer={currentServer}
        onSelectServer={selectServer}
        onCreateServer={() => setShowCreateServer(true)}
        onJoinServer={() => setShowJoinServer(true)}
        onGoHome={() => {
          setCurrentServer(null);
          setCurrentChannel(null);
          setShowFriends(false);
          setActiveThread(null);
          setShowEvents(false);
          setShowExplore(false);
          setShowNotifications(false);
          setShowMessages(false);
          setShowShop(false);
          setShowCollection(false);
          setShowCasino(false);
          setShowSubscriptions(false);
          setShowStats(false);
          setShowCommunities(false);
          navigate('/channels/@me');
        }}
        onSelectFriends={selectFriends}
        showFriends={showFriends}
        getServerUnread={getServerUnread}
        getServerMention={getServerMention}
        onOpenExplore={() => { setShowExplore(true); setShowNotifications(false); setShowFriends(false); setShowMessages(false); setCurrentServer(null); setCurrentChannel(null); }}
        onOpenNotifications={() => { setShowNotifications(true); setShowExplore(false); setShowFriends(false); setShowMessages(false); setCurrentServer(null); setCurrentChannel(null); }}
        showExplore={showExplore}
        showNotifications={showNotifications}
        onOpenMessages={() => { setShowMessages(true); setShowExplore(false); setShowNotifications(false); setShowFriends(false); setShowCommunities(false); setCurrentServer(null); setCurrentChannel(null); }}
        showMessages={showMessages}
        onOpenCommunities={() => { setShowCommunities(true); setShowExplore(false); setShowNotifications(false); setShowMessages(false); setShowFriends(false); setCurrentServer(null); setCurrentChannel(null); }}
        showCommunities={showCommunities}
        casinoUnlocked={casinoUnlocked}
        onOpenCasino={() => { setShowCasino(true); setShowChess(false); }}
        showCasino={showCasino}
        onOpenChess={() => { setShowChess(true); setShowCasino(false); setShowExplore(false); setShowNotifications(false); setShowCommunities(false); setShowMessages(false); setShowFriends(false); setCurrentServer(null); setCurrentChannel(null); }}
        showChess={showChess}
        onOpenSubscriptions={() => { setShowSubscriptions(true); setShowCasino(false); setShowChess(false); setShowExplore(false); setShowNotifications(false); setShowCommunities(false); setShowMessages(false); setShowFriends(false); setCurrentServer(null); setCurrentChannel(null); }}
        showSubscriptions={showSubscriptions}
        onOpenCollection={() => { setShowCollection(true); setShowCasino(false); setShowChess(false); setShowExplore(false); setShowNotifications(false); setShowCommunities(false); setShowMessages(false); setShowFriends(false); setShowSubscriptions(false); setShowShop(false); setCurrentServer(null); setCurrentChannel(null); }}
        showCollection={showCollection}
        onOpenShop={() => { setShowShop(true); setShowCollection(false); setShowCasino(false); setShowChess(false); setShowExplore(false); setShowNotifications(false); setShowCommunities(false); setShowMessages(false); setShowFriends(false); setShowSubscriptions(false); setShowStats(false); setCurrentServer(null); setCurrentChannel(null); }}
        showShop={showShop}
        onOpenStats={() => { setShowStats(true); setShowShop(false); setShowCollection(false); setShowCasino(false); setShowChess(false); setShowExplore(false); setShowNotifications(false); setShowCommunities(false); setShowMessages(false); setShowFriends(false); setShowSubscriptions(false); setCurrentServer(null); setCurrentChannel(null); }}
        showStats={showStats}
        onSettings={() => setShowSettings(true)}
        user={user}
      />

      {currentServer ? (
        <>
          <ChannelSidebar
            server={currentServer}
            channels={channels}
            currentChannel={currentChannel}
            onSelectChannel={selectChannel}
            user={user}
            onOpenServerSettings={() => setShowServerSettings(true)}
            getChannelUnread={getChannelUnread}
            getChannelMention={getChannelMention}
            onOpenEvents={handleOpenEvents}
            onOpenBoosts={() => setShowBoosts(true)}
          />
          <div className="flex flex-col flex-1 min-w-0">
            {currentChannel && (
              isForumChannel ? (
                <ForumView
                  channel={currentChannel}
                  server={currentServer}
                  user={user}
                  onOpenThread={handleOpenThread}
                />
              ) : (
                <ChatArea
                  channel={currentChannel}
                  server={currentServer}
                  socket={socket}
                  user={user}
                  onUsernameClick={openProfile}
                  members={members}
                  onOpenThread={handleOpenThread}
                  myPermissions={myPermissions}
                />
              )
            )}
          </div>
          {!isForumChannel && <MemberList members={members} onUsernameClick={openProfile} userSubscription={userSubscription} />}
        </>
      ) : showMessages ? (
        <>
          <DmSidebar
            dmChannels={dmChannels}
            onSelectDm={selectDm}
            onSelectFriends={selectFriends}
            showFriends={showFriends}
            user={user}
          />
          <div className="flex-1 min-w-0">
            <Routes>
              <Route path="@me/:dmId" element={
                <DmChat socket={socket} user={user} />
              } />
              <Route path="@me" element={
                <FriendsPage onSelectDm={(dm) => { setShowMessages(false); selectDm(dm); }} />
              } />
            </Routes>
          </div>
        </>
      ) : (
        <div className="flex flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            {showExplore ? (
              <ExplorePage
                onBack={() => { setShowExplore(false); }}
                onJoinServer={(server) => {
                  setShowExplore(false);
                  selectServer(server);
                }}
              />
            ) : showNotifications ? (
              <NotificationsPanel
                onBack={() => setShowNotifications(false)}
                onNavigateToChannel={(serverId, channelId) => {
                  setShowNotifications(false);
                  const srv = servers.find(s => s.id === serverId);
                  if (srv) {
                    selectServer(srv);
                    setTimeout(() => {
                      const ch = channels.find(c => c.id === channelId) || srv.channels?.find(c => c.id === channelId);
                      if (ch) selectChannel(ch);
                    }, 200);
                  }
                }}
              />
            ) : showFriends ? (
              <FriendsPage onSelectDm={(dm) => {
                setShowFriends(false);
                selectDm(dm);
              }} />
            ) : showSubscriptions ? (
              <SubscriptionsPage onBack={() => setShowSubscriptions(false)} user={user} />
            ) : showCollection ? (
              <CollectionPage onBack={() => setShowCollection(false)} user={user} />
            ) : showCommunities ? (
              <CommunitiesPage servers={servers} onSelectServer={(s) => { setShowCommunities(false); selectServer(s); }} onSelectChannel={(ch) => { setShowCommunities(false); selectChannel(ch); }} onClose={() => setShowCommunities(false)} />
            ) : (
              <div className="flex-1 overflow-y-auto bg-discord-mid">
                {/* Top Bar */}
                <div className="h-16 px-6 flex items-center border-b border-discord-light/20 bg-discord-mid/80 backdrop-blur-xl sticky top-0 z-10">
                  <h2 className="text-xl font-bold text-discord-white mr-6">Home</h2>
                  <div className="flex-1 max-w-xl relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-discord-muted" />
                    <input
                      type="text"
                      value={homeSearchQuery}
                      onChange={(e) => setHomeSearchQuery(e.target.value)}
                      placeholder="Search communities, people, posts..."
                      className="w-full bg-discord-dark border border-discord-light/20 rounded-2xl pl-12 pr-4 py-2.5 text-sm text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => setShowCreateServer(true)} className="p-2.5 rounded-xl bg-discord-dark border border-discord-light/20 text-discord-gray hover:text-discord-accent hover:border-discord-accent/30 transition-all duration-200" title="Создать сервер">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <button onClick={() => setShowMessages(true)} className="p-2.5 rounded-xl bg-discord-dark border border-discord-light/20 text-discord-gray hover:text-discord-accent hover:border-discord-accent/30 transition-all duration-200" title="Сообщения">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </button>
                    <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 rounded-xl bg-discord-dark border border-discord-light/20 text-discord-gray hover:text-discord-accent hover:border-discord-accent/30 transition-all duration-200 relative" title="Уведомления">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      {mentionData.channels?.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-discord-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {mentionData.channels.reduce((sum, c) => sum + (c.mention_count || 0), 0)}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Welcome Banner */}
                  <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-discord-blurple via-purple-500 to-discord-gradient2 p-8 shadow-2xl shadow-discord-blurple/20">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkg4VjI4aDI4em0tMTItNHYySDE2di0yaDE2em04LTZWMjhINHYyaDE2em04LThoLTZ2Mmg2Vjh6bTgtNHYyaDZ2LTJoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="max-w-md">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Privesk 👋</h1>
                        <p className="text-white/80 text-sm mb-4">The community & communication platform built for real connections.</p>
                        <button onClick={() => { setShowExplore(true); setShowNotifications(false); setShowFriends(false); setShowMessages(false); setCurrentServer(null); setCurrentChannel(null); }} className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl backdrop-blur-sm transition-all duration-200 border border-white/20">
                          Explore →
                        </button>
                      </div>
                      <div className="hidden lg:block w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <div className="text-6xl">🤖</div>
                      </div>
                    </div>
                  </div>

                  {/* Communities for you */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-discord-white">{homeSearchQuery ? 'Результаты' : 'Communities for you'}</h2>
                      {!homeSearchQuery && <button className="text-sm text-discord-accent hover:underline font-medium">See all</button>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {servers.filter(s => !homeSearchQuery || s.name.toLowerCase().includes(homeSearchQuery.toLowerCase())).slice(0, 8).map((server) => (
                        <div
                          key={server.id}
                          onClick={() => selectServer(server)}
                          className="bg-discord-dark/50 border border-discord-light/20 rounded-2xl p-4 hover:border-discord-accent/30 hover:shadow-lg hover:shadow-discord-accent/10 transition-all duration-300 cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-lg font-bold mb-3 shadow-lg group-hover:scale-105 transition-transform">
                            {server.icon ? (
                              <img src={server.icon} alt={server.name} className="w-full h-full rounded-xl object-cover" />
                            ) : (
                              server.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-discord-white truncate mb-1">{server.name}</h3>
                          <p className="text-[11px] text-discord-muted">{server.member_count || 0} members</p>
                        </div>
                      ))}

                      {/* Add Server Card */}
                      {!homeSearchQuery && (
                        <div
                          onClick={() => setShowCreateServer(true)}
                          className="border-2 border-dashed border-discord-light/30 rounded-2xl p-4 hover:border-discord-accent/30 hover:bg-discord-accent/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[120px] group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-discord-mid flex items-center justify-center text-discord-muted group-hover:text-discord-accent transition-colors mb-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </div>
                          <span className="text-xs text-discord-muted group-hover:text-discord-accent transition-colors font-medium">Add Server</span>
                        </div>
                      )}
                      {homeSearchQuery && servers.filter(s => s.name.toLowerCase().includes(homeSearchQuery.toLowerCase())).length === 0 && (
                        <div className="col-span-full text-center py-10 text-discord-muted text-sm">
                          Ничего не найдено по запросу "{homeSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {!homeSearchQuery && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div onClick={selectFriends} className="bg-discord-dark/50 border border-discord-light/20 rounded-2xl p-4 hover:border-discord-accent/30 transition-all duration-200 cursor-pointer flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-discord-green/20 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-discord-white group-hover:text-discord-accent transition-colors">Friends</p>
                        <p className="text-[11px] text-discord-muted">Find and chat</p>
                      </div>
                    </div>
                    <div onClick={() => setShowJoinServer(true)} className="bg-discord-dark/50 border border-discord-light/20 rounded-2xl p-4 hover:border-discord-blurple/30 transition-all duration-200 cursor-pointer flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-discord-blurple/20 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-discord-white group-hover:text-discord-blurple transition-colors">Join Server</p>
                        <p className="text-[11px] text-discord-muted">Enter invite code</p>
                      </div>
                    </div>
                    <div onClick={() => setShowCreateServer(true)} className="bg-discord-dark/50 border border-discord-light/20 rounded-2xl p-4 hover:border-discord-gradient2/30 transition-all duration-200 cursor-pointer flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-discord-gradient2/20 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-discord-white group-hover:text-discord-gradient2 transition-colors">Create Server</p>
                        <p className="text-[11px] text-discord-muted">Start your own</p>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Online Now + Trending */}
          {!showExplore && !showNotifications && !showFriends && (
            <div className="w-[280px] bg-discord-darker flex flex-col flex-shrink-0 border-l border-discord-light/30 overflow-y-auto">
              {/* Online Now */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-discord-white">Online Now</h3>
                  <button className="text-xs text-discord-accent hover:underline font-medium">See all</button>
                </div>
                <div className="space-y-1">
                  {members.filter(m => m.status === 'online').slice(0, 6).map(member => (
                    <div
                      key={member.id}
                      onClick={() => openProfile(member.id)}
                      className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-discord-light/20 transition-all duration-200 cursor-pointer"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-discord-blurple to-discord-accent flex items-center justify-center text-white text-xs font-semibold">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            member.username?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-discord-darker bg-discord-green" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-discord-white truncate">{member.username}</p>
                        <p className="text-[11px] text-discord-muted truncate">@{member.tag}</p>
                      </div>
                    </div>
                  ))}
                  {members.filter(m => m.status === 'online').length === 0 && (
                    <p className="text-xs text-discord-muted py-2">No one online</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-discord-light/20 mx-4" />

              {/* Trending */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-discord-white">Trending</h3>
                  <button className="text-xs text-discord-accent hover:underline font-medium">See all</button>
                </div>
                <div className="space-y-3">
                  {servers.slice(0, 4).map(server => (
                    <div
                      key={server.id}
                      onClick={() => selectServer(server)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-discord-blurple to-discord-gradient2 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {server.icon ? (
                          <img src={server.icon} alt="" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          server.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-discord-white truncate group-hover:text-discord-accent transition-colors">{server.name}</p>
                        <p className="text-[11px] text-discord-muted">{server.member_count || 0} members</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateServer && (
        <CreateServerModal onClose={() => setShowCreateServer(false)} onCreate={handleCreateServer} />
      )}
      {showJoinServer && (
        <JoinServerModal onClose={() => setShowJoinServer(false)} onJoin={handleJoinServer} />
      )}
      {showSettings && (
        <SettingsModal user={user} onClose={() => setShowSettings(false)} onCasinoUnlock={loadCasinoStatus} />
      )}
      {showCasino && (
        <CasinoGame onClose={() => setShowCasino(false)} />
      )}
      {showChess && (
        <ChessGame onClose={() => setShowChess(false)} user={user} />
      )}
      {showShop && (
        <ShopPage user={user} onClose={() => setShowShop(false)} updateUser={updateUser} />
      )}
      {showStats && (
        <StatsPage onClose={() => setShowStats(false)} onOpenProfile={(id) => { setShowStats(false); setProfileUserId(id); setShowProfile(true); }} />
      )}
      {showBoosts && currentServer && (
        <BoostPanel serverId={currentServer.id} onClose={() => setShowBoosts(false)} user={user} />
      )}
      {showServerSettings && currentServer && (
        <ServerSettings
          server={currentServer}
          channels={channels}
          members={members}
          onClose={() => setShowServerSettings(false)}
          onUpdate={handleServerSettingsUpdate}
          user={user}
        />
      )}
      {showProfile && profileUserId && (
        <UserProfileCard
          userId={profileUserId}
          onClose={() => setShowProfile(false)}
          onMessage={async (userId) => {
            setShowProfile(false);
            try {
              const res = await fetch(`/api/dm/${userId}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                }
              });
              const data = await res.json();
              if (data.id) {
                await loadDmChannels();
                setShowFriends(false);
                setCurrentServer(null);
                setCurrentChannel(null);
                setActiveThread(null);
                navigate(`/channels/@me/${data.id}`);
              }
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

      {activeThread && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleCloseThread}>
          <div className="w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <ThreadView
              thread={activeThread.thread}
              channel={activeThread.parentChannel}
              server={currentServer}
              user={user}
              onClose={handleCloseThread}
            />
          </div>
        </div>
      )}

      {showEvents && currentServer && (
        <EventsPanel
          serverId={currentServer.id}
          onClose={() => setShowEvents(false)}
          onOpenThread={handleOpenThread}
        />
      )}

      {showOnboarding && currentServer && (
        <OnboardingScreen
          server={currentServer}
          serverId={currentServer.id}
          user={user}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {mentionToast && (
        <div className="fixed bottom-20 left-4 z-50 animate-slide-up">
          <div className={`border rounded-2xl p-3 shadow-2xl max-w-sm ${
            mentionToast.type === 'level'
              ? 'bg-discord-darker border-yellow-500/30 shadow-yellow-500/20'
              : 'bg-discord-darker border-discord-accent/30 shadow-discord-accent/20'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                mentionToast.type === 'level' ? 'text-yellow-400' : 'text-discord-accent'
              }`}>
                {mentionToast.type === 'level' ? 'Уровень' : 'Упоминание'}
              </span>
            </div>
            {mentionToast.type === 'level' ? (
              <p className="text-sm text-discord-white font-medium">{mentionToast.text}</p>
            ) : (
              <>
                <p className="text-sm text-discord-white">
                  <span className="font-semibold">{mentionToast.from_username}</span> упомянул вас в{' '}
                  <span className="text-discord-accent font-medium">#{mentionToast.channel_name}</span>
                </p>
                <p className="text-xs text-discord-gray mt-1 truncate">{mentionToast.content}</p>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
