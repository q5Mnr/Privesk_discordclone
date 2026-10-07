import React, { useState, useEffect, useRef } from 'react';
import { X, Smile, Search } from 'lucide-react';
import { apiGet } from '../utils/api';

const STANDARD_EMOJI_CATEGORIES = {
  'Частые': ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🔥', '💯', '✅', '❌', '🚀', '⭐', '😊', '😍', '🥳', '😎', '🤯', '💀', '🤡', '👽'],
  'Животные': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦄', '🦋'],
  'Еда': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🍗', '🍖', '🥩', '🍝', '🍜', '🍣', '🍱', '🍩', '🍪'],
  'Объекты': ['💎', '👑', '🏆', '🎯', '🎮', '🎲', '🎸', '🎨', '🧩', '🔧', '🔨', '⚡', '💡', '🔔', '🎵', '📱', '💻', '⌨️', '🖥️', '📸'],
  'Природа': ['🌍', '🌙', '⭐', '🌈', '☀️', '🌊', '🔥', '❄️', '🌸', '🌺', '🌻', '🌹', '🍀', '🌿', '🍁', '🍂', '🌵', '🌋', '⛰️', '🏖️'],
  'Символы': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '💫', '⭐'],
};

const COLLECTION_EMOJI_MAP = {
  star:'⭐',fire:'🔥',thumbsup:'👍',heart:'❤️',moon:'🌙',sun:'☀️',butterfly:'🦋',paw:'🐾',
  rocket:'🚀',gem:'💎',skull:'💀',lightning:'⚡',ice:'🧊',sword:'⚔️',shield:'🛡️',diamond:'💠',eye:'👁️',
  crown:'👑',trophy:'🏆',ghost:'👻',rainbow:'🌈',volcano:'🌋',crystal:'🔮',brain:'🧠',
  dragon:'🐉',unicorn:'🦄',alien:'👽',blackhole:'🕳️',shooting_star:'🌠',
  phoenix:'🔥',void:'🌑',time:'⏳',universe:'🌌',infinity:'♾️',
  admin_crown:'👑',devmode:'🔧',hacker:'💻',godmode:'⚡',sosiska:'🌭',
};

const COLLECTION_NAMES = {
  star:'Звезда',fire:'Огонь',thumbsup:'Лайк',heart:'Сердце',moon:'Луна',sun:'Солнце',butterfly:'Бабочка',paw:'Лапа',
  rocket:'Ракета',gem:'Бриллиант',skull:'Череп',lightning:'Молния',ice:'Лёд',sword:'Меч',shield:'Щит',diamond:'Алмаз',eye:'Глаз',
  crown:'Корона',trophy:'Кубок',ghost:'Призрак',rainbow:'Радуга',volcano:'Вулкан',crystal:'Кристалл',brain:'Мозг',
  dragon:'Дракон',unicorn:'Единорог',alien:'Инопланетянин',blackhole:'Чёрная дыра',shooting_star:'Падающая звезда',
  phoenix:'Феникс',void:'Пустота',time:'Время',universe:'Вселенная',infinity:'Бесконечность',
  admin_crown:'Админ-Корона',devmode:'Dev Режим',hacker:'Хакер',godmode:'Бог-Режим',sosiska:'Сосиска',
};

export default function EmojiPicker({ onSelect, onClose, ownedEmojis = [] }) {
  const [tab, setTab] = useState('standard');
  const [category, setCategory] = useState('Частые');
  const [search, setSearch] = useState('');
  const [collectionEmojis, setCollectionEmojis] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  useEffect(() => {
    if (tab === 'collection' && collectionEmojis.length === 0) {
      apiGet('/api/collection/my').then(d => setCollectionEmojis(d.emojis || [])).catch(() => {});
    }
  }, [tab]);

  const handleSelect = (emoji) => {
    onSelect(emoji);
    onClose();
  };

  const ownedSet = new Set(ownedEmojis.map(e => e.emoji_id));
  const filteredStandard = search
    ? Object.values(STANDARD_EMOJI_CATEGORIES).flat().filter(e => e.includes(search))
    : STANDARD_EMOJI_CATEGORIES[category] || [];

  const filteredCollection = search
    ? Object.entries(COLLECTION_EMOJI_MAP).filter(([id]) => id.includes(search.toLowerCase()))
    : Object.entries(COLLECTION_EMOJI_MAP);

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 w-80 bg-discord-darker rounded-xl shadow-2xl border border-discord-light/20 overflow-hidden z-50" style={{ maxHeight: '380px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-discord-light/20">
        <Smile size={16} className="text-discord-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск эмодзи..."
          className="flex-1 bg-transparent text-sm text-discord-white placeholder-discord-muted outline-none" />
        {search && <button onClick={() => setSearch('')} className="text-discord-muted hover:text-discord-gray"><X size={14} /></button>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-discord-light/20">
        <button onClick={() => { setTab('standard'); setSearch(''); }}
          className={`flex-1 py-1.5 text-xs font-medium transition-all ${tab === 'standard' ? 'text-discord-white border-b-2 border-discord-accent' : 'text-discord-muted hover:text-discord-gray'}`}>
          Стандартные
        </button>
        <button onClick={() => { setTab('collection'); setSearch(''); }}
          className={`flex-1 py-1.5 text-xs font-medium transition-all ${tab === 'collection' ? 'text-discord-white border-b-2 border-discord-accent' : 'text-discord-muted hover:text-discord-gray'}`}>
          Коллекция {ownedSet.size > 0 && <span className="ml-1 text-[10px] bg-discord-accent/20 text-discord-accent px-1.5 rounded-full">{ownedSet.size}</span>}
        </button>
      </div>

      {/* Category pills (standard only) */}
      {tab === 'standard' && !search && (
        <div className="flex gap-1 px-2 py-1.5 overflow-x-auto border-b border-discord-light/10">
          {Object.keys(STANDARD_EMOJI_CATEGORIES).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${category === c ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-muted hover:text-discord-gray hover:bg-discord-light/10'}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: '240px' }}>
        {tab === 'standard' && (
          <div className="grid grid-cols-8 gap-0.5">
            {filteredStandard.map((emoji, i) => (
              <button key={i} onClick={() => handleSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-discord-light/20 transition-all hover:scale-110 active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
        )}

        {tab === 'collection' && (
          <div className="grid grid-cols-6 gap-1">
            {filteredCollection.map(([id, emoji]) => {
              const owned = ownedSet.has(id);
              return (
                <button key={id} onClick={() => owned && handleSelect(emoji)}
                  title={owned ? COLLECTION_NAMES[id] || id : 'Не разблокировано'}
                  className={`relative w-full aspect-square flex items-center justify-center text-xl rounded-lg transition-all ${
                    owned
                      ? 'hover:bg-discord-light/20 hover:scale-110 active:scale-95 cursor-pointer'
                      : 'opacity-30 cursor-not-allowed grayscale'
                  }`}>
                  {owned ? emoji : '🔒'}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
