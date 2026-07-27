/**
 * Système de Classement Intelligent avec Score de Réputation
 * RN2 & RN3: Hiérarchie corrigée : Gratuit < Premium < Gold
 * RN7: Rotation équitable des prestataires
 */

import { base44 } from "@/api/apiClient";

/**
 * Calcule le Score de Réputation
 * Formule: Score = ((Note Moyenne / 5) × 0.7) + ((Nombre d'Avis / 5) × 0.3)
 */
export const calculateReputationScore = (service, vendorProfile) => {
  const avgRating = service.rating || 0;
  const reviewCount = service.review_count || 0;
  
  const normalizedRating = avgRating / 5;
  const normalizedReviewCount = reviewCount / 5;
  
  const reputationScore = (normalizedRating * 0.7) + (normalizedReviewCount * 0.3);
  
  return Math.round(reputationScore * 100) / 100;
};

/**
 * RN7: Calcule le score de rotation pour éviter que les mêmes apparaissent toujours
 */
export const calculateRotationBonus = (service) => {
  if (!service.rotation_last_shown) return 100; // Jamais affiché = bonus max
  
  const lastShown = new Date(service.rotation_last_shown);
  const now = new Date();
  const hoursSinceShown = (now - lastShown) / (1000 * 60 * 60);
  
  // Plus c'est ancien, plus le bonus est élevé
  // 0h = 0 bonus, 24h = 50 bonus, 48h+ = 100 bonus
  return Math.min(100, (hoursSinceShown / 24) * 50);
};

/**
 * Vérifie si un vendeur bénéficie du "Boost Nouveau"
 * Boost de 30 jours pour les nouveaux membres Gold/Premium
 */
export const hasNewMemberBoost = (vendorProfile) => {
  if (!vendorProfile || !vendorProfile.created_date || !vendorProfile.plan) return false;
  
  const createdDate = new Date(vendorProfile.created_date);
  const now = new Date();
  const daysSinceCreation = (now - createdDate) / (1000 * 60 * 60 * 24);
  
  const isPremiumOrGold = vendorProfile.plan && ['gold', 'premium'].includes(vendorProfile.plan);
  return isPremiumOrGold && daysSinceCreation <= 30;
};

/**
 * RN5: Vérifie si le service a un boost "Coup de Coeur" actif (48h)
 */
export const hasFeaturedBoost = (service) => {
  if (!service.featured_until) return false;
  
  const featuredUntil = new Date(service.featured_until);
  const now = new Date();
  
  return now < featuredUntil;
};

/**
 * Charge la configuration de ranking (poids configurables)
 */
export const loadRankingConfig = async () => {
  try {
    const configs = await base44.entities.RankingConfig.filter({ config_key: 'default' });
    return configs[0] || {
      boost_weight: 50,
      rating_weight: 30,
      responsiveness_weight: 10,
      verification_weight: 5,
      cultural_match_weight: 8,
      rotation_hours: 4
    };
  } catch (err) {
    console.warn('Failed to load ranking config, using defaults:', err);
    return {
      boost_weight: 50,
      rating_weight: 30,
      responsiveness_weight: 10,
      verification_weight: 5,
      cultural_match_weight: 8,
      rotation_hours: 4
    };
  }
};

/**
 * Vérifie la réactivité d'un vendeur (messages < 2h en moyenne)
 */
export const calculateResponsiveness = async (vendorUserId, conversations = []) => {
  // Filtrer les conversations du vendeur
  const vendorConvos = conversations.filter(c => 
    c.vendor_id === vendorUserId || c.planner_id === vendorUserId
  );
  
  if (vendorConvos.length === 0) return false;
  
  // Vérifier s'il y a des réponses rapides (< 2h)
  // Pour simplifier, on considère réactif si au moins 3 conversations récentes
  return vendorConvos.length >= 3;
};

/**
 * Vérifie si le service correspond aux critères culturels de la recherche
 */
