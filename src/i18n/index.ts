import { create } from 'zustand';
import zh from './zh';
import en from './en';
import type { TranslationKeys } from './zh';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = 'genealogy_locale';

const translations: Record<Locale, Record<TranslationKeys, string>> = { zh, en };

export function detectLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') return saved;

  const lang = navigator.language || '';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18n = create<I18nState>((set) => ({
  locale: detectLocale(),
  setLocale: (locale: Locale) => {
    localStorage.setItem(STORAGE_KEY, locale);
    set({ locale });
  },
}));

export function t(key: TranslationKeys, params?: Record<string, string | number>): string {
  const locale = useI18n.getState().locale;
  let text = translations[locale]?.[key] ?? translations.zh[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function useT() {
  const locale = useI18n((s) => s.locale);
  const _t = (key: TranslationKeys, params?: Record<string, string | number>): string => {
    let text = translations[locale]?.[key] ?? translations.zh[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };
  return _t;
}

export function isEnglish(): boolean {
  return useI18n.getState().locale === 'en';
}
