import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const stored = localStorage.getItem('siteLanguage');
        return stored || 'English';
    });
    const [isFading, setIsFading] = useState(false);

    const t = translations[language];

    const setLanguageSmooth = (nextLanguage) => {
        if (nextLanguage === language) return;
        setIsFading(true);
        setTimeout(() => {
            setLanguage(nextLanguage);
            setIsFading(false);
        }, 220);
    };

    useEffect(() => {
        localStorage.setItem('siteLanguage', language);
    }, [language]);

    const value = {
        language,
        setLanguage: setLanguageSmooth,
        t,
        isFading
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

