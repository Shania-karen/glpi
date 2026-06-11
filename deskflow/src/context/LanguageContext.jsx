import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'fr');
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  async function loadTranslations() {
    try {
      const response = await fetch('http://localhost:8081/api/translations');
      if (!response.ok) throw new Error('Failed to fetch translations');
      const data = await response.json();

      const dict = {};
      data.forEach(item => {
        if (!dict[item.langCode]) {
          dict[item.langCode] = {};
        }
        dict[item.langCode][item.translationKey] = item.value;
      });
      setTranslations(dict);
    } catch (err) {
      console.error('Failed to load translations from SQLite:', err);
    }
  }

  useEffect(() => {
    loadTranslations();
  }, []);

  const t = (key, defaultValue = '') => {
    return translations[lang]?.[key] || defaultValue || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, loadTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
