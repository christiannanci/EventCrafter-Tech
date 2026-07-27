import { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { addMonths, startOfMonth, endOfMonth } from "date-fns";

/**
 * Système de Récompenses à la Performance
 * Si un prestataire conclut 3 contrats en un mois:
 * - Reçoit un crédit de $2-$5
 * - Éligible à une mise en avant Featured 48h sur la page d'accueil
 */

const CONTRACTS_REQUIRED = 3;
const REWARD_CREDIT_MIN = 2;
const REWARD_CREDIT_MAX = 5;
const FEATURED_DURATION_HOURS = 48;

/**
 * Vérifie et accorde les récompenses de performance pour un vendor
 */
export const checkPerformanceReward = async (vendorUserId) => {
  try {
    // Récupérer le profil vendor
    const profiles = await base44.entities.VendorProfile.filter({ user_id: vendorUserId });
    if (!profiles || profiles.length === 0) return null;
    
    const vendorProfile = profiles[0];
    
    // Vérifier si déjà récompensé ce mois
    const lastReward = vendorProfile.last_performance_reward 
      ? new Date(vendorProfile.last_performance_reward)
      : null;
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    
    if (lastReward && lastReward >= monthStart) {
      // Déjà récompensé ce mois
      return null;
    }
    
    // Compter les contrats conclus ce mois
    const monthEnd = endOfMonth(now);
    const allBookings = await base44.entities.Booking.filter({ 
      planner_id: vendorUserId,
      status: 'completed'
    });
    
    const thisMonthContracts = allBookings.filter(b => {
      const bookingDate = new Date(b.created_date);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });
    
    if (thisMonthContracts.length < CONTRACTS_REQUIRED) {
      // Pas encore éligible
      return {
        eligible: false,
        contractsCount: thisMonthContracts.length,
        contractsRequired: CONTRACTS_REQUIRED
      };
    }
    
    // ÉLIGIBLE ! Accorder les récompenses
    
    // 1. Crédit de $2-$5 (on prend la moyenne $3.5)
    const creditAmount = (REWARD_CREDIT_MIN + REWARD_CREDIT_MAX) / 2;
    
    // 2. Featured pendant 48h sur UN de ses services (on prend le plus populaire)
    const vendorServices = await base44.entities.Service.filter({ planner_id: vendorUserId });
    let featuredService = null;
    
    if (vendorServices && vendorServices.length > 0) {
      // Prendre le service avec le plus de vues
      featuredService = vendorServices.reduce((prev, current) => 
        (current.views || 0) > (prev.views || 0) ? current : prev
      );
      
      // Activer le featured
      await base44.entities.Service.update(featuredService.id, {
        is_featured: true,
        featured_until: new Date(Date.now() + FEATURED_DURATION_HOURS * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Mettre à jour le profil vendor
    await base44.entities.VendorProfile.update(vendorProfile.id, {
      reward_credits: (vendorProfile.reward_credits || 0) + creditAmount,
      last_performance_reward: now.toISOString(),
      contracts_this_month: thisMonthContracts.length
    });
    
    // Créer une transaction pour tracer le crédit
    await base44.entities.Transaction.create({
      user_id: vendorUserId,
      amount: creditAmount,
      type: 'commission',
      status: 'completed',
      description: `Récompense Performance: ${thisMonthContracts.length} contrats conclus ce mois`
    });
    
    // Notifier le vendor
    await base44.entities.Notification.create({
      user_id: vendorUserId,
      title: "🎉 Récompense Performance Débloquée !",
      message: `Félicitations ! Vous avez conclu ${thisMonthContracts.length} contrats ce mois. Vous recevez +$${creditAmount} en crédit et votre service "${featuredService?.title || 'top'}" est mis en avant pendant 48h !`,
      type: "system",
      link: "/VendorDashboard",
      is_read: false
    });
    
    return {
      eligible: true,
      contractsCount: thisMonthContracts.length,
      creditAwarded: creditAmount,
      featuredService: featuredService?.title,
      featuredDuration: FEATURED_DURATION_HOURS
    };
    
  } catch (error) {
    console.error('Performance reward check error:', error);
    return null;
  }
};

/**
 * Vérifie automatiquement les récompenses pour tous les vendors actifs
 * À appeler via un scheduled task mensuel
 */
export const checkAllVendorsPerformance = async () => {
  try {
    const allProfiles = await base44.entities.VendorProfile.list('-created_date', 1000);
    
    const results = [];
    for (const profile of allProfiles) {
      const result = await checkPerformanceReward(profile.user_id);
      if (result && result.eligible) {
        results.push(result);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Bulk performance check error:', error);
    return [];
  }
};

/**
 * Hook React pour vérifier les récompenses au montage du composant
 */
export const usePerformanceReward = (vendorUserId) => {
  const [rewardInfo, setRewardInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const check = async () => {
      if (!vendorUserId) return;
      const info = await checkPerformanceReward(vendorUserId);
      setRewardInfo(info);
      setLoading(false);
    };
    check();
  }, [vendorUserId]);
  
  return { rewardInfo, loading };
};