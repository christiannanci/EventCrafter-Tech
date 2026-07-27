import { InvokeLLM, SendEmail, UploadFile, SendSMS, GenerateImage, ExtractDataFromUploadedFile } from '@/api/integrations';
import { base44 } from "@/api/apiClient";

export async function generateAndSendInvoice(contract, booking, vendorProfile, clientProfile) {
  try {
    // Générer le numéro de facture
    const invoiceNumber = `INV-${new Date().getFullYear()}-${contract.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = new Date().toLocaleDateString('fr-FR');
    
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || clientProfile.pseudo || 'Client'
      : booking.client_name || 'Client';
    const subtotal = contract.contract_amount || 0;
    const commission = subtotal * 0.05;
    const total = subtotal;
    
    // Générer la facture en HTML
    const invoiceHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Facture ${invoiceNumber}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
  .header { background: #FF6B35; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { margin: 0; font-size: 28px; }
  .invoice-meta { text-align: right; }
  .parties { display: flex; justify-content: space-between; margin: 30px 0; }
  .party h3 { color: #FF6B35; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
  td { padding: 10px; border-bottom: 1px solid #eee; }
  .total-section { text-align: right; margin: 20px 0; }
  .total-amount { font-size: 20px; font-weight: bold; color: #FF6B35; }
  .footer { background: #f5f5f5; padding: 15px; text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  .separator { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div><h1>EventCrafter</h1><p style="margin:0">Marketplace</p></div>
    <div class="invoice-meta">
      <h2 style="margin:0;color:white">FACTURE</h2>
      <p style="margin:0">N° ${invoiceNumber}</p>
      <p style="margin:0">Date: ${invoiceDate}</p>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <h3>Prestataire</h3>
      <p><strong>${vendorProfile?.business_name || 'Prestataire'}</strong></p>
      ${vendorProfile?.phone ? `<p>${vendorProfile.phone}</p>` : ''}
      ${vendorProfile?.city ? `<p>${vendorProfile.city}</p>` : ''}
    </div>
    <div class="party" style="text-align:right">
      <h3>Client</h3>
      <p><strong>${clientName}</strong></p>
      ${clientProfile?.phone ? `<p>${clientProfile.phone}</p>` : ''}
    </div>
  </div>
  <hr class="separator" />
  <h3>Détails du Service</h3>
  <table>
    <thead><tr><th>Description</th><th>Quantité</th><th>Prix Unitaire</th><th>Total</th></tr></thead>
    <tbody>
      <tr>
        <td>Contrat N° ${contract.contract_number}<br/><small>Date événement: ${booking.event_date ? new Date(booking.event_date).toLocaleDateString('fr-FR') : 'À définir'}</small><br/><small>Lieu: ${contract.delivery_address || 'À définir'}</small></td>
        <td>${contract.quantity || 1}</td>
        <td>${(contract.negotiated_unit_price || 0).toLocaleString()} FCFA</td>
        <td>${(contract.contract_amount || 0).toLocaleString()} FCFA</td>
      </tr>
    </tbody>
  </table>
  <div class="total-section">
    <p>Sous-total: ${subtotal.toLocaleString()} FCFA</p>
    <p style="color:#999;font-size:12px">(Commission plateforme 5% incluse)</p>
    <p class="total-amount">TOTAL: ${subtotal.toLocaleString()} FCFA</p>
  </div>
  <p><strong>Conditions de paiement:</strong> ${contract.payment_terms || 'Selon contrat'}</p>
  <div class="footer">
    <p>EventCrafter Marketplace - Plateforme de services événementiels</p>
    <p>Contact: support@eventcrafter.com | +237 670 93 43 78 | Merci de votre confiance !</p>
  </div>
</body>
</html>`;

    const htmlBlob = new Blob([invoiceHtml], { type: 'text/html' });
    const pdfFile = new File([htmlBlob], `Facture_${invoiceNumber}.html`, { type: 'text/html' });
    
    // Upload le PDF
    const { file_url } = await UploadFile({ file: pdfFile });
    
    // Créer l'enregistrement Invoice dans la base de données
    const invoice = await base44.entities.Invoice.create({
      invoice_number: invoiceNumber,
      contract_id: contract.id,
      booking_id: booking.id,
      vendor_id: vendorProfile?.user_id,
      client_id: clientProfile?.user_id,
      amount: total,
      commission_amount: commission,
      status: 'pending',
      invoice_url: file_url,
      issued_date: new Date().toISOString()
    });
    
    // Envoyer par email au prestataire
    try {
      const vendorUsers = await base44.entities.User.list();
      const vendorUser = vendorUsers.find(u => u.id === vendorProfile?.user_id);
      
      if (vendorUser) {
        await SendEmail({
          from_name: 'EventCrafter',
          to: vendorUser.email,
          subject: `Nouvelle Facture N° ${invoiceNumber}`,
          body: `
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #FF6B35 0%, #F4C542 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">EventCrafter</h1>
                  <p style="color: white; margin: 5px 0 0 0;">Nouvelle Facture Générée</p>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <h2 style="color: #333;">Bonjour ${vendorProfile?.business_name || 'Prestataire'},</h2>
                  <p style="color: #666; line-height: 1.6;">
                    Votre contrat a été signé avec succès ! Vous trouverez ci-joint la facture pour le contrat <strong>${contract.contract_number}</strong>.
                  </p>
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Numéro de facture:</strong> ${invoiceNumber}</p>
                    <p style="margin: 5px 0;"><strong>Client:</strong> ${clientName}</p>
                    <p style="margin: 5px 0;"><strong>Montant total:</strong> ${total.toLocaleString()} FCFA</p>
                    <p style="margin: 5px 0;"><strong>Date événement:</strong> ${booking.event_date ? new Date(booking.event_date).toLocaleDateString('fr-FR') : 'À définir'}</p>
                  </div>
                  <p style="color: #666; line-height: 1.6;">
                    Téléchargez votre facture: <a href="${file_url}" style="color: #FF6B35;">Cliquez ici</a>
                  </p>
                  <p style="color: #666; line-height: 1.6;">
                    Le paiement sera traité selon les conditions convenues. Vous serez notifié une fois le paiement effectué.
                  </p>
                </div>
                <div style="background: #333; padding: 20px; text-align: center; color: white; font-size: 12px;">
                  <p>EventCrafter - Plateforme de services événementiels</p>
                  <p>support@eventcrafter.com</p>
                </div>
              </body>
            </html>
          `
        });
      }
    } catch (emailError) {
      console.error('Failed to send vendor email:', emailError);
    }
    
    // Envoyer par email au client
    try {
      const clientUsers = await base44.entities.User.list();
      const clientUser = clientUsers.find(u => u.id === clientProfile?.user_id);
      
      if (clientUser) {
        await SendEmail({
          from_name: 'EventCrafter',
          to: clientUser.email,
          subject: `Facture pour votre réservation N° ${invoiceNumber}`,
          body: `
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #FF6B35 0%, #F4C542 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">EventCrafter</h1>
                  <p style="color: white; margin: 5px 0 0 0;">Facture de Réservation</p>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <h2 style="color: #333;">Bonjour ${clientName},</h2>
                  <p style="color: #666; line-height: 1.6;">
                    Votre contrat avec <strong>${vendorProfile?.business_name || 'le prestataire'}</strong> a été finalisé. Veuillez trouver ci-joint votre facture.
                  </p>
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Numéro de facture:</strong> ${invoiceNumber}</p>
                    <p style="margin: 5px 0;"><strong>Prestataire:</strong> ${vendorProfile?.business_name || 'Prestataire'}</p>
                    <p style="margin: 5px 0;"><strong>Montant à payer:</strong> ${total.toLocaleString()} FCFA</p>
                    <p style="margin: 5px 0;"><strong>Date événement:</strong> ${booking.event_date ? new Date(booking.event_date).toLocaleDateString('fr-FR') : 'À définir'}</p>
                  </div>
                  <p style="color: #666; line-height: 1.6;">
                    Téléchargez votre facture: <a href="${file_url}" style="color: #FF6B35;">Cliquez ici</a>
                  </p>
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404;">
                      <strong>Action requise:</strong> Veuillez procéder au paiement pour confirmer définitivement votre réservation.
                    </p>
                  </div>
                </div>
                <div style="background: #333; padding: 20px; text-align: center; color: white; font-size: 12px;">
                  <p>EventCrafter - Plateforme de services événementiels</p>
                  <p>support@eventcrafter.com</p>
                </div>
              </body>
            </html>
          `
        });
      }
    } catch (emailError) {
      console.error('Failed to send client email:', emailError);
    }
    
    return { invoice, file_url };
    
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}