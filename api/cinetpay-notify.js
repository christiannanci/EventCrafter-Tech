import { getCinetpayAccessToken, getSupabaseAdminClient } from './_cinetpay-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    // CinetPay peut envoyer differents noms de champ selon le format ; on couvre les cas courants.
    const body = req.body || {};
    const merchantTransactionId =
      body.merchant_transaction_id || body.cpm_trans_id || body.transaction_id;

    if (!merchantTransactionId) {
      console.error('Notify CinetPay recu sans identifiant de transaction:', body);
      return res.status(200).json({ received: true });
    }

    const baseUrl = process.env.CINETPAY_BASE_URL || 'https://api.cinetpay.net';
    const accessToken = await getCinetpayAccessToken();

    // On ne fait JAMAIS confiance au statut du corps du webhook : on reverifie
    // directement aupres de CinetPay via l'endpoint de statut.
    const statusResponse = await fetch(`${baseUrl}/v1/payment/${merchantTransactionId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const statusData = await statusResponse.json();

    if (statusData.status !== 'SUCCESS') {
      console.log(`Paiement ${merchantTransactionId} non confirme (statut: ${statusData.status})`);
      return res.status(200).json({ received: true, status: statusData.status });
    }

    const supabase = await getSupabaseAdminClient();

    // Le prefixe (BK ou INV) a ete encode dans le merchant_transaction_id lors de l'initialisation.
    const isBooking = merchantTransactionId.startsWith('BK-');
    const isInvoice = merchantTransactionId.startsWith('INV-');

    if (isBooking) {
      const refId = merchantTransactionId.split('-')[1];

      const { data: bookings } = await supabase
        .from('booking')
        .select('id, planner_id, event_date, client_name, total_amount, status')
        .ilike('id', `${refId}%`)
        .limit(1);

      const booking = bookings && bookings[0];
      if (booking && booking.status !== 'confirmed' && booking.status !== 'completed') {
        await supabase
          .from('booking')
          .update({ status: 'confirmed', payment_status: 'paid' })
          .eq('id', booking.id);

        await supabase.from('notification').insert({
          user_id: booking.planner_id,
          title: 'Paiement recu',
          message: `Le paiement par carte de ${statusData?.user?.name || booking.client_name || 'un client'} a ete confirme pour votre reservation.`,
          type: 'payment',
          link: '/VendorDashboard?tab=bookings_received',
          is_read: false
        });
      }
    } else if (isInvoice) {
      const refId = merchantTransactionId.split('-')[1];

      const { data: invoices } = await supabase
        .from('invoice')
        .select('id, membership_id, status')
        .ilike('id', `${refId}%`)
        .limit(1);

      const invoice = invoices && invoices[0];
      if (invoice && invoice.status !== 'paid') {
        await supabase
          .from('invoice')
          .update({ status: 'paid' })
          .eq('id', invoice.id);

        if (invoice.membership_id) {
          await supabase
            .from('membership')
            .update({ status: 'active' })
            .eq('id', invoice.membership_id);
        }
      }
    }

    return res.status(200).json({ received: true, status: 'processed' });

  } catch (error) {
    console.error('Erreur cinetpay-notify:', error);
    // On repond quand meme 200 pour eviter que CinetPay ne re-essaie en boucle sur une erreur
    // de notre cote ; l'erreur est loggee pour investigation manuelle.
    return res.status(200).json({ received: true, error: true });
  }
}
