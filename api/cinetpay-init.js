import { getCinetpayAccessToken } from './_cinetpay-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  try {
    const {
      amount,
      currency = 'XAF',
      description,
      client_email,
      client_first_name,
      client_last_name,
      client_phone_number,
      booking_id,
      invoice_id
    } = req.body || {};

    if (!amount || !client_email || !client_first_name || !client_last_name) {
      return res.status(400).json({ error: 'Champs requis manquants (amount, client_email, client_first_name, client_last_name)' });
    }

    // On encode le type et l'id dans le merchant_transaction_id (limite 30 caracteres)
    // pour que le webhook sache quoi mettre a jour, sans avoir a interroger une base de correspondance.
    const prefix = booking_id ? 'BK' : 'INV';
    const refId = String(booking_id || invoice_id || '').replace(/-/g, '').slice(0, 20);
    const shortTimestamp = Date.now().toString().slice(-6);
    const merchantTransactionId = `${prefix}-${refId}-${shortTimestamp}`.slice(0, 30);

    const siteUrl = process.env.SITE_URL || 'https://www.eventcraftercm.com';
    const baseUrl = process.env.CINETPAY_BASE_URL || 'https://api.cinetpay.net';

    const accessToken = await getCinetpayAccessToken();

    const paymentBody = {
      currency,
      merchant_transaction_id: merchantTransactionId,
      amount: Math.round(Number(amount)),
      lang: 'fr',
      designation: description || 'Paiement EventCrafter',
      client_email,
      client_first_name,
      client_last_name,
      success_url: `${siteUrl}/PaymentReturn?status=success&tx=${merchantTransactionId}`,
      failed_url: `${siteUrl}/PaymentReturn?status=failed&tx=${merchantTransactionId}`,
      notify_url: `${siteUrl}/api/cinetpay-notify`
    };

    if (client_phone_number) {
      paymentBody.client_phone_number = client_phone_number;
    }

    const response = await fetch(`${baseUrl}/v1/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(paymentBody)
    });

    const data = await response.json();

    if (!response.ok || data.status !== 'OK' || !data.payment_url) {
      console.error('Echec initialisation CinetPay:', data);
      return res.status(422).json({ error: 'Impossible d\'initialiser le paiement', details: data });
    }

    return res.status(200).json({
      payment_url: data.payment_url,
      transaction_id: data.transaction_id,
      merchant_transaction_id: merchantTransactionId
    });

  } catch (error) {
    console.error('Erreur cinetpay-init:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'initialisation du paiement' });
  }
}
