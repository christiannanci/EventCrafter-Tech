import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/apiClient';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('XAF');
  const [currencySymbol, setCurrencySymbol] = useState('FCFA');

  const exchangeRates = {
    'XAF': 1,
    'EUR': 0.001524,
    'USD': 0.00165,
    'GBP': 0.0013,
    'NGN': 2.5
  };

  useEffect(() => {
    let mounted = true;

    const initLocation = async () => {
      try {
        // 1. Charger les pays actifs depuis Base44
        const countriesList = await base44.entities.Country.filter({ status: 'active' });
        if (!mounted) return;
        setCountries(countriesList || []);

        // 2. Pays par défaut : Cameroun
        let defaultCountryCode = 'CM';

        try {
          const currentUser = await base44.auth.me();
          if (currentUser && mounted) {
            const [vendorProfiles, clientProfiles] = await Promise.all([
              base44.entities.VendorProfile.filter({ user_id: currentUser.id }),
              base44.entities.ClientProfile.filter({ user_id: currentUser.id })
            ]);
            // Garder CM par défaut pour cette plateforme camerounaise
          }
        } catch (e) {
          // Non connecté — CM par défaut
        }

        if (mounted) setSelectedCountry(defaultCountryCode);
      } catch (err) {
        console.error('Failed to init location context', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initLocation();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectedCountry && countries.length > 0) {
      const c = countries.find(x => x.code === selectedCountry);
      if (c) {
        setCurrency(c.currency_code || 'XAF');
        setCurrencySymbol(c.currency_symbol || 'FCFA');
      }
    }
  }, [selectedCountry, countries]);

  const formatPrice = (amountInBase) => {
    if (amountInBase === undefined || amountInBase === null) return '';
    const rate = exchangeRates[currency] || 1;
    const converted = Math.round(amountInBase * rate);
    return `${converted.toLocaleString()} ${currencySymbol}`;
  };

  return (
    <LocationContext.Provider value={{
      selectedCountry, setSelectedCountry,
      countries,
      loading,
      currency,
      currencySymbol,
      formatPrice
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => useContext(LocationContext);