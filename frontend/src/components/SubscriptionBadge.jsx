import React from 'react';

export default function SubscriptionBadge({ tier }) {
  if (!tier || tier === 'free') return null;

  const config = {
    privet: {
      label: 'Privet',
      gradient: 'from-blue-500 to-cyan-400',
      icon: '💎',
    },
    privet_plus: {
      label: 'Privet Plus',
      gradient: 'from-purple-500 to-pink-500',
      icon: '👑',
    },
    sosiska: {
      label: 'Сосиска',
      gradient: 'from-orange-500 to-red-500',
      icon: '🌭',
    },
  };

  const c = config[tier];
  if (!c) return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-gradient-to-r ${c.gradient} text-white shadow-sm`}
      title={c.label}
    >
      {c.icon} {c.label}
    </span>
  );
}
