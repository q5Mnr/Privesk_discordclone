import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Palette, Frame, Shirt, Coins, Check, Package, ArrowLeft } from 'lucide-react';
import { apiGet, apiPost } from '../utils/api';

const TYPE_TABS = [
  { id: 'all', label: 'Все', icon: ShoppingCart },
  { id: 'border', label: 'Рамки', icon: Frame },
  { id: 'color', label: 'Цвета', icon: Palette },
  { id: 'theme', label: 'Темы', icon: Shirt },
];

function ItemCard({ item, coins, onBuy, onEquip, buyingId }) {
  const [justBought, setJustBought] = useState(false);

  async function handleBuy() {
    await onBuy(item.id);
    setJustBought(true);
  }

  const isEquipped = item.equipped;

  return (
    <div className={`bg-discord-dark/50 border rounded-2xl p-4 transition-all duration-200 ${
      isEquipped ? 'border-yellow-400/50 bg-yellow-400/5 shadow-lg shadow-yellow-400/10' :
      item.owned ? 'border-green-500/30 bg-green-500/5' : 'border-discord-light/20 hover:border-discord-accent/30'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{item.emoji}</span>
        {isEquipped && <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 px-2 py-0.5 rounded-full">ОДЕТО</span>}
        {item.type === 'border' && (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-discord-blurple to-discord-accent" style={{ border: `3px solid ${item.value}`, boxShadow: `0 0 8px ${item.value}40` }} />
        )}
        {item.type === 'color' && (
          <span className="text-lg font-bold" style={item.value.startsWith('linear') ? { background: item.value, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: item.value }}>Aa</span>
        )}
        {item.type === 'theme' && (
          <div className="w-12 h-12 rounded-xl" style={{ background: item.value }} />
        )}
      </div>
      <h3 className="text-sm font-semibold text-discord-white mb-1">{item.name}</h3>
      <p className="text-xs text-discord-muted mb-3">{item.description}</p>
      {item.owned ? (
        <button onClick={() => onEquip(item.id)}
          className={`w-full py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            isEquipped
              ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
          }`}>
          {isEquipped ? <><Check size={14} /> Одето</> : <><Check size={14} /> Экипировать</>}
        </button>
      ) : (
        <button onClick={handleBuy} disabled={buyingId === item.id || coins < item.price}
          className={`w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            coins < item.price ? 'bg-discord-light/10 text-discord-muted cursor-not-allowed' : 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30 hover:bg-discord-accent/30'
          }`}>
          {buyingId === item.id ? 'Покупка...' : <><Coins size={14} /> {item.price}</>}
        </button>
      )}
    </div>
  );
}

export default function ShopPage({ user, onClose, updateUser }) {
  const [items, setItems] = useState([]);
  const [coins, setCoins] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [page, setPage] = useState('shop');

  useEffect(() => { loadShop(); }, []);

  async function refreshUser() {
    try {
      const me = await apiGet('/api/auth/me');
      if (me?.id && updateUser) updateUser(me);
    } catch (e) {}
  }

  async function loadShop() {
    try {
      const data = await apiGet('/api/shop/catalog');
      setItems(data.items || []);
      setCoins(data.coins || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function buyItem(itemId) {
    setBuyingId(itemId);
    try {
      const data = await apiPost('/api/shop/buy', { itemId });
      if (data.success) {
        setCoins(data.coins);
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, owned: true } : i));
        await refreshUser();
      }
    } catch (e) { alert(e.message || 'Ошибка покупки'); }
    setBuyingId(null);
  }

  async function equipItem(itemId) {
    try {
      const data = await apiPost('/api/shop/equip', { itemId });
      if (data.success) {
        const isNowEquipped = data.equipped !== null;
        setItems(prev => prev.map(i => {
          if (i.id === itemId) return { ...i, equipped: isNowEquipped };
          if (i.type === items.find(x => x.id === itemId)?.type && isNowEquipped) return { ...i, equipped: false };
          return i;
        }));
        await refreshUser();
      }
    } catch (e) { alert(e.message || 'Ошибка'); }
  }

  const filtered = activeTab === 'all' ? items : items.filter(i => i.type === activeTab);
  const ownedItems = items.filter(i => i.owned);
  const ownedFiltered = activeTab === 'all' ? ownedItems : ownedItems.filter(i => i.type === activeTab);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-4xl h-[80vh] bg-discord-darker rounded-2xl flex flex-col overflow-hidden border border-discord-light/20 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-discord-light/20">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              page === 'shop' ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-yellow-500 to-orange-500'
            }`}>
              {page === 'shop' ? <ShoppingCart size={20} className="text-white" /> : <Package size={20} className="text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-discord-white">{page === 'shop' ? 'Магазин' : 'Инвентарь'}</h2>
              <p className="text-xs text-discord-muted">{page === 'shop' ? 'Покупай кастомизации за монеты' : `${ownedItems.length} предметов`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-discord-dark rounded-xl border border-discord-light/20 overflow-hidden">
              <button onClick={() => setPage('shop')}
                className={`px-4 py-2 text-sm font-medium transition-all ${page === 'shop' ? 'bg-emerald-500/20 text-emerald-400' : 'text-discord-gray hover:text-discord-white'}`}>
                <ShoppingCart size={14} className="inline mr-1.5" />Магазин
              </button>
              <button onClick={() => setPage('inventory')}
                className={`px-4 py-2 text-sm font-medium transition-all ${page === 'inventory' ? 'bg-yellow-500/20 text-yellow-400' : 'text-discord-gray hover:text-discord-white'}`}>
                <Package size={14} className="inline mr-1.5" />Инвентарь
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 ml-2">
              <Coins size={18} className="text-yellow-400" />
              <span className="text-yellow-400 font-bold">{coins}</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-discord-light/20 text-discord-gray hover:text-discord-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-discord-light/20">
          {TYPE_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-discord-accent/20 text-discord-accent border border-discord-accent/30' : 'text-discord-gray hover:text-discord-white hover:bg-discord-light/20'
              }`}>
              <tab.icon size={16} />
              {tab.label}
              {tab.id === 'all' && page === 'inventory' && <span className="text-xs opacity-60">({ownedItems.length})</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-10 text-discord-muted">Загрузка...</div>
          ) : page === 'shop' ? (
            filtered.length === 0 ? (
              <div className="text-center py-10 text-discord-muted">Нет предметов</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(item => (
                  <ItemCard key={item.id} item={item} coins={coins} onBuy={buyItem} onEquip={equipItem} buyingId={buyingId} />
                ))}
              </div>
            )
          ) : (
            ownedFiltered.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎒</div>
                <h3 className="text-lg font-bold text-discord-white mb-2">Инвентарь пуст</h3>
                <p className="text-sm text-discord-muted mb-4">Купи что-нибудь в магазине!</p>
                <button onClick={() => setPage('shop')} className="px-6 py-2 bg-discord-accent/20 text-discord-accent rounded-xl border border-discord-accent/30 hover:bg-discord-accent/30 transition-all text-sm font-medium">
                  В магазин
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownedFiltered.map(item => (
                  <ItemCard key={item.id} item={item} coins={coins} onBuy={buyItem} onEquip={equipItem} buyingId={buyingId} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
