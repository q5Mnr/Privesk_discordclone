import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐', '🌈', '🔥', '🍕', '🎸', '🚀', '👑', '🍀', '🦄', '💰', '🎯', '🪙', '🏆'];
const SYMBOL_HEIGHT = 112;
const VISIBLE = 3;

function Reel({ spinning, finalSymbol, delay, onStop }) {
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState('idle');
  const animRef = useRef(null);
  const stripRef = useRef([]);

  useEffect(() => {
    if (spinning) {
      setPhase('spinning');
      setOffset(0);
      // Build strip: random symbols, then different-same-DIFFERENT for final 3 visible
      const strip = [];
      let lastSym = '';
      const len = 15 + Math.floor(Math.random() * 5);
      for (let i = 0; i < len; i++) {
        let sym;
        do { sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; } while (sym === lastSym);
        strip.push(sym);
        lastSym = sym;
      }
      // Final 3 visible rows: something different, the final symbol, something different
      let above, below;
      do { above = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; } while (above === finalSymbol);
      do { below = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; } while (below === finalSymbol || below === above);
      strip.push(above);
      strip.push(finalSymbol);
      strip.push(below);
      stripRef.current = strip;

      let startTime = null;
      const totalDuration = 1200 + delay;
      const totalDistance = (strip.length - VISIBLE) * SYMBOL_HEIGHT;

      const animate = (ts) => {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setOffset(eased * totalDistance);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          setPhase('stopped');
          onStop?.();
        }
      };
      animRef.current = requestAnimationFrame(animate);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [spinning, finalSymbol, delay]);

  const strip = stripRef.current.length > 0 ? stripRef.current : [finalSymbol, finalSymbol, finalSymbol];

  return (
    <div className="relative w-24 h-[336px] overflow-hidden rounded-xl border border-discord-light/20 bg-discord-darkest shadow-inner">
      {/* Highlight center row */}
      <div className="absolute top-[112px] left-0 right-0 h-[112px] border-y-2 border-discord-yellow/40 bg-discord-yellow/5 z-10 pointer-events-none" />
      {/* Symbol strip */}
      <div
        className="w-full"
        style={{
          transform: `translateY(-${offset}px)`,
          transition: phase === 'idle' ? 'none' : undefined,
        }}
      >
        {strip.map((sym, i) => (
          <div key={i} className="w-24 h-28 flex items-center justify-center text-5xl">
            {sym}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CasinoGame({ onClose }) {
  const [spinning, setSpinning] = useState(false);
  const [finals, setFinals] = useState(['🎰', '🎰', '🎰']);
  const [message, setMessage] = useState('');
  const [showWin, setShowWin] = useState(false);
  const [stoppedCount, setStoppedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const finalsRef = useRef(['🎰', '🎰', '🎰']);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setMessage('');
    setShowWin(false);
    setStoppedCount(0);

    const winChance = 0.10;
    const isWin = Math.random() < winChance;

    let f;
    if (isWin) {
      const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      f = [sym, sym, sym];
    } else {
      do {
        f = [
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ];
      } while (f[0] === f[1] && f[1] === f[2]);
    }
    finalsRef.current = f;
    setFinals(f);
  };

  const handleStop = () => {
    setStoppedCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        // All stopped
        setTimeout(() => checkWin(finalsRef.current), 200);
      }
      return next;
    });
  };

  const checkWin = async (r) => {
    setSpinning(false);
    if (r[0] === r[1] && r[1] === r[2]) {
      setShowWin(true);
      setTimeout(() => setShowWin(false), 3000);
      if (r[0] === '7️⃣') setMessage('🎰🎆💥 ДЖЕКПОТ!!! 💥🎆🎰');
      else if (r[0] === '💎') setMessage('💎✨👑 БРИЛЛИАНТЫ! 👑✨💎');
      else if (r[0] === '🦄') setMessage('🦄🌈⭐ УНИКОРН! ⭐🌈🦄');
      else if (r[0] === '💰') setMessage('💰🪙💸 ЗОЛОТО! 💸🪙💰');
      else setMessage('🎉🎊🏆 ТРИ В РЯД! 🏆🎊🎉');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/casino-win-count', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (data.streak !== undefined) setStreak(data.streak);
        await fetch('/api/collection/check-achievements', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      } catch (e) { console.error('Casino win recording failed:', e); }
    } else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
      setMessage(`✨ ПОЧТИ! ✨`);
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/auth/casino-loss', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        setStreak(0);
      } catch (e) {}
    } else {
      const msgs = ['😅 Повезёт в следующий раз!', '🤔 Мимо...', '😤 Ещё разок!', '🍀 Не хватило чуточку!', '🫣 Близко!'];
      setMessage(msgs[Math.floor(Math.random() * msgs.length)]);
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/auth/casino-loss', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        setStreak(0);
      } catch (e) {}
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      {showWin && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-60">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                animation: `confetti ${1.5 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            >
              {['🎉', '🎊', '✨', '⭐', '💎', '🏆', '💰', '🪙', '🔥', '🎆'][Math.floor(Math.random() * 10)]}
            </div>
          ))}
        </div>
      )}

      <div className={`bg-discord-mid rounded-2xl w-full max-w-sm shadow-2xl border border-discord-light/20 overflow-hidden transition-all duration-300 ${showWin ? 'shadow-discord-yellow/40 scale-105' : ''}`}>
        <div className="bg-gradient-to-r from-discord-yellow/20 via-orange-500/20 to-discord-yellow/20 px-6 py-4 flex items-center justify-between border-b border-discord-light/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">🎰</span>
            <h2 className="text-lg font-bold text-discord-white">🎰 Казино 🎲</h2>
          </div>
          <button onClick={onClose} className="text-discord-gray hover:text-discord-accent transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            {[0, 1, 2].map(i => (
              <Reel
                key={i}
                spinning={spinning}
                finalSymbol={finals[i]}
                delay={i * 400}
                onStop={handleStop}
              />
            ))}
          </div>

          {message && (
            <div className={`text-center mb-4 text-lg font-bold ${
              message.includes('ДЖЕКПОТ') || message.includes('ТРИ') || message.includes('БРИЛЛИАНТЫ') || message.includes('УНИКОРН') || message.includes('ЗОЛОТО')
                ? 'text-discord-yellow' : 'text-discord-muted'
            }`}>
              {message}
            </div>
          )}

          {streak > 0 && (
            <div className="text-center mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                streak >= 5 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                streak >= 3 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                🔥 Серия: {streak} {streak >= 5 ? '— НА ВОЛНЕ!' : streak >= 3 ? '— Отлично!' : ''}
              </span>
            </div>
          )}

          <button
            onClick={spin}
            disabled={spinning}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              spinning
                ? 'bg-discord-gray/20 text-discord-muted cursor-not-allowed'
                : 'bg-gradient-to-r from-discord-yellow via-orange-500 to-red-500 hover:shadow-lg hover:shadow-discord-yellow/30 text-white animate-pulse'
            }`}
          >
            {spinning ? (
              <span className="flex items-center justify-center gap-2">
                <RotateCcw size={20} className="animate-spin" />
                🎰 Крутится... 🎰
              </span>
            ) : '🎰🔥 Крутить! 🔥🎰'}
          </button>
        </div>
      </div>
    </div>
  );
}
