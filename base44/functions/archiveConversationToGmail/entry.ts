import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { conversationId, archiveToEmails } = await req.json();

    if (!conversationId || !archiveToEmails || archiveToEmails.length === 0) {
      return Response.json({ error: 'conversationId and archiveToEmails required' }, { status: 400 });
    }

    // Fetch conversation and messages
    const conversation = await base44.entities.Conversation.list().then(convs =>
      convs.find(c => c.id === conversationId)
    );

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await base44.entities.Message.filter({ conversation_id: conversationId });
    messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    // Fetch participant info
    const allUsers = await base44.entities.User.list();
    const vendorProfiles = await base44.entities.VendorProfile.list();
    const clientProfiles = await base44.entities.ClientProfile.list();

    const getParticipantName = (userId) => {
      const vendorProfile = vendorProfiles.find(p => p.user_id === userId);
      if (vendorProfile?.business_name) return vendorProfile.business_name;
      
      const clientProfile = clientProfiles.find(p => p.user_id === userId);
      if (clientProfile?.first_name || clientProfile?.last_name) {
        return `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim();
      }
      
      const user = allUsers.find(u => u.id === userId);
      return user?.full_name || user?.email || 'Unknown';
    };

    // Build conversation transcript
    let transcript = `<h2>📧 Conversation Archive</h2>`;
    transcript += `<p><strong>Participants:</strong> ${conversation.participants?.map(p => getParticipantName(p)).join(', ')}</p>`;
    transcript += `<p><strong>Date de début:</strong> ${new Date(conversation.created_date).toLocaleDateString('fr-FR')}</p>`;
    transcript += `<hr><h3>Messages:</h3>`;

    messages.forEach(msg => {
      const senderName = getParticipantName(msg.sender_id);
      const time = new Date(msg.created_date).toLocaleString('fr-FR');
      transcript += `<p><strong>${senderName}</strong> <em>(${time})</em><br>${msg.content}</p>`;
    });

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // Send to each recipient
    const results = [];
    for (const email of archiveToEmails) {
      try {
        await sendGmailEmail(
          accessToken,
          email,
          `📋 Archive - Conversation avec ${conversation.participants?.map(p => getParticipantName(p)).join(', ')}`,
          transcript
        );
        results.push({ email, success: true });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: 'Conversation archived to Gmail',
      results
    });

  } catch (error) {
    console.error('Archive conversation error:', error);
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