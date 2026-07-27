/**
 * Moteur de Recommandations Intelligent
 * Donne la priorité aux vendeurs Premium et Gold
 */

import { base44 } from "@/api/apiClient";

/**
 * Calcule le score de recommandation pour un service
 */
export const calculateRecommendationScore = (service, context) => {
  const {
    userBookings = [],
    userViews = [],
    allBookings = [],
    vendorProfiles = [],
    currentUserId
  } = context;

  let score = 0;

  // 1. BONUS PREMIUM/GOLD (Priorité maximale)
  const vendorProfile = vendorProfiles.find(v => v.user_id === service.planner_id);
  if (vendorProfile) {
    if (vendorProfile.plan === 'gold') {
      score += 1000; // Boost énorme pour Gold
    } else if (vendorProfile.plan === 'premium') {
      score += 500; // Boost important pour Premium
    } else {
      score += 10; // Bonus minimal pour les gratuits
    }
  }

  // 2. Filtrage Collaboratif (Utilisateurs similaires)
  const userServiceIds = (userBookings || []).filter(b => b && b.service_id).map(b => b.service_id);
  const similarUsers = findSimilarUsers(currentUserId, userServiceIds, allBookings || []);
  
  if (similarUsers && similarUsers.length > 0) {
    similarUsers.forEach(userId => {
      const theirBookings = (allBookings || []).filter(b => b && b.created_by === userId);
      const hasBookedThis = theirBookings.some(b => b && b.service_id === service.id);
      if (hasBookedThis) score += 150;
    });
  }

  // 3. Filtrage par Contenu (Caractéristiques similaires)
  const userPreferences = extractUserPreferences(userViews || [], userBookings || []);
  
  // Catégorie préférée
  if (service.category && userPreferences.categories && userPreferences.categories.includes(service.category)) {
    score += 100;
  }
  
  // Localisation préférée
  if (service.city && userPreferences.cities && userPreferences.cities.includes(service.city)) {
    score += 80;
  }
  
  // Tags culturels
  if (service.cultural_zones && Array.isArray(service.cultural_zones) && userPreferences.culturalZones && userPreferences.culturalZones.length > 0) {
    if (service.cultural_zones.some(z => z && userPreferences.culturalZones.includes(z))) {
      score += 60;
    }
  }

  // 4. Cross-Selling Intelligent
  const complementaryScore = calculateComplementaryScore(service, userBookings);
  score += complementaryScore;

  // 5. Qualité du service
  score += (service.rating || 0) * 20;
  score += service.review_count || 0;
  score += service.vendor_verified ? 50 : 0;
  score += service.is_featured ? 30 : 0;

  // 6. Engagement récent
  if (userViews && Array.isArray(userViews) && userViews.length > 0) {
    const recentViews = userViews.filter(v => 
      v && v.created_date && (Date.now() - new Date(v.created_date).getTime() < 7 * 24 * 60 * 60 * 1000)
    );
    if (recentViews.some(v => v && v.service_id === service.id)) {
      score += 40;
    }
  }

  return score;
};

/**
 * Trouve les utilisateurs avec des goûts similaires
 */
const findSimilarUsers = (currentUserId, userServiceIds, allBookings) => {
  if (!currentUserId || !userServiceIds || !Array.isArray(userServiceIds) || !allBookings || !Array.isArray(allBookings)) {
    return [];
  }

  const userSimilarity = {};
  
  allBookings.filter(b => b && b.created_by && b.service_id).forEach(booking => {
    if (booking.created_by === currentUserId) return;
    
    if (userServiceIds.includes(booking.service_id)) {
      userSimilarity[booking.created_by] = (userSimilarity[booking.created_by] || 0) + 1;
    }
  });
  
  // Retourner les 5 utilisateurs les plus similaires
  return Object.entries(userSimilarity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId]) => userId);
};

/**
 * Extrait les préférences de l'utilisateur
 */
const extractUserPreferences = (views, bookings) => {
  const categories = new Set();
  const cities = new Set();
  const culturalZones = new Set();
  
  const allItems = [...(views || []), ...(bookings || [])].filter(item => item && typeof item === 'object');
  
  allItems.forEach(item => {
    if (item.category) categories.add(item.category);
    if (item.city) cities.add(item.city);
    if (item.cultural_zones && Array.isArray(item.cultural_zones)) {
      item.cultural_zones.forEach(z => z && culturalZones.add(z));
    }
  });
  
  return {
    categories: Array.from(categories),
    cities: Array.from(cities),
    culturalZones: Array.from(culturalZones)
  };
};

/**
 * Calcule le score de complémentarité (Cross-selling)
 */
const calculateComplementaryScore = (service, userBookings) => {
  if (!service || !service.category || !userBookings || !Array.isArray(userBookings)) {
    return 0;
  }

  const complementaryMap = {
    'Venue': ['Caterer', 'Decorator', 'Stage Builder'],
    'Caterer': ['Venue', 'Server', 'Bartender'],
    'Photographer': ['Videographer', 'Venue'],
    'Event Planner': ['Venue', 'Caterer', 'Decorator'],
    'DJ': ['Venue', 'Stage Builder'],
    'Florist': ['Decorator', 'Venue'],
    'Decorator': ['Florist', 'Stage Builder', 'Venue']
  };
  
  let score = 0;
  
  userBookings.filter(b => b && b.category).forEach(booking => {
    const complementary = complementaryMap[booking.category] || [];
    if (complementary.includes(service.category)) {
      score += 200;
    }
  });
  
  return score;
};

/**
 * Obtient les services recommandés pour un utilisateur
 */
export const getRecommendations = async (userId, limit = 10) => {
  try {
    // Charger les données nécessaires
    const [services, bookings, vendorProfiles] = await Promise.all([
      base44.entities.Service.list('-created_date', 500),
      base44.entities.Booking.list('-created_date', 1000),
      base44.entities.VendorProfile.list()
    ]);
    
    // Filtrer les bookings de l'utilisateur
    const userBookings = bookings.filter(b => b.created_by === userId);
    
    // Simuler les vues (dans une vraie app, vous trackeriez ça)
    const userViews = [];
    
    // Calculer les scores
    const scoredServices = services.map(service => ({
      ...service,
      _recommendationScore: calculateRecommendationScore(service, {
        userBookings,
        userViews,
        allBookings: bookings,
        vendorProfiles,
        currentUserId: userId
      })
    }));
    
    // Trier par score et retourner les meilleurs
    return scoredServices
      .sort((a, b) => b._recommendationScore - a._recommendationScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Recommendation engine error:', error);
    return [];
  }
};

/**
 * Applique le système de recommandations à une liste existante
 */
export const applyRecommendationScoring = (services, context) => {
  if (!services || !Array.isArray(services) || services.length === 0) {
    return [];
  }
  
  if (!context || typeof context !== 'object') {
    return services;
  }
  
  try {
    const validServices = services.filter(s => s && typeof s === 'object' && s.id);
    
    return validServices.map(service => ({
      ...service,
      _recommendationScore: calculateRecommendationScore(service, context)
    })).sort((a, b) => (b._recommendationScore || 0) - (a._recommendationScore || 0));
  } catch (error) {
    console.error('Error in applyRecommendationScoring:', error);
    return services;
  }
};