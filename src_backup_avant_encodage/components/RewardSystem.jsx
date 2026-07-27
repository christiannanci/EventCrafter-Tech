/**
 * RN4: Système de récompenses ($2-$5 ou 1 crédit lead gratuit)
 */

import { base44 } from "@/api/apiClient";
import { NotificationService } from '@/components/NotificationService';

/**
 * Types de récompenses disponibles
 */
export const REWARD_TYPES = {
  FIRST_BOOKING: {
    amount: 2, // $2
    credits: 1,
    name: 'Première réservation'
  },
  VERIFIED_PROFILE: {
    amount: 3, // $3
    credits: 1,
    name: 'Profil vérifié'
  },
  FIRST_REVIEW: {
    amount: 2, // $2
    credits: 0,
    name: 'Premier avis reçu'
  },
  TEN_BOOKINGS: {
    amount: 5, // $5
    credits: 2,
    name: '10 réservations complétées'
  }
};

/**
 * Attribue une récompense à un vendeur
 */
export const grantReward = async (vendorId, rewardType) => {
  try {
    const reward = REWARD_TYPES[rewardType];
    if (!reward) {
      throw new Error('Invalid reward type');
    }

    // Récupérer le profil vendeur
    const profiles = await base44.entities.VendorProfile.filter({ user_id: vendorId });
    if (profiles.length === 0) {
      throw new Error('Vendor profile not found');
    }

    const vendorProfile = profiles[0];

    // Mettre à jour le compte du vendeur
    const updates = {};
    
    if (reward.amount > 0) {
      updates.account_balance = (vendorProfile.account_balance || 0) + reward.amount;
    }
    
    if (reward.credits > 0) {
      updates.reward_credits = (vendorProfile.reward_credits || 0) + reward.credits;
    }

    await base44.entities.VendorProfile.update(vendorProfile.id, updates);

    // Créer une transaction pour traçabilité
    await base44.entities.Transaction.create({
      user_id: vendorId,
      amount: reward.amount,
      type: 'reward',
      status: 'completed',
      description: `Récompense: ${reward.name}`
    });

    // Notifier le vendeur
    await NotificationService.sendToVendor({
      vendorId,
      title: '🎉 Récompense Gagnée !',
      message: `Félicitations ! Vous avez gagné ${reward.amount > 0 ? `$${reward.amount}` : ''} ${reward.credits > 0 ? `+ ${reward.credits} crédit${reward.credits > 1 ? 's' : ''} lead` : ''} pour "${reward.name}".`,
      type: 'system',
      link: '/VendorDashboard'
    });

    return {
      success: true,
      reward,
      newBalance: updates.account_balance,
      newCredits: updates.reward_credits
    };
  } catch (error) {
    console.error('Grant reward error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Vérifie et attribue les récompenses automatiques
 */
export const checkAndGrantAutoRewards = async (vendorId) => {
  try {
    // Récupérer les données du vendeur
    const profiles = await base44.entities.VendorProfile.filter({ user_id: vendorId });
    if (profiles.length === 0) return;

    const vendorProfile = profiles[0];
    const bookings = await base44.entities.Booking.filter({ planner_id: vendorId });
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const reviews = await base44.entities.VendorReview.filter({ provider_id: vendorId, status: 'approved' });

    // Vérifier les transactions déjà accordées pour éviter les doublons
    const existingRewards = await base44.entities.Transaction.filter({
      user_id: vendorId,
      type: 'reward'
    });

    const hasReward = (rewardName) => 
      existingRewards.some(t => t.description.includes(rewardName));

    // Première réservation
    if (completedBookings.length >= 1 && !hasReward('Première réservation')) {
      await grantReward(vendorId, 'FIRST_BOOKING');
    }

    // Profil vérifié
    if (vendorProfile.verification_status === 'verified' && !hasReward('Profil vérifié')) {
      await grantReward(vendorId, 'VERIFIED_PROFILE');
    }

    // Premier avis
    if (reviews.length >= 1 && !hasReward('Premier avis reçu')) {
      await grantReward(vendorId, 'FIRST_REVIEW');
    }

    // 10 réservations
    if (completedBookings.length >= 10 && !hasReward('10 réservations complétées')) {
      await grantReward(vendorId, 'TEN_BOOKINGS');
    }

  } catch (error) {
    console.error('Auto rewards check error:', error);
  }
};

/**
 * Utilise un crédit reward pour débloquer un lead
 */
export const useRewardCredit = async (vendorId) => {
  try {
    const profiles = await base44.entities.VendorProfile.filter({ user_id: vendorId });
    if (profiles.length === 0) {
      throw new Error('Vendor profile not found');
    }

    const vendorProfile = profiles[0];

    if ((vendorProfile.reward_credits || 0) < 1) {
      throw new Error('Pas assez de crédits reward');
    }

    // Déduire 1 crédit
    await base44.entities.VendorProfile.update(vendorProfile.id, {
      reward_credits: vendorProfile.reward_credits - 1
    });

    return { success: true, remainingCredits: vendorProfile.reward_credits - 1 };
  } catch (error) {
    console.error('Use reward credit error:', error);
    return { success: false, error: error.message };
  }
};