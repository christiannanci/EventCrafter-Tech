import React, { createContext, useContext, useState, useEffect } from 'react';
import { InvokeLLM } from '@/api/integrations';

const CurrencyContext = createContext();

// Devises supportées
export const SUPPORTED_CURRENCIES = {
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA', flag: '🇨🇲' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' }
};

const BASE_CURRENCY = 'XAF'; // Monnaie pivot

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('preferred_currency') || BASE_CURRENCY;
  });
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState(null);

  // Détection automatique de la devise selon la localisation
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Détection via IP (utilise l'API Core.InvokeLLM avec contexte internet)
        const result = await InvokeLLM({
          prompt: "Based on my IP address, return ONLY the ISO country code (2 letters) of my location. Return only the code, nothing else.",
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              country_code: { type: "string" }
            }
          }
        });

        const countryCode = result?.country_code?.toUpperCase();
        setDetectedCountry(countryCode);

        // Mapping pays -> devise
        const currencyMap = {
          'CM': 'XAF', 'CF': 'XAF', 'TD': 'XAF', 'CG': 'XAF', 'GA': 'XAF', 'GQ': 'XAF', // Zone CEMAC
          'BJ': 'XOF', 'BF': 'XOF', 'CI': 'XOF', 'GW': 'XOF', 'ML': 'XOF', 'NE': 'XOF', 'SN': 'XOF', 'TG': 'XOF', // Zone UEMOA
          'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'BE': 'EUR', 'NL': 'EUR', 'PT': 'EUR', 'AT': 'EUR', 'IE': 'EUR',
          'US': 'USD',
          'GB': 'GBP',
          'CA': 'CAD',
          'CH': 'CHF'
        };

        const detectedCurrency = currencyMap[countryCode];
        if (detectedCurrency && !localStorage.getItem('preferred_currency')) {
          setCurrency(detectedCurrency);
          localStorage.setItem('preferred_currency', detectedCurrency);
        }
      } catch (error) {
        console.error('Currency detection failed:', error);
      }
    };

    detectCurrency();
  }, []);

  // Récupération des taux de change
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const storedRates = localStorage.getItem('exchange_rates');
        const storedTimestamp = localStorage.getItem('rates_timestamp');
        const now = Date.now();
        
        // Cache 24h
        if (storedRates && storedTimestamp && (now - parseInt(storedTimestamp)) < 24 * 60 * 60 * 1000) {
          setExchangeRates(JSON.parse(storedRates));
          setLoading(false);
          return;
        }

        // Récupération via LLM avec contexte internet
        const result = await InvokeLLM({
          prompt: `Get current exchange rates from XAF (Central African Franc) to: EUR, USD, GBP, CAD, CHF. 
          Return only the numeric conversion rates. For example: 1 XAF = X EUR.
          Use real-time market data.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              XAF_to_EUR: { type: "number" },
              XAF_to_USD: { type: "number" },
              XAF_to_GBP: { type: "number" },
              XAF_to_CAD: { type: "number" },
              XAF_to_CHF: { type: "number" }
            }
          }
        });

        const rates = {
          XAF: 1, // Base
          EUR: result.XAF_to_EUR || 0.00152,
          USD: result.XAF_to_USD || 0.0016,
          GBP: result.XAF_to_GBP || 0.00128,
          CAD: result.XAF_to_CAD || 0.0022,
          CHF: result.XAF_to_CHF || 0.0014
        };

        setExchangeRates(rates);
        localStorage.setItem('exchange_rates', JSON.stringify(rates));
        localStorage.setItem('rates_timestamp', now.toString());
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Fallback rates
        setExchangeRates({
          XAF: 1,
          EUR: 0.00152,
          USD: 0.0016,
          GBP: 0.00128,
          CAD: 0.0022,
          CHF: 0.0014
        });
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const convertPrice = (priceInXAF, targetCurrency) => {
    if (!priceInXAF || !exchangeRates[targetCurrency]) return 0;
    return priceInXAF * exchangeRates[targetCurrency];
  };

  const formatPrice = (priceInXAF, targetCurrency = currency) => {
    const converted = convertPrice(priceInXAF, targetCurrency);
    const currencyInfo = SUPPORTED_CURRENCIES[targetCurrency];
    
    if (targetCurrency === 'XAF') {
      return `${Math.round(converted).toLocaleString()} ${currencyInfo.symbol}`;
    }
    
    return `${currencyInfo.symbol} ${converted.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency: changeCurrency,
      exchangeRates,
      convertPrice,
      formatPrice,
      loading,
      detectedCountry,
      baseCurrency: BASE_CURRENCY
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};