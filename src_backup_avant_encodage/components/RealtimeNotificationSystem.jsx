/**
 * Système de Notifications Temps Réel
 * Utilise Supabase Realtime pour tous les appareils
 */

import { base44, supabase } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { toast } from "sonner";

class RealtimeNotificationSystem {
  constructor() {
    this.channels = [];
    this.isInitialized = false;
    this._conversationsCache = null;
    this._conversationsCacheTime = 0;
  }

  /**
   * Initialise le système pour un utilisateur
   */
  async initialize(userId, userRole) {
    if (this.isInitialized) return;

    try {
      // 1. Notifications générales
      this.subscribeToNotifications(userId);

      // 2. Messages en temps réel
      this.subscribeToMessages(userId);

      // 3. Spécifique au rôle
      if (userRole === 'admin') {
        this.subscribeAdminNotifications();
      } else {
        // Vérifier si l'utilisateur est vendeur ou client
        const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: userId });
        const clientProfiles = await base44.entities.ClientProfile.filter({ user_id: userId });

        if (vendorProfiles.length > 0) {
          this.subscribeVendorNotifications(userId);
        }
        
        if (clientProfiles.length > 0) {
          this.subscribeClientNotifications(userId);
        }
      }

      this.isInitialized = true;
      console.log('✅ Système de notifications temps réel activé');
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
    }
  }

  /**
   * Notifications générales
   */
  subscribeToNotifications(userId) {
    const channel = supabase
      .channel(`notif-general-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification' }, async (payload) => {
        const notification = payload.new;
        if (notification.user_id !== userId) return;

        // Toast notification
        toast(notification.title, {
          description: notification.message,
          duration: 5000,
          action: notification.link ? {
            label: "Voir",
            onClick: () => window.location.href = notification.link
          } : undefined
        });

        // Notification navigateur (si autorisé)
        this.sendBrowserNotification(notification.title, notification.message, notification.link);
        
        // Son de notification
        this.playNotificationSound();
        
        // Incrémenter le badge
        this.updateNotificationBadge();

        // Envoyer email de notification (async, non-bloquant)
        this.sendNotificationEmail(notification, userId).catch(e => 
          console.error('Email notification failed:', e)
        );
      })
      .subscribe();

    this.channels.push(channel);
  }

  /**
   * Envoie un email pour une notification
   */
  async sendNotificationEmail(notification, userId) {
    try {
      // OPTIMIZED: Fetch only current user
      const user = await base44.auth.me();
      
      if (!user?.email) return;

      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF6B35 0%, #F4C542 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .message-box { background: #f5f5f5; padding: 15px; border-left: 4px solid #FF6B35; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">Event<span style="color: #F4C542;">Crafter</span></h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Notification</p>
            </div>
            <div class="content">
              <h2 style="color: #FF6B35; margin-top: 0;">${notification.title}</h2>
              <div class="message-box">
                <p style="margin: 0;">${notification.message}</p>
              </div>
              ${notification.link ? `
                <div style="text-align: center;">
                  <a href="${window.location.origin}${notification.link}" class="button">Voir les détails</a>
                </div>
              ` : ''}
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Vous avez reçu cette notification le ${new Date().toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 EventCrafter. Tous droits réservés.</p>
              <p>Vous recevez cet email car vous êtes inscrit sur EventCrafter.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await SendEmail({
        to: user.email,
        subject: `EventCrafter - ${notification.title}`,
        body: emailBody
      });
    } catch (error) {
      console.error('Error sending notification email:', error);
    }
  }

  /**
   * Messages en temps réel
   */
  subscribeToMessages(userId) {
    const channel = supabase
      .channel(`notif-messages-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message' }, async (payload) => {
        const message = payload.new;
        if (message.sender_id === userId) return;

        // Cache conversations for 60s to avoid fetching on every message
        const now = Date.now();
        if (!this._conversationsCache || now - this._conversationsCacheTime > 60000) {
          this._conversationsCache = await base44.entities.Conversation.list();
          this._conversationsCacheTime = now;
        }
        const conversations = this._conversationsCache;
        const userConversation = conversations.find(c => 
          c.id === message.conversation_id && 
          c.participants.includes(userId)
        );

        if (userConversation) {
          // OPTIMIZED: Get sender name from message metadata or default
          const senderName = 'Quelqu\'un';

          toast(`💬 ${senderName}`, {
            description: message.content.slice(0, 50) + (message.content.length > 50 ? '...' : ''),
            duration: 4000,
            action: {
              label: "Répondre",
              onClick: () => window.location.href = `/Chat?conversationId=${message.conversation_id}`
            }
          });

          this.sendBrowserNotification(
            `Nouveau message de ${senderName}`,
            message.content,
            `/Chat?conversationId=${message.conversation_id}`
          );
          
          this.playMessageSound();
        }
      })
      .subscribe();

    this.channels.push(channel);
  }

  /**
   * Notifications Admin
   */
  subscribeAdminNotifications() {
    // Nouvelles vérifications
    const verificationChannel = supabase
      .channel('notif-admin-verification')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'verification_request' }, () => {
        toast('🔍 Nouvelle demande de vérification', {
          description: 'Un utilisateur demande la vérification de son compte',
          duration: 6000,
          action: {
            label: "Voir",
            onClick: () => window.location.href = '/AdminDashboard?tab=verifications'
          }
        });
        this.playNotificationSound();
      })
      .subscribe();

    // Nouveaux litiges
    const disputeChannel = supabase
      .channel('notif-admin-dispute')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dispute' }, () => {
        toast('⚠️ Nouveau litige', {
          description: 'Un litige nécessite votre attention',
          duration: 6000,
          action: {
            label: "Gérer",
            onClick: () => window.location.href = '/AdminDashboard?tab=disputes'
          }
        });
        this.playNotificationSound();
      })
      .subscribe();

    this.channels.push(verificationChannel, disputeChannel);
  }

  /**
   * Notifications Vendeur
   */
  subscribeVendorNotifications(userId) {
    // Nouvelles réservations
    const bookingChannel = supabase
      .channel(`notif-vendor-booking-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booking' }, (payload) => {
        const booking = payload.new;
        if (booking.planner_id !== userId) return;

        toast('🎉 Nouvelle Réservation !', {
          description: `${booking.client_name || 'Un client'} a réservé pour le ${new Date(booking.event_date).toLocaleDateString('fr-FR')}`,
          duration: 5000,
          action: {
            label: "Voir",
            onClick: () => window.location.href = '/VendorDashboard?tab=bookings_received'
          }
        });
        this.playSuccessSound();
        this.sendBrowserNotification(
          '🎉 Nouvelle Réservation',
          `Réservation pour le ${new Date(booking.event_date).toLocaleDateString('fr-FR')}`,
          '/VendorDashboard?tab=bookings_received'
        );
      })
      .subscribe();

    // Nouveaux leads
    const leadChannel = supabase
      .channel(`notif-vendor-lead-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead' }, (payload) => {
        const lead = payload.new;
        if (lead.status !== 'open') return;

        toast('🔔 Nouvelle Demande Prospect', {
          description: `${lead.event_type} - ${lead.location}`,
          duration: 4000,
          action: {
            label: "Voir",
            onClick: () => window.location.href = '/VendorDashboard?tab=leads'
          }
        });
        this.playNotificationSound();
      })
      .subscribe();

    // Avis clients
    const reviewChannel = supabase
      .channel(`notif-vendor-review-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendor_review' }, (payload) => {
        const review = payload.new;
        if (review.provider_id !== userId) return;

        const rating = review.rating;
        const emoji = rating >= 4 ? '⭐' : rating >= 3 ? '👍' : '📝';
        toast(`${emoji} Nouvel Avis Reçu`, {
          description: `${rating}/5 étoiles - "${review.comment?.slice(0, 50)}..."`,
          duration: 5000
        });
        this.playNotificationSound();
      })
      .subscribe();

    this.channels.push(bookingChannel, leadChannel, reviewChannel);
  }

  /**
   * Notifications Client
   */
  subscribeClientNotifications(userId) {
    // Mises à jour de réservations
    const bookingChannel = supabase
      .channel(`notif-client-booking-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'booking' }, (payload) => {
        const booking = payload.new;
        if (booking.created_by !== userId) return;

        const statusMessages = {
          'contract_pending': '📝 Contrat prêt à signer',
          'confirmed': '✅ Réservation confirmée',
          'in_progress': '🎬 Prestation en cours',
          'completed': '🎉 Prestation terminée',
          'cancelled': '❌ Réservation annulée'
        };

        const message = statusMessages[booking.status];
        if (message) {
          toast(message, {
            description: `Réservation du ${new Date(booking.event_date).toLocaleDateString('fr-FR')}`,
            duration: 5000,
            action: {
              label: "Voir",
              onClick: () => window.location.href = '/ClientDashboard?tab=bookings'
            }
          });
          this.playNotificationSound();
        }
      })
      .subscribe();

    this.channels.push(bookingChannel);
  }

  /**
   * Envoie une notification navigateur
   */
  async sendBrowserNotification(title, body, link) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'eventcrafter-notification',
        requireInteraction: false
      });

      if (link) {
        notification.onclick = () => {
          window.focus();
          window.location.href = link;
          notification.close();
        };
      }
    } else if (Notification.permission !== "denied") {
      await Notification.requestPermission();
    }
  }

  /**
   * Sons de notification
   */
  playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0MU6fm');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  playMessageSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgoWFZ1xbY5WqpYxeNDJcoNLYpF0ZBDyY2vHBbyQEK37M8deFNQYXY7jr4JZLDQxNo+Htr10aBTOO1PDJdysEI3XF7tuNPgkTXLLo6aVTEwpEnt/xvGofBDCF0PLRgDIFHGu+7eCXTwwLUqPk');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  playSuccessSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAhYyLcmFidKCxsZRkOTdkpNjgrWkfCEGe3/TJfzAHMIrT9OKNOwofb8Xy6aJWEQ1XquXyxXAlCTyX2fLUhDUJJ3rK8uCZTQ8PZLnr75lQDg5VquTwtGod');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  /**
   * Met à jour le badge de notifications
   */
  updateNotificationBadge() {
    const event = new CustomEvent('notification-received');
    window.dispatchEvent(event);
  }

  /**
   * Nettoie les subscriptions
   */
  cleanup() {
    this.channels.forEach(channel => supabase.removeChannel(channel));
    this.channels = [];
    this.isInitialized = false;
  }
}

export const realtimeNotifications = new RealtimeNotificationSystem();
