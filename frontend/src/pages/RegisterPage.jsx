import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(username, email, password);
      navigate('/channels/@me');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-discord-darker via-discord-dark to-discord-mid flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-discord-blurple/20 via-transparent to-transparent" />
      <div className="relative bg-discord-mid/80 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md shadow-2xl border border-discord-light/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-discord-green to-emerald-400 flex items-center justify-center shadow-2xl shadow-discord-green/30">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-2xl font-bold text-discord-white mb-1">Создать аккаунт</h1>
        </div>

        {error && (
          <div className="bg-discord-red/10 border border-discord-red/30 text-discord-red px-4 py-2 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-bold text-discord-accent uppercase tracking-wider mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-discord-dark border border-discord-light/20 rounded-xl px-4 py-2.5 text-discord-text focus:outline-none focus:border-discord-accent/50 transition-colors placeholder-discord-muted"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:shadow-lg hover:shadow-discord-blurple/30 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Продолжаем...' : 'Продолжить'}
          </button>
        </form>

        <p className="text-sm text-discord-muted mt-4 text-center">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-discord-accent hover:underline font-medium">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
