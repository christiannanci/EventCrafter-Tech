// Helper partage entre les fonctions serverless CinetPay.
// Ne JAMAIS importer ce fichier depuis du code cote client (src/) - il utilise des secrets.

let cachedToken = null;
let cachedTokenExpiry = 0;

export async function getCinetpayAccessToken() {
  const now = Date.now();

  // Reutilise le jeton en cache s'il est encore valide (marge de securite de 60s)
  if (cachedToken && now < cachedTokenExpiry - 60000) {
    return cachedToken;
  }

  const baseUrl = process.env.CINETPAY_BASE_URL || 'https://api.cinetpay.net';

  const response = await fetch(`${baseUrl}/v1/oauth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.CINETPAY_API_KEY,
      api_password: process.env.CINETPAY_API_PASSWORD
    })
  });

  const data = await response.json();

  if (!response.ok || data.status !== 'OK' || !data.access_token) {
    throw new Error(`Echec de l'authentification CinetPay: ${JSON.stringify(data)}`);
  }

  cachedToken = data.access_token;
  cachedTokenExpiry = now + (data.expires_in || 3600) * 1000;

  return cachedToken;
}

export function getSupabaseAdminClient() {
  // Import dynamique pour eviter de charger @supabase/supabase-js si non necessaire
  return import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(
      process.env.SUPABASE_URL || process.env.URL_SUPABASE_VITE,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  );
}
