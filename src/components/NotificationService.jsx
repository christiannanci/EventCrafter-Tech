import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";

/**
 * Service centralisé pour gérer les notifications (base de données + email)
 * Utilisé par tous les composants de l'application
 */
export const NotificationService = {
  /**
   * Envoie une notification avec email automatique
   * @param {Object} params
   * @param {string} params.userId - ID de l'utilisateur destinataire
   * @param {string} params.title - Titre de la notification
   * @param {string} params.message - Message de la notification
   * @param {string} params.type - Type: booking, payment, message, system, etc.
   * @param {string} params.link - Lien vers la page concernée
   * @param {string} params.userEmail - Email du destinataire (optionnel, sera récupéré si non fourni)
   * @param {string} params.userName - Nom du destinataire (optionnel)
   */
  async send({ userId, title, message, type = "system", link = "", userEmail = null, userName = null }) {
    try {
      // Créer notification en base de données
      await base44.entities.Notification.create({
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false
      });

      // Récupérer l'email si non fourni
      if (!userEmail) {
        try {
          const users = await base44.entities.User.list();
          const user = users.find(u => u.id === userId);
          userEmail = user?.email;
          userName = userName || user?.full_name || user?.email;
        } catch (e) {
          console.error("Could not fetch user email", e);
          return; // Ne pas bloquer si on ne peut pas récupérer l'email
        }
      }

      if (!userEmail) {
        console.warn("No email found for user", userId);
        return;
      }

      // Envoyer email
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
              <h2 style="color: #FF6B35; margin-top: 0;">${title}</h2>
              <div class="message-box">
                <p style="margin: 0;">${message}</p>
              </div>
              ${link ? `
                <div style="text-align: center;">
                  <a href="https://eventcrafter.app${link}" class="button">Voir les détails</a>
                </div>
              ` : ''}
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Cette notification a été envoyée à ${userName || userEmail} le ${new Date().toLocaleDateString('fr-FR', { 
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
        to: userEmail,
        subject: `EventCrafter - ${title}`,
        body: emailBody
      });

    } catch (error) {
      console.error("Error sending notification:", error);
      // Ne pas throw l'erreur pour ne pas bloquer le flux principal
    }
  },

  /**
   * Envoie une notification à tous les admins
   */
  async sendToAdmins({ title, message, type = "system", link = "" }) {
    try {
      const allUsers = await base44.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        await this.send({
          userId: admin.id,
          title,
          message,
          type,
          link,
          userEmail: admin.email,
          userName: admin.full_name
        });
      }
    } catch (error) {
      console.error("Error sending admin notifications:", error);
    }
  },

  /**
   * Envoie une notification au vendeur d'un service
   */
  async sendToVendor({ vendorId, title, message, type = "booking", link = "" }) {
    await this.send({ userId: vendorId, title, message, type, link });
  },

  /**
   * Envoie une notification au client d'une réservation
   */
  async sendToClient({ clientId, title, message, type = "booking", link = "" }) {
    await this.send({ userId: clientId, title, message, type, link });
  }
};