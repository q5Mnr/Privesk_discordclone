import React, { createContext, useContext, useState, useCallback } from 'react';

const UISettingsContext = createContext(null);

export const LAYOUTS = [
  { id: 'discord', label: 'Discord', desc: 'Панели сервера и список участников' },
  { id: 'telegram', label: 'Telegram', desc: 'Единый список чатов слева' },
];

export function UISettingsProvider({ children }) {
  const [layout, setLayoutState] = useState(() => {
    const saved = localStorage.getItem('ui_layout');
    return saved === 'telegram' ? 'telegram' : 'discord';
  });

  const setLayout = useCallback((value) => {
    const next = value === 'telegram' ? 'telegram' : 'discord';
    localStorage.setItem('ui_layout', next);
    setLayoutState(next);
  }, []);

  return (
    <UISettingsContext.Provider value={{ layout, setLayout }}>
      {children}
    </UISettingsContext.Provider>
  );
}

export function useUISettings() {
  const ctx = useContext(UISettingsContext);
  return ctx || { layout: 'discord', setLayout: () => {} };
}
