import React, { useState } from 'react';
import { X, Globe, Lock } from 'lucide-react';

export default function CreateServerModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate({ name, is_public: isPublic });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-discord-darker border border-discord-light/20 rounded-2xl w-full max-w-md p-0 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-discord-muted hover:text-discord-accent p-1 rounded-xl hover:bg-discord-light/30 transition-all"
        >
          <X size={24} />
        </button>

        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-discord-white mb-2">Создать сервер</h2>
          <p className="text-discord-muted text-sm">
            Ваш сервер будет создан мгновенно. Дайте ему имя!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">
              Название сервера
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
              placeholder="Мой сервер"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-3">
              Видимость сервера
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  !isPublic
                    ? 'border-discord-accent bg-discord-accent/10'
                    : 'border-discord-light/20 bg-discord-dark hover:border-discord-light/40'
                }`}
              >
                <Lock size={24} className={!isPublic ? 'text-discord-accent mb-2' : 'text-discord-muted mb-2'} />
                <p className={`text-sm font-bold ${!isPublic ? 'text-discord-accent' : 'text-discord-white'}`}>Приватный</p>
                <p className="text-[11px] text-discord-muted mt-0.5">Только по ссылке</p>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isPublic
                    ? 'border-discord-accent bg-discord-accent/10'
                    : 'border-discord-light/20 bg-discord-dark hover:border-discord-light/40'
                }`}
              >
                <Globe size={24} className={isPublic ? 'text-discord-accent mb-2' : 'text-discord-muted mb-2'} />
                <p className={`text-sm font-bold ${isPublic ? 'text-discord-accent' : 'text-discord-white'}`}>Публичный</p>
                <p className="text-[11px] text-discord-muted mt-0.5">Виден в Explore</p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-discord-muted hover:text-discord-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
