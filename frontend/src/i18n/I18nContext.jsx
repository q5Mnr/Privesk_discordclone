import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import en from './locales/en.json';
import uk from './locales/uk.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import pl from './locales/pl.json';
import tr from './locales/tr.json';
import zh from './locales/zh.json';

export const LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺', name: 'Russian' },
  { code: 'en', label: 'English', flag: '🇬🇧', name: 'English' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', name: 'Ukrainian' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', name: 'German' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', name: 'French' },
  { code: 'es', label: 'Español', flag: '🇪🇸', name: 'Spanish' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', name: 'Italian' },
  { code: 'pt', label: 'Português', flag: '🇵🇹', name: 'Portuguese' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱', name: 'Polish' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷', name: 'Turkish' },
  { code: 'zh', label: '中文', flag: '🇨🇳', name: 'Chinese' },
];

const LOCALES = { ru: null, en, uk, de, fr, es, it, pt, pl, tr, zh };

export const SUPPORTED_LANGS = LANGUAGES.map((l) => l.code);
export const DEFAULT_LANG = 'ru';

const I18nContext = createContext(null);

function getInitialLang() {
  try {
    const saved = localStorage.getItem('app_lang');
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGS.includes(nav)) return nav;
  } catch (e) { /* ignore */ }
  return DEFAULT_LANG;
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((code) => {
    if (!SUPPORTED_LANGS.includes(code)) return;
    try { localStorage.setItem('app_lang', code); } catch (e) { /* ignore */ }
    setLangState(code);
  }, []);

  const t = useCallback((key, params) => {
    if (key == null) return '';
    const dict = LOCALES[lang];
    let text = (dict && dict[key]) || key;
    if (params) {
      for (const k of Object.keys(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      }
    }
    return text;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const fallbackT = (key, params) => {
      let text = key == null ? '' : key;
      if (params) {
        for (const k of Object.keys(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
        }
      }
      return text;
    };
    return { lang: DEFAULT_LANG, setLang: () => {}, t: fallbackT, languages: LANGUAGES };
  }
  return ctx;
}

export default I18nContext;
