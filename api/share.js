// Page de partage d'un service : renvoie les balises Open Graph (titre, description, photo)
// lues par Facebook / WhatsApp, puis redirige les visiteurs vers la fiche du service.
// Utilisation : https://www.eventcraftercm.com/api/share?id=<id du service>
const SITE = process.env.SITE_URL || "https://www.eventcraftercm.com";
const FALLBACK_IMG = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  const valid = /^[A-Za-z0-9_-]{1,64}$/.test(id);
  const target = valid ? `${SITE}/ServiceDetails?id=${encodeURIComponent(id)}` : SITE;

  let title = "EventCrafter — Marketplace Événementiel Cameroun";
  let desc = "Trouvez les meilleurs prestataires pour votre mariage, anniversaire ou événement corporatif.";
  let image = FALLBACK_IMG;

  try {
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (valid && sbUrl && sbKey) {
      const r = await fetch(`${sbUrl}/rest/v1/service?id=eq.${encodeURIComponent(id)}&select=title,description,image_url,price_min,city`, {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      });
      if (r.ok) {
        const [svc] = await r.json();
        if (svc) {
          title = `${svc.title} | EventCrafter`;
          const price = svc.price_min ? `À partir de ${Number(svc.price_min).toLocaleString("fr-FR")} FCFA. ` : "";
          desc = (price + (svc.description || "")).replace(/\s+/g, " ").trim().slice(0, 200) || desc;
          const img = svc.image_url || "";
          if (/^https:\/\//.test(img) && !/\.(mp4|webm)(\?|$)/i.test(img)) image = img;
        }
      }
    }
  } catch { /* on garde les valeurs par defaut */ }

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="EventCrafter">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(`${SITE}/api/share?id=${id}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
</head><body><p><a href="${esc(target)}">${esc(title)}</a></p>
<script>location.replace(${JSON.stringify(target)})</script></body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).send(html);
}
