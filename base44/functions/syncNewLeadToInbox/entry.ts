import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data: lead } = await req.json();

    if (!lead) {
      return Response.json({ error: 'No lead data' }, { status: 400 });
    }

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Fetch all admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');

    // Fetch client info
    const clientUser = await base44.entities.User.list().then(users =>
      users.find(u => u.id === lead.client_id)
    );

    // Send email to all admins
    for (const admin of admins) {
      if (admin.email) {
        const emailBody = `
          <h2>📌 Nouveau Lead Créé</h2>
          <p><strong>Client :</strong> ${clientUser?.full_name || 'Inconnu'}</p>
          <p><strong>Email :</strong> ${lead.client_email || 'Non fourni'}</p>
          <p><strong>Téléphone :</strong> ${lead.client_phone || 'Non fourni'}</p>
          <hr>
          <p><strong>Type d'événement :</strong> ${lead.event_type}</p>
          <p><strong>Catégorie de service :</strong> ${lead.service_category}</p>
          <p><strong>Date :</strong> ${lead.event_date}</p>
          <p><strong>Localisation :</strong> ${lead.location}</p>
          <p><strong>Budget :</strong> ${lead.budget || 'Non spécifié'}</p>
          <p><strong>Nombre d'invités :</strong> ${lead.guest_count || 'Non spécifié'}</p>
          <hr>
          <p><strong>Description :</strong></p>
          <p>${lead.description}</p>
          <hr>
          <p>Status du Lead : <strong>${lead.status || 'open'}</strong></p>
          <p style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc;">
            <a href="https://eventcrafter.app/AdminDashboard" style="background: #FF6B35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Voir le Lead dans le Dashboard
            </a>
          </p>
        `;

        await sendGmailEmail(
          accessToken,
          admin.email,
          `🔔 Nouveau Lead - ${lead.event_type} - ${lead.location}`,
          emailBody
        );
      }
    }

    return Response.json({
      success: true,
      message: `Notification envoyée à ${admins.length} admin(s)`
    });

  } catch (error) {
    console.error('Sync lead to inbox error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendGmailEmail(accessToken, to, subject, htmlBody) {
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