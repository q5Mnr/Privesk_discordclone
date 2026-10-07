import React, { useState, useEffect } from 'react';
import { ArrowLeft, Crown, Sparkles, Check, Star, Zap } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '0 РУБ',
    period: '',
    color: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-500/30',
    bgColor: 'bg-gray-500/10',
    icon: '🎁',
    features: [
      'Базовые настройки',
      'До 2 гб отправки файлов',
      'Фото нейросеть',
      'Текст нейросеть',
      'Друзья, каналы, личные сообщения',
    ],
  },
  {
    id: 'privet',
    name: 'Privet',
    price: '999 РУБ',
    period: '/ мес',
    color: 'from-blue-500 to-cyan-400',
    borderColor: 'border-blue-400/30',
    bgColor: 'bg-blue-400/10',
    icon: '💎',
    popular: true,
    features: [
      'Нормальные настройки',
      'До 3 гб отправки файлов',
      'Всё из подписки "Free"',
      'Стандартная звуковая ИИ',
      'Кастом настройка профиля',
      'Уникальный значок',
      'Благодарность разработчиков',
    ],
  },
  {
    id: 'privet_plus',
    name: 'PRIVET PLUS',
    price: '1499 РУБ',
    period: '/ Месяц',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-400/30',
    bgColor: 'bg-purple-400/10',
    icon: '👑',
    features: [
      'Максимум возможностей',
      'До 1 тб отправки файлов',
      'Новый уникальный значок',
      'Полная звуковая ИИ',
      'ПОЛНАЯ настройка профиля',
      'Все из подписки "Privet"',
      'МИЛЛИОННАЯ благодарность разработчиков',
    ],
  },
  {
    id: 'sosiska',
    name: 'СОСИСКА',
    price: '2499 РУБ',
    period: '/ Месяц',
    color: 'from-orange-500 to-red-500',
    borderColor: 'border-orange-400/30',
    bgColor: 'bg-orange-400/10',
    icon: '🌭',
    features: [
      'Модератор на ВСЕХ серверах',
      'Бан участников',
      'Кик участников',
      'Управление сообщениями',
      'Уникальный значок модератора',
      'Все из подписки "Privet Plus"',
      'Права модератора автоматически',
    ],
  },
];

export default function SubscriptionsPage({ onBack, user }) {
  const [currentTier, setCurrentTier] = useState('free');
  const [expires, setExpires] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await apiGet('/api/auth/subscription');
      setCurrentTier(data.tier);
      setExpires(data.expires);
    } catch (err) {}
  };

  const handleBuy = async (tier) => {
    if (tier === 'free' || tier === currentTier) return;
    setLoading(true);
    setMessage('');
    setIsError(false);
    try {
      const data = await apiPost('/api/auth/buy-subscription', { tier });
      if (data.success) {
        setMessage(data.message);
        setIsError(false);
        setCurrentTier(tier);
        setExpires(data.expires);
      } else {
        setMessage(data.error || 'Ошибка');
        setIsError(true);
      }
    } catch (err) {
      setMessage(err.message);
      setIsError(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-discord-mid">
      {/* Header */}
      <div className="h-16 px-6 flex items-center border-b border-discord-light/20 bg-discord-mid/80 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={onBack} className="mr-4 text-discord-gray hover:text-discord-accent transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-discord-white">Наши товары</h2>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Current subscription banner */}
        {currentTier !== 'free' && (
          <div className="mb-8 bg-gradient-to-r from-discord-blurple to-discord-accent rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                {currentTier === 'privet' ? '💎' : '👑'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{currentTier === 'privet' ? 'Privet' : 'Privet Plus'}</h3>
                {expires && (
                  <p className="text-white/70 text-sm">Действует до {new Date(expires).toLocaleDateString('ru-RU')}</p>
                )}
              </div>
            </div>
            <div className="px-4 py-2 bg-white/20 rounded-xl text-white text-sm font-medium backdrop-blur-sm">
              Активна
            </div>
          </div>
        )}

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm ${isError ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-discord-green/10 border border-discord-green/30 text-discord-green'}`}>
            {message}
          </div>
        )}

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const isCurrent = tier.id === currentTier;
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border ${tier.borderColor} overflow-hidden transition-all duration-300 hover:scale-[1.02] ${isCurrent ? 'ring-2 ring-discord-accent' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-400 to-cyan-300 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    ← Лучший выбор
                  </div>
                )}

                <div className={`p-6 ${tier.bgColor}`}>
                  <div className="text-4xl mb-3">{tier.icon}</div>
                  <h3 className="text-2xl font-bold text-discord-white mb-1">{tier.name}</h3>
                </div>

                <div className="p-6 bg-discord-darker/50">
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-discord-white">{tier.price}</span>
                    {tier.period && <span className="text-discord-muted text-sm">{tier.period}</span>}
                  </div>

                  <div className="space-y-3 mb-6">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check size={16} className="text-discord-accent mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-discord-text">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleBuy(tier.id)}
                    disabled={isCurrent || loading || tier.id === 'free'}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                      isCurrent
                        ? 'bg-discord-accent/20 text-discord-accent cursor-default'
                        : tier.id === 'free'
                        ? 'bg-discord-dark text-discord-muted cursor-default'
                        : `bg-gradient-to-r ${tier.color} text-white hover:shadow-lg hover:shadow-discord-blurple/30`
                    }`}
                  >
                    {isCurrent ? 'Текущая' : tier.id === 'free' ? 'Текущая' : loading ? '...' : 'Купить'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-discord-muted mt-6">* Подписки на год нет</p>
      </div>
    </div>
  );
}
