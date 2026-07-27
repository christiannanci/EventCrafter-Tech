import { base44 } from '@/api/apiClient';

/**
 * Détermine la catégorie d'un lead basée sur le budget, le nombre d'invités et le type d'événement
 * @param {number} budgetAmount - Budget en FCFA
 * @param {string} guestCount - '< 50', '50-200', ou '200+'
 * @param {string} eventType - Type d'événement
 * @returns {string} 'small', 'medium', ou 'large'
 */
export function calculateLeadCategory(budgetAmount, guestCount, eventType) {
  // Seuils par défaut (peuvent être surchargés par config)
  const SMALL_MAX = 300000;  // < 300K FCFA
  const MEDIUM_MAX = 1500000; // < 1.5M FCFA
  
  // Événements premium qui augmentent automatiquement la catégorie
  const premiumEvents = ['Wedding', 'Gala', 'Corporate'];
  const isPremiumEvent = premiumEvents.includes(eventType);
  
  // Détermination basée sur le budget
  let category = 'small';
  
  if (budgetAmount > MEDIUM_MAX || guestCount === '200+') {
    category = 'large';
  } else if (budgetAmount > SMALL_MAX || guestCount === '50-200') {
    category = 'medium';
  }
  
  // Les événements premium sont au minimum "medium"
  if (isPremiumEvent && category === 'small') {
    category = 'medium';
  }
  
  return category;
}

/**
 * Récupère le prix d'un lead en fonction de sa catégorie
 * Charge la configuration depuis la base de données ou utilise les valeurs par défaut
 * @param {string} budgetCategory - 'small', 'medium', ou 'large'
 * @returns {Promise<number>} Prix en USD
 */
export async function getLeadPrice(budgetCategory) {
  try {
    // Essayer de charger la config depuis la DB
    const configs = await base44.entities.LeadPricingConfig.filter({ config_key: 'default' });
    const config = configs[0];
    
    if (config) {
      const prices = {
        small: config.small_price_usd || 2,
        medium: config.medium_price_usd || 4,
        large: config.large_price_usd || 10
      };
      
      let basePrice = prices[budgetCategory] || prices.medium;
      
      // Appliquer les multiplicateurs
      if (config.seasonal_multiplier && config.seasonal_multiplier > 1) {
        basePrice *= config.seasonal_multiplier;
      }
      
      return Math.round(basePrice);
    }
  } catch (e) {
    console.warn('Could not load pricing config, using defaults');
  }
  
  // Valeurs par défaut
  const defaultPricing = {
    small: 2,
    medium: 4,
    large: 10
  };
  
  return defaultPricing[budgetCategory] || defaultPricing.medium;
}

/**
 * LEGACY: Ancienne fonction maintenue pour compatibilité
 */
export function calculateLeadPrice(budgetCategory) {
  const pricing = {
    small: 2,
    medium: 4,
    large: 10
  };
  
  return pricing[budgetCategory] || pricing.medium;
}

/**
 * LEGACY: Détermine la catégorie de budget à partir du string budget
 */
export const determineBudgetCategory = (budgetString) => {
  if (!budgetString) return 'medium';
  
  // Extraire le montant numérique
  const numbers = budgetString.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 'medium';
  
  // Prendre le montant le plus élevé mentionné
  const maxAmount = Math.max(...numbers.map(n => parseInt(n)));
  
  // Conversion approximative: FCFA vers USD (1 USD ≈ 600 FCFA)
  const amountInUSD = maxAmount / 600;
  
  // Catégorisation
  if (amountInUSD < 200) return 'small';
  if (amountInUSD < 1000) return 'medium';
  return 'large';
};

/**
 * LEGACY: Calcule le prix de déblocage selon la catégorie de budget
 */
export const calculateUnlockPrice = (lead) => {
  const category = lead.budget_category || determineBudgetCategory(lead.budget);
  
  const prices = {
    small: 2,
    medium: 4,
    large: 10
  };
  
  return prices[category] || 4;
};

/**
 * LEGACY: Formatte le prix en FCFA
 */
export const formatPriceInFCFA = (priceUSD) => {
  const fcfa = priceUSD * 600;
  return `${fcfa.toLocaleString()} FCFA`;
};

/**
 * LEGACY: Retourne les informations de pricing pour un lead
 */
export const getLeadPricingInfo = (lead) => {
  const priceUSD = calculateUnlockPrice(lead);
  const priceFCFA = formatPriceInFCFA(priceUSD);
  const category = lead.budget_category || determineBudgetCategory(lead.budget);
  
  return {
    priceUSD,
    priceFCFA,
    category,
    description: category === 'small' ? 'Petit budget' :
                 category === 'medium' ? 'Budget moyen' :
                 'Budget élevé'
  };
};