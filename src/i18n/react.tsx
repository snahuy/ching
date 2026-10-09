import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readLanguage, saveLanguage, translate, moveName, type Language, type Params } from './core';
import type { MoveId } from '../rules';
const fallback = { language: 'en' as Language, setLanguage: (_language: Language) => {}, t: (key: string, params?: Params) => translate('en', key, params), move: (id: MoveId) => moveName('en', id) };
const LanguageContext = createContext(fallback);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => { try { return readLanguage(localStorage); } catch { return 'en'; } });
  useEffect(() => { document.documentElement.lang = language; document.title = translate(language, 'page.title'); try { saveLanguage(localStorage, language); } catch { /* In-memory preference still works. */ } }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: string, params?: Params) => translate(language, key, params), move: (id: MoveId) => moveName(language, id) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  return <div className="language-toggle" role="group" aria-label={t('Language')}><button type="button" lang="km" aria-pressed={language === 'km'} onClick={() => setLanguage('km')}>ខ្មែរ</button><span aria-hidden="true">|</span><button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button></div>;
}