export const checkCulturalMatch = (service, searchFilters = {}) => {
  if (!searchFilters.cultural_zones || searchFilters.cultural_zones.length === 0) return false;
  
  const serviceCulturalZones = service.cultural_zones || [];
  return searchFilters.cultural_zones.some(zone => serviceCulturalZones.includes(zone));
};

/**
 * Calcule le score global de ranking pour un service
 * SMART RANKING: Boost + Note + Catégorie + Réactivité
 */
export const calculateRankingScore = async (service, context) => {
  const { 
    vendorProfiles = [], 
    searchQuery = '', 
    conversations = [],
    searchFilters = {},
    rankingConfig = null 
  } = context;
  
  // Charger la config si non fournie
  const config = rankingConfig || await loadRankingConfig();
  
  let score = 0;
  
  // ========================================
  // NIVEAU 1: STATUT BOOST (Priorité absolue)
  // ========================================
  const vendorProfile = vendorProfiles.find(v => v.user_id === service.planner_id);
  
  // Smart Match Boost (payant 3-5$/semaine)
  if (vendorProfile?.smart_match_boost_active) {
    const boostExpiry = new Date(vendorProfile.smart_match_boost_expiry);
    if (new Date() < boostExpiry) {
      score += config.boost_weight * 1000; // Multiplicateur x1000 pour priorité absolue
    }
  }
  
  // RN5: Coup de Coeur (boost 48h)
  if (hasFeaturedBoost(service)) {
    score += config.boost_weight * 800; // Légèrement moins que Smart Match
  }
  
  // ========================================
  // NIVEAU 2: QUALITÉ (Note & Avis)
  // ========================================
  const avgRating = service.rating || 0;
  const normalizedRating = avgRating / 5; // 0 à 1
  score += normalizedRating * config.rating_weight * 100;
  
  // Bonus pour nombre d'avis (crédibilité)
  const reviewCount = service.review_count || 0;
  if (reviewCount > 5) score += 50;
  if (reviewCount > 20) score += 100;
  
  // ========================================
  // NIVEAU 3: RÉACTIVITÉ
  // ========================================
  const isResponsive = await calculateResponsiveness(service.planner_id, conversations);
  if (isResponsive) {
    score += config.responsiveness_weight * 100;
  }
  
  // ========================================
  // NIVEAU 4: VÉRIFICATION
  // ========================================
  if (service.vendor_verified || vendorProfile?.verification_status === 'verified') {
    score += config.verification_weight * 100;
  }
  
  // ========================================
  // NIVEAU 5: AFFINITÉ CULTURELLE
  // ========================================
  if (checkCulturalMatch(service, searchFilters)) {
    score += config.cultural_match_weight * 100;
  }
  
  // ========================================
  // RN7: ROTATION ÉQUITABLE (pour services boostés)
  // ========================================
  if (vendorProfile?.smart_match_boost_active || hasFeaturedBoost(service)) {
    if (!service.rotation_last_shown) {
      score += 500; // Jamais affiché = bonus
    } else {
      const lastShown = new Date(service.rotation_last_shown);
      const now = new Date();
      const hoursSinceShown = (now - lastShown) / (1000 * 60 * 60);
      
      if (hoursSinceShown >= config.rotation_hours) {
        score += 300; // Rotation duty - remonter ce service
      }
    }
  }
  
  // ========================================
  // HIERARCHIE PLAN (Gold > Premium > Free)
  // ========================================
  if (vendorProfile) {
    if (vendorProfile.plan === 'gold') {
      score += 100000; // Gold toujours privilégié
    } else if (vendorProfile.plan === 'premium') {
      score += 50000;
    } else {
      score += 1000;
    }
    
    // Boost Nouveau (30 premiers jours)
    if (hasNewMemberBoost(vendorProfile)) {
      score += 20000;
    }
  }
  
  // ========================================
  // PERTINENCE RECHERCHE
  // ========================================
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    
    if (service.title?.toLowerCase().includes(query)) {
      score += 500;
    }
    
    if (service.description?.toLowerCase().includes(query)) {
      score += 200;
    }
    
    if (service.category?.toLowerCase().includes(query)) {
      score += 300;
    }
  }
  
  return score;
};

