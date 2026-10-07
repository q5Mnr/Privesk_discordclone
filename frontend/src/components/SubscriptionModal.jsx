import React, { useState, useEffect } from 'react';
import { X, Check, Crown, Star, Zap } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0 ₽',
    period: '',
    icon: '📦',
    color: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-500/30',
    features: [
      'Базовые настройки',
      'До 2 гб отправки файлов',
      'Фото нейросеть',
      'Текст нейросеть',
      'Друзья, каналы, личные сообщения'
    ]
  },
  {
    id: 'privet',
    name: 'Privet',
    price: '999 ₽',
    period: '/ мес',
    icon: '💎',
    color: 'from-discord-blurple to-purple-600',
    borderColor: 'border-discord-blurple/30',
    features: [
      'Нормальные настройки',
      'До 3 гб отправки файлов',
      'Всё из подписки "Free"',
      'Стандартная звуковая ИИ',
      'Кастом настройка профиля',
      'Уникальный значок',
      'Благодарность разработчиков'
    ]
  },
  {
    id: 'privet_plus',
    name: 'PRIVET PLUS',
    price: '1499 ₽',
    period: '/ Месяц',
    icon: '👑',
    color: 'from-discord-yellow to-orange-500',
    borderColor: 'border-discord-yellow/30',
    badge: '← ЛУЧШИЙ ВЫБОР',
    features: [
      'Максимум возможностей',
      'До 1 тб отправки файлов',
      'Новый уникальный значок',
      'Полная звуковая ИИ',
      'ПОЛНАЯ настройка профиля',
      'Все из подписки "Privet"',
      'МИЛЛИОННАЯ благодарность разработчиков'
    ]
  }
];

export default function SubscriptionModal({ onClose, currentPlan }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleActivate = async (plan) => {
    setLoading(true);
    setMessage('');
    try {
      if (plan === 'free') {
        setMessage('Вы уже на бесплатном тарифе');
        setLoading(false);
        return;
      }
      const res = await apiPost('/api/auth/activate-subscription', { plan, days: 30 });
      if (res.success) {
        setMessage(`✨ Подписка ${plan === 'privet' ? 'Privet' : 'PRIVET PLUS'} активирована на 30 дней!`);
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      setMessage('Ошибка активации');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-discord-mid rounded-2xl w-full max-w-4xl shadow-2xl border border-discord-light/20 overflow-hidden max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-discord-blurple via-purple-500 to-discord-yellow px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={28} className="text-white" />
            <h2 className="text-2xl font-bold text-white">Наши товары</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        {message && (
          <div className="mx-8 mt-4 bg-discord-green/10 border border-discord-green/30 text-discord-green px-4 py-3 rounded-xl text-sm">
            {message}
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isHigher = PLANS.findIndex(p => p.id === currentPlan) < PLANS.findIndex(p => p.id === plan.id);
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 ${
                  isCurrent
                    ? `${plan.borderColor} bg-discord-dark/80 shadow-lg`
                    : 'border-discord-light/20 bg-discord-dark/50 hover:border-discord-accent/30'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 right-4 bg-discord-red text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-4 bg-discord-accent text-discord-darker text-[11px] font-bold px-3 py-1 rounded-full">
                    ТЕКУЩИЙ
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">{plan.icon}</div>
                  <h3 className={`text-xl font-bold mb-1 ${plan.id === 'privet_plus' ? 'text-discord-yellow' : 'text-discord-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-bold text-discord-white">{plan.price}</span>
                    {plan.period && <span className="text-sm text-discord-muted">{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-discord-text">
                      <Check size={16} className="text-discord-accent mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleActivate(plan.id)}
                  disabled={loading || isCurrent}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                    isCurrent
                      ? 'bg-discord-gray/20 text-discord-muted cursor-not-allowed'
                      : `bg-gradient-to-r ${plan.color} hover:shadow-lg text-white`
                  }`}
                >
                  {isCurrent ? 'Текущий' : plan.id === 'free' ? 'Бесплатно' : 'Активировать'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-8 pb-4 text-center">
          <p className="text-[11px] text-discord-muted">* Подписки на год нет</p>
        </div>
      </div>
    </div>
  );
}
