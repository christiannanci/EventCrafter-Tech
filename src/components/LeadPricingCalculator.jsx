import { base44 } from '@/api/apiClient';

/**
 * Determine la categorie d'un lead basee sur le budget, le nombre d'invites et le type d'evenement
 * @param {number} budgetAmount - Budget en FCFA
 * @param {string} guestCount - '< 50', '50-200', ou '200+'
 * @param {string} eventType - Type d'evenement
 * @returns {string} 'small', 'medium', ou 'large'
 */
export function calculateLeadCategory(budgetAmount, guestCount, eventType) {
  const SMALL_MAX = 300000;
  const MEDIUM_MAX = 1500000;

  const premiumEvents = ['Wedding', 'Gala', 'Corporate'];
  const isPremiumEvent = premiumEvents.includes(eventType);

  let category = 'small';

  if (budgetAmount > MEDIUM_MAX || guestCount === '200+') {
    category = 'large';
  } else if (budgetAmount > SMALL_MAX || guestCount === '50-200') {
    category = 'medium';
  }

  if (isPremiumEvent && category === 'small') {
    category = 'medium';
  }

  return category;
}

/**
 * Recupere le prix d'un lead en fonction de sa categorie (en FCFA)
 * @param {string} budgetCategory - 'small', 'medium', ou 'large'
 * @returns {Promise<number>} Prix en FCFA
 */
export async function getLeadPrice(budgetCategory) {
  try {
    const configs = await base44.entities.LeadPricingConfig.filter({ config_key: 'default' });
    const config = configs[0];

    if (config) {
      const prices = {
        small: config.small_price_usd || 1200,
        medium: config.medium_price_usd || 2400,
        large: config.large_price_usd || 6000
      };

      let basePrice = prices[budgetCategory] || prices.medium;

      if (config.seasonal_multiplier && config.seasonal_multiplier > 1) {
        basePrice *= config.seasonal_multiplier;
      }

      return Math.round(basePrice);
    }
  } catch (e) {
    console.warn('Could not load pricing config, using defaults');
  }

  const defaultPricing = {
    small: 1200,
    medium: 2400,
    large: 6000
  };

  return defaultPricing[budgetCategory] || defaultPricing.medium;
}

/**
 * LEGACY: Ancienne fonction maintenue pour compatibilite
 */
export function calculateLeadPrice(budgetCategory) {
  const pricing = {
    small: 1200,
    medium: 2400,
    large: 6000
  };

  return pricing[budgetCategory] || pricing.medium;
}

/**
 * LEGACY: Determine la categorie de budget a partir du string budget
 */
export const determineBudgetCategory = (budgetString) => {
  if (!budgetString) return 'medium';

  const numbers = budgetString.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 'medium';

  const maxAmount = Math.max(...numbers.map(n => parseInt(n)));

  const amountInUSD = maxAmount / 600;

  if (amountInUSD < 200) return 'small';
  if (amountInUSD < 1000) return 'medium';
  return 'large';
};

/**
 * LEGACY: Calcule le prix de deblocage selon la categorie de budget (en FCFA)
 */
export const calculateUnlockPrice = (lead) => {
  const category = lead.budget_category || determineBudgetCategory(lead.budget);

  const prices = {
    small: 1200,
    medium: 2400,
    large: 6000
  };

  return prices[category] || 2400;
};

/**
 * LEGACY: Formatte le prix en FCFA (le montant est deja en FCFA)
 */
export const formatPriceInFCFA = (priceFCFA) => {
  return `${priceFCFA.toLocaleString()} FCFA`;
};

/**
 * LEGACY: Retourne les informations de pricing pour un lead
 */
export const getLeadPricingInfo = (lead) => {
  const priceFCFA_raw = calculateUnlockPrice(lead);
  const priceFCFA = formatPriceInFCFA(priceFCFA_raw);
  const category = lead.budget_category || determineBudgetCategory(lead.budget);

  return {
    priceFCFA_raw,
    priceFCFA,
    category,
    description: category === 'small' ? 'Petit budget' :
                 category === 'medium' ? 'Budget moyen' :
                 'Budget eleve'
  };
};