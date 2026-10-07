import React, { useState, useEffect } from 'react';
import { CheckCircle, ChevronRight, ChevronLeft, Shield, Hash, Sparkles } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

export default function OnboardingScreen({ server, serverId, user, onComplete }) {
  const [config, setConfig] = useState(null);
  const [step, setStep] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  useEffect(() => {
    if (serverId) loadConfig();
  }, [serverId]);

  const loadConfig = async () => {
    try {
      const data = await apiGet(`/api/onboarding/${serverId}`);
      setConfig(data);
    } catch (err) { console.error(err); }
  };

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]);
  };

  const handleComplete = async () => {
    try {
      await apiPost(`/api/onboarding/complete/${serverId}`, { selected_roles: selectedRoles });
      onComplete?.();
    } catch (err) { console.error(err); }
  };

  if (!config || !config.enabled) return null;

  const rules = config.rules || [];
  const guideChannels = config.guide_channels || [];
  const roleOptions = config.role_options || [];
  const totalSteps = 1 + (rules.length ? 1 : 0) + (guideChannels.length ? 1 : 0) + (roleOptions.length ? 1 : 0);

  let currentStepIndex = 0;

  const steps = [];
  steps.push({
    key: 'welcome',
    title: `Добро пожаловать на ${server?.name || 'сервер'}!`,
    icon: <Sparkles size={32} className="text-discord-accent" />,
    content: (
      <div className="text-center">
        <p className="text-discord-muted text-sm leading-relaxed">
          {config.welcome_message || `Мы рады видеть вас на ${server?.name || 'этом сервере'}! Давайте пройдём небольшую настройку.`}
        </p>
      </div>
    )
  });

  if (rules.length) {
    steps.push({
      key: 'rules',
      title: 'Правила сервера',
      icon: <Shield size={32} className="text-discord-red" />,
      content: (
        <div>
          <div className="space-y-2 mb-4">
            {rules.map((rule, i) => (
              <div key={i} className="bg-discord-dark border border-discord-light/20 rounded-xl p-3 flex gap-3">
                <span className="text-discord-accent font-bold text-lg">{i + 1}.</span>
                <span className="text-discord-text text-sm">{rule}</span>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={rulesAccepted} onChange={e => setRulesAccepted(e.target.checked)}
              className="w-4 h-4 rounded border-discord-light accent-discord-accent" />
            <span className="text-sm text-discord-muted">Я прочитал и согласен с правилами</span>
          </label>
        </div>
      )
    });
  }

  if (guideChannels.length) {
    steps.push({
      key: 'channels',
      title: 'Рекомендуемые каналы',
      icon: <Hash size={32} className="text-discord-green" />,
      content: (
        <div className="space-y-2">
          <p className="text-discord-muted text-sm mb-3">Ознакомьтесь с каналами сервера:</p>
          {guideChannels.map((ch, i) => (
            <div key={i} className="bg-discord-dark border border-discord-light/20 rounded-xl p-3 flex items-center gap-3">
              <Hash size={16} className="text-discord-muted flex-shrink-0" />
              <div>
                <span className="text-discord-white text-sm font-medium">{ch.name}</span>
                {ch.description && <p className="text-discord-muted text-xs mt-0.5">{ch.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )
    });
  }

  if (roleOptions.length) {
    steps.push({
      key: 'roles',
      title: 'Выберите роли',
      icon: <CheckCircle size={32} className="text-discord-accent" />,
      content: (
        <div>
          <p className="text-discord-muted text-sm mb-3">Выберите интересующие вас роли (необязательно):</p>
          <div className="space-y-2">
            {roleOptions.map((opt, i) => (
              <button key={i} onClick={() => toggleRole(opt.role_id)}
                className={`w-full bg-discord-dark border border-discord-light/20 rounded-xl p-3 flex items-center gap-3 transition-all text-left ${selectedRoles.includes(opt.role_id) ? 'ring-2 ring-discord-accent bg-discord-accent/10' : 'hover:bg-discord-light/20'}`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedRoles.includes(opt.role_id) ? 'bg-discord-accent border-discord-accent' : 'border-discord-light/40'}`}>
                  {selectedRoles.includes(opt.role_id) && <CheckCircle size={12} className="text-white" />}
                </div>
                <div>
                  <span className="text-discord-white text-sm font-medium">{opt.name}</span>
                  {opt.description && <p className="text-discord-muted text-xs">{opt.description}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    });
  }

  const current = steps[step] || steps[0];
  const isLast = step === steps.length - 1;
  const canProceed = current.key !== 'rules' || rulesAccepted;

  return (
    <div className="fixed inset-0 bg-discord-darkest/95 flex items-center justify-center z-50">
      <div className="bg-discord-darker border border-discord-light/20 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="text-center mb-6">
          {current.icon}
          <h2 className="text-xl font-bold text-discord-white mt-3">{current.title}</h2>
        </div>

        <div className="min-h-[180px] mb-6">{current.content}</div>

        <div className="flex items-center gap-2 justify-center mb-4">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-discord-accent' : 'bg-discord-light/40'}`} />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-4 py-2 text-sm text-discord-muted hover:text-discord-white border border-discord-light/30 rounded-xl transition-colors">
              <ChevronLeft size={16} /> Назад
            </button>
          )}
          <button onClick={isLast ? handleComplete : () => setStep(step + 1)} disabled={!canProceed}
            className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 text-sm bg-gradient-to-r from-discord-blurple to-discord-gradient2 hover:opacity-90 text-white rounded-xl font-medium disabled:opacity-50 transition-all shadow-lg">
            {isLast ? 'Готово' : 'Далее'} {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
