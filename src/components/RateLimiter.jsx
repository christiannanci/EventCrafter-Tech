/**
 * Rate Limiter avec stratégie Token Bucket
 * Protège contre le spam, DoS et abus API
 */

class RateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  /**
   * Vérifie si une action est autorisée
   * @param {string} key - Identifiant unique (userId, IP, action)
   * @param {number} maxTokens - Nombre maximum de jetons
   * @param {number} refillRate - Jetons ajoutés par seconde
   * @returns {boolean} true si autorisé
   */
  checkLimit(key, maxTokens = 10, refillRate = 1) {
    const now = Date.now();
    
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        tokens: maxTokens,
        lastRefill: now
      });
      return true;
    }

    const bucket = this.buckets.get(key);
    
    // Calculer les jetons à ajouter depuis le dernier refill
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * refillRate;
    
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Vérifier si on peut consommer un jeton
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Obtient le temps d'attente avant la prochaine action
   * @param {string} key 
   * @param {number} refillRate 
   * @returns {number} Secondes à attendre
   */
  getWaitTime(key, refillRate = 1) {
    const bucket = this.buckets.get(key);
    if (!bucket) return 0;
    
    const tokensNeeded = 1 - bucket.tokens;
    return Math.ceil(tokensNeeded / refillRate);
  }

  /**
   * Réinitialise les limites pour une clé
   */
  reset(key) {
    this.buckets.delete(key);
  }

  /**
   * Nettoie les anciennes entrées (à exécuter périodiquement)
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

// Instance globale
const rateLimiter = new RateLimiter();

// Nettoyage automatique toutes les heures
setInterval(() => rateLimiter.cleanup(), 3600000);

/**
 * Limites par type d'action
 */
export const RATE_LIMITS = {
  // Messages & Communications
  SEND_MESSAGE: { maxTokens: 5, refillRate: 0.5 }, // 5 messages max, 1 toutes les 2 secondes
  CREATE_CONVERSATION: { maxTokens: 3, refillRate: 0.1 }, // 3 conversations max, 1 toutes les 10 secondes
  
  // Marketplace & Recherche
  MARKETPLACE_SEARCH: { maxTokens: 20, refillRate: 2 }, // 20 recherches max, 2 par seconde
  SERVICE_VIEW: { maxTokens: 50, refillRate: 5 }, // 50 vues max, 5 par seconde
  
  // Bookings & Transactions
  CREATE_BOOKING: { maxTokens: 3, refillRate: 0.05 }, // 3 réservations max, 1 toutes les 20 secondes
  SUBMIT_REVIEW: { maxTokens: 5, refillRate: 0.02 }, // 5 avis max, 1 par minute
  
  // Uploads
  UPLOAD_FILE: { maxTokens: 10, refillRate: 0.5 }, // 10 uploads max, 1 toutes les 2 secondes
  
  // Notifications & Email
  SEND_NOTIFICATION: { maxTokens: 10, refillRate: 0.2 }, // 10 notifications max, 1 toutes les 5 secondes
  
  // Admin Actions
  ADMIN_ACTION: { maxTokens: 50, refillRate: 5 }, // 50 actions max, 5 par seconde
  
  // General API
  API_CALL: { maxTokens: 100, refillRate: 10 } // 100 requêtes max, 10 par seconde
};

/**
 * Hook pour vérifier les limites avant une action
 * @param {string} action - Type d'action (voir RATE_LIMITS)
 * @param {string} userId - ID utilisateur
 * @returns {Function} Fonction de vérification
 */
export const useRateLimit = (action, userId) => {
  return () => {
    const limit = RATE_LIMITS[action] || RATE_LIMITS.API_CALL;
    const key = `${userId}_${action}`;
    const allowed = rateLimiter.checkLimit(key, limit.maxTokens, limit.refillRate);
    
    if (!allowed) {
      const waitTime = rateLimiter.getWaitTime(key, limit.refillRate);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }
    
    return true;
  };
};

/**
 * Fonction utilitaire pour envelopper les appels API
 */
export const withRateLimit = async (action, userId, apiCall) => {
  const limit = RATE_LIMITS[action] || RATE_LIMITS.API_CALL;
  const key = `${userId}_${action}`;
  
  const allowed = rateLimiter.checkLimit(key, limit.maxTokens, limit.refillRate);
  
  if (!allowed) {
    const waitTime = rateLimiter.getWaitTime(key, limit.refillRate);
    throw new Error(`⏱️ Trop de requêtes. Veuillez patienter ${waitTime} seconde(s).`);
  }
  
  return await apiCall();
};

export default rateLimiter;