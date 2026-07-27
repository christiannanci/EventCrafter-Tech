import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event: { entity_id }, data: lead } = await req.json();

    if (!lead) {
      return Response.json({ error: 'No lead data' }, { status: 400 });
    }

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Fetch client info
    const clientUser = await base44.entities.User.list().then(users => 
      users.find(u => u.id === lead.client_id)
    );

    const clientProfile = await base44.entities.ClientProfile.list().then(profiles =>
      profiles.find(p => p.user_id === lead.client_id)
    );

    // Email to client
    if (clientUser && clientUser.email) {
      const clientEmailBody = `
        <h2>Votre demande a été reçue! 🎉</h2>
        <p>Bonjour ${clientProfile?.first_name || clientUser.full_name},</p>
        <p>Merci d'avoir créé une demande pour un événement <strong>${lead.event_type}</strong>.</p>
        <p><strong>Détails :</strong></p>
        <ul>
          <li>📅 Date : ${lead.event_date}</li>
          <li>📍 Lieu : ${lead.location}</li>
          <li>💰 Budget : ${lead.budget || 'Non spécifié'}</li>
          <li>👥 Nombre d'invités : ${lead.guest_count || 'Non spécifié'}</li>
        </ul>
        <p>Les prestataires vont maintenant consulter votre demande. Vous recevrez bientôt des propositions.</p>
        <p>En cas de question, contactez notre support.</p>
      `;

      await sendGmailEmail(
        accessToken,
        clientUser.email,
        `Demande de service reçue - ${lead.event_type}`,
        clientEmailBody
      );
    }

    // Fetch vendors matching the service category
    const allVendors = await base44.entities.VendorProfile.list();
    const matchingVendors = allVendors.filter(v => 
      !v.service_type_code || v.category_primary === lead.service_category || lead.service_category === 'All'
    );

    // Email to matching vendors
    for (const vendor of matchingVendors) {
      const vendorUser = await base44.entities.User.list().then(users =>
        users.find(u => u.id === vendor.user_id)
      );

      if (vendorUser && vendorUser.email) {
        const vendorEmailBody = `
          <h2>Une nouvelle demande attend votre attention! 📬</h2>
          <p>Bonjour ${vendor.business_name},</p>
          <p>Un client cherche un prestataire pour un événement <strong>${lead.event_type}</strong> dans votre catégorie.</p>
          <p><strong>Détails de la demande :</strong></p>
          <ul>
            <li>🎯 Catégorie : ${lead.service_category}</li>
            <li>📅 Date : ${lead.event_date}</li>
            <li>📍 Lieu : ${lead.location}</li>
            <li>💰 Budget : ${lead.budget || 'Non spécifié'}</li>
          </ul>
          <p><strong>Description :</strong> ${lead.description}</p>
          <p>⏰ Connectez-vous rapidement pour voir les détails de contact du client et soumettre une proposition.</p>
        `;

        await sendGmailEmail(
          accessToken,
          vendorUser.email,
          `Nouvelle demande - ${lead.event_type}`,
          vendorEmailBody
        );
      }
    }

    return Response.json({ 
      success: true, 
      message: `Emails envoyés au client et ${matchingVendors.length} prestataires` 
    });

  } catch (error) {
    console.error('Followup email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendGmailEmail(accessToken, to, subject, htmlBody) {
  const message = {
    to,
    subject,
    html: htmlBody
  };

  const raw = btoa(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${htmlBody}`
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    throw new Error(`Gmail error: ${response.statusText}`);
  }

  return response.json();
}