import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Headphones, HeadphoneOff, Volume2 } from 'lucide-react';

export default function VoiceChannel({ channel, server, socket, user }) {
  const [connected, setConnected] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});

  useEffect(() => {
    const handleVoiceUsers = (e) => {
      if (e.detail.channelId === channel.id) {
        setVoiceUsers(e.detail.users);
      }
    };
    window.addEventListener('voice_users', handleVoiceUsers);
    return () => window.removeEventListener('voice_users', handleVoiceUsers);
  }, [channel?.id]);

  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setConnected(true);
      socket?.emit('voice_join', { channelId: channel.id, serverId: server.id });
    } catch (err) {
      console.error('Failed to access microphone:', err);
    }
  }, [channel?.id, server?.id, socket]);

  const leaveVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    setConnected(false);
    setMuted(false);
    setDeafened(false);
    setVideoEnabled(false);
    socket?.emit('voice_leave', { channelId: channel.id, serverId: server.id });
  }, [channel?.id, server?.id, socket]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleDeafen = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = deafened;
        setMuted(deafened ? false : true);
      }
      setDeafened(!deafened);
    }
  };

  useEffect(() => {
    return () => {
      if (connected) {
        leaveVoice();
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      {connected ? (
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            {voiceUsers.map(vu => (
              <div key={vu.user_id} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xl">
                    {vu.avatar ? (
                      <img src={vu.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      vu.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  {vu.user_id === user?.id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-discord-green border-2 border-discord-mid flex items-center justify-center">
                      <Mic size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-sm text-discord-gray">{vu.username}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                muted ? 'bg-discord-red text-white' : 'bg-discord-light text-discord-gray hover:text-white'
              }`}
              title={muted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={toggleDeafen}
              className={`p-3 rounded-full transition-colors ${
                deafened ? 'bg-discord-red text-white' : 'bg-discord-light text-discord-gray hover:text-white'
              }`}
              title={deafened ? 'Включить звук' : 'Выключить звук'}
            >
              {deafened ? <HeadphoneOff size={20} /> : <Headphones size={20} />}
            </button>

            <button
              onClick={leaveVoice}
              className="p-3 rounded-full bg-discord-red text-white hover:bg-red-700 transition-colors"
              title="Покинуть голосовой канал"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Volume2 size={64} className="text-discord-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Голосовой канал</h3>
          <p className="text-discord-gray mb-6">{channel.name}</p>
          <button
            onClick={joinVoice}
            className="px-6 py-3 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white font-medium rounded-xl transition-all shadow-lg flex items-center gap-2 mx-auto"
          >
            <Phone size={20} />
            Присоединиться
          </button>
        </div>
      )}
    </div>
  );
}
