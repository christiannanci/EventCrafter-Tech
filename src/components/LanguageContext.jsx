import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Default to French (Cameroon-first app) — no external IP fetch
  const savedLanguage = typeof localStorage !== 'undefined' ? localStorage.getItem('user_language') : null;
  const [language, setLanguage] = useState(savedLanguage || 'fr');
  const [detectedCountry] = useState('CM');

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('user_language', newLanguage);
  };

  const t = (path) => {
    const keys = path.split('.');
    let current = translations[language];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        // Fallback to English if translation missing
        let fallback = translations['en'];
        for (const k of keys) fallback = fallback?.[k];
        return fallback || path;
      }
      current = current[key];
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange, t, detectedCountry }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);