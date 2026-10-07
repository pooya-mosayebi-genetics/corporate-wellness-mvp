import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, TranslationStrings } from '../i18n/translations';

export type Language = 'fa' | 'en';

interface LanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: keyof TranslationStrings) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fa');

  // ✅ تنظیم dir/lang روی <html> تا RTL و فونت فارسی سراسری فعال شود
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const setLanguage = useCallback((l: Language) => setLanguageState(l), []);

  const t = useCallback(
    (key: keyof TranslationStrings) => translations[language][key] ?? translations.en[key] ?? String(key),
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}