import { base44 } from "@/api/apiClient";

/**
 * Garde de permissions côté Backend
 * RÈGLE D'OR : La sécurité se fait au Backend, jamais au Frontend
 * 
 * Ces fonctions vérifient les permissions AVANT d'exécuter des actions sensibles
 */

export const PermissionGuard = {
  /**
   * Vérifie si l'utilisateur actuel est admin
   */
  async isAdmin() {
    try {
      const user = await base44.auth.me();
      return user.role === 'admin';
    } catch (e) {
      return false;
    }
  },

  /**
   * Vérifie si l'utilisateur actuel possède une ressource
   */
  async ownsResource(resourceUserId) {
    try {
      const user = await base44.auth.me();
      return user.id === resourceUserId;
    } catch (e) {
      return false;
    }
  },

  /**
   * Exécute une action uniquement si l'utilisateur est admin
   * Lance une erreur si l'utilisateur n'a pas la permission
   */
  async requireAdmin(action, errorMessage = "Action réservée aux administrateurs") {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error(errorMessage);
    }
    return action();
  },

  /**
   * Exécute une action uniquement si l'utilisateur possède la ressource OU est admin
   */
  async requireOwnershipOrAdmin(resourceUserId, action, errorMessage = "Vous n'avez pas la permission d'effectuer cette action") {
    const user = await base44.auth.me();
    const isOwner = user.id === resourceUserId;
    const isAdmin = user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      throw new Error(errorMessage);
    }
    return action();
  },

  /**
   * Vérifie les permissions pour supprimer un service
   */
  async canDeleteService(service) {
    const user = await base44.auth.me();
    return user.id === service.planner_id || user.role === 'admin';
  },

  /**
   * Vérifie les permissions pour modifier un booking
   */
  async canModifyBooking(booking) {
    const user = await base44.auth.me();
    // Le vendeur, le client ou un admin peuvent modifier
    return user.id === booking.planner_id || 
           user.email === booking.created_by || 
           user.role === 'admin';
  },

  /**
   * Vérifie les permissions pour valider une vérification
   */
  async canApproveVerification() {
    return await this.isAdmin();
  },

  /**
   * Vérifie les permissions pour valider un paiement
   */
  async canApprovePayment() {
    return await this.isAdmin();
  },

  /**
   * Vérifie les permissions pour modérer un avis
   */
  async canModerateReview() {
    return await this.isAdmin();
  },

  /**
   * Vérifie les permissions pour gérer les types de services
   */
  async canManageServiceTypes() {
    return await this.isAdmin();
  },

  /**
   * Vérifie les permissions pour voir tous les utilisateurs
   */
  async canViewAllUsers() {
    return await this.isAdmin();
  },

  /**
   * Vérifie les permissions pour effectuer des payouts
   */
  async canProcessPayouts() {
    return await this.isAdmin();
  }
};