/**
 * Applique le système de ranking à une liste de services
 * RN7: Met à jour rotation_last_shown pour les services affichés
 */
export const applyRankingSystem = async (services, context = {}) => {
  try {
    const { searchQuery = '', searchFilters = {} } = context;
    
    const vendorProfiles = await base44.entities.VendorProfile.list();
    const conversations = await base44.entities.Conversation.list('-updated_date', 1000);
    const rankingConfig = await loadRankingConfig();
    
    const scoringContext = {
      vendorProfiles,
      searchQuery,
      conversations,
      searchFilters,
      rankingConfig
    };
    
    const rankedServicesPromises = services.map(async (service) => {
      const vendorProfile = vendorProfiles.find(v => v.user_id === service.planner_id);
      const score = await calculateRankingScore(service, scoringContext);
      
      return {
        ...service,
        _rankingScore: score,
        _reputationScore: calculateReputationScore(service, vendorProfile),
        _vendorPlan: vendorProfile?.plan || 'free',
        _hasNewBoost: hasNewMemberBoost(vendorProfile),
        _hasFeaturedBoost: hasFeaturedBoost(service),
        _hasSmartMatchBoost: vendorProfile?.smart_match_boost_active && 
                             new Date() < new Date(vendorProfile.smart_match_boost_expiry),
        _vendorProfile: vendorProfile
      };
    });
    
    const rankedServices = await Promise.all(rankedServicesPromises);
    
    // Trier par score décroissant
    const sorted = rankedServices.sort((a, b) => b._rankingScore - a._rankingScore);
    
    // RN7: Mettre à jour rotation_last_shown pour les 10 premiers
    try {
      const topServices = sorted.slice(0, 10);
      const now = new Date().toISOString();
      
      for (const service of topServices) {
        // Mise à jour asynchrone sans bloquer
        base44.entities.Service.update(service.id, {
          rotation_last_shown: now
        }).catch(err => console.warn('Rotation update failed:', err));
      }
    } catch (err) {
      console.warn('Rotation tracking error:', err);
    }
    
    return sorted;
  } catch (error) {
    console.error('Ranking engine error:', error);
    return services;
  }
};

/**
 * Identifie les "Top Rated" dans chaque catégorie de statut
 */
export const getTopRatedServices = (rankedServices) => {
  const topRated = {
    gold: [],
    premium: [],
    free: []
  };
  
  const servicesByPlan = {
    gold: rankedServices.filter(s => s._vendorPlan === 'gold'),
    premium: rankedServices.filter(s => s._vendorPlan === 'premium'),
    free: rankedServices.filter(s => s._vendorPlan === 'free')
  };
  
  topRated.gold = servicesByPlan.gold.slice(0, 3).map(s => s.id);
  topRated.premium = servicesByPlan.premium.slice(0, 3).map(s => s.id);
  topRated.free = servicesByPlan.free.slice(0, 3).map(s => s.id);
  
  return topRated;
};

/**
 * Formate les données de ranking pour affichage Admin
 */
export const formatRankingDataForAdmin = (rankedServices) => {
  return rankedServices.map((service, index) => ({
    position: index + 1,
    service_id: service.id,
    service_title: service.title,
    vendor_plan: service._vendorPlan,
    reputation_score: service._reputationScore,
    total_ranking_score: service._rankingScore,
    rating: service.rating || 0,
    review_count: service.review_count || 0,
    has_new_boost: service._hasNewBoost,
    has_featured_boost: service._hasFeaturedBoost,
    is_verified: service.vendor_verified,
    is_featured: service.is_featured,
    created_date: service.created_date
  }));
};