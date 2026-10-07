import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function JoinServerModal({ onClose, onJoin }) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onJoin(inviteCode);
    } catch (err) {
      setError(err.message || 'Неверный код приглашения');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-discord-mid rounded-2xl w-full max-w-md p-0 shadow-2xl relative border border-discord-light/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-discord-gray hover:text-discord-accent transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-discord-white mb-2">Присоединиться к серверу</h2>
          <p className="text-discord-gray text-sm">
            Введите код приглашения, чтобы присоединиться
          </p>
        </div>

        {error && (
          <div className="mx-6 mb-4 bg-discord-red/10 border border-discord-red/30 text-discord-red px-4 py-2 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="mb-6">
            <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">
              Код приглашения
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
              placeholder="Введите код"
              autoFocus
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-discord-gray hover:text-discord-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="px-6 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:shadow-lg hover:shadow-discord-blurple/30 text-white text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Поиск...' : 'Присоединиться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
