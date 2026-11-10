// Vercel serverless : proxy securise vers le modele de langage pour EVEN IA.
// Variables d'environnement Vercel requises : ANTHROPIC_API_KEY
// (SUPABASE_URL / SUPABASE_ANON_KEY, ou VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Optionnel : EVEN_AI_MODEL
const hits = new Map(); // limite simple par utilisateur (best effort)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Methode non autorisee" });
  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(503).json({ error: "IA avancee non configuree" });

    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const sbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const sbAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !sbUrl || !sbAnon) return res.status(401).json({ error: "Non autorise" });
    const u = await fetch(`${sbUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: sbAnon } });
    if (!u.ok) return res.status(401).json({ error: "Session invalide" });
    const user = await u.json();

    const now = Date.now(), arr = (hits.get(user.id) || []).filter(t => now - t < 3600e3);
    if (arr.length >= 30) return res.status(429).json({ error: "Limite atteinte (30 messages par heure)" });
    arr.push(now); hits.set(user.id, arr);

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    let messages = (Array.isArray(body.messages) ? body.messages : []).slice(-10)
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) return res.status(400).json({ error: "Message vide" });
    const ctxJson = JSON.stringify(body.context || {}).slice(0, 6000);

    const system = `Tu es EVEN IA, l'assistant des prestataires de la marketplace evenementielle EventCrafter (Cameroun, prix en FCFA). Reponds en francais, de facon concrete, courte et chaleureuse. Raisonne a partir des DONNEES du vendeur ci-dessous ; n'invente aucune donnee absente et dis-le si une information manque. Propose des solutions precises et chiffrees quand c'est possible.
Tu ne peux EXECUTER aucune action toi-meme. Pour proposer une action, termine ta reponse par au maximum 3 lignes de la forme [[CMD: ...]] choisies UNIQUEMENT parmi ces modeles (remplace les <...> par des valeurs exactes des donnees) :
creer un service | mes services | mes prospects | mes dossiers | mon solde | masque <titre exact> | reactive <titre exact> | mets le prix de <titre exact> a <montant> | bloque du <jour> au <jour> <mois> <annee> | debloque le lead <n> avec un credit | ecris au client du lead <n>
Pour les paiements, retraits, contrats, comptes bancaires et mots de passe : renvoie le vendeur vers son tableau de bord, ne donne aucune procedure de contournement.
DONNEES DU VENDEUR : ${ctxJson}`;

    const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 25000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ac.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.EVEN_AI_MODEL || "claude-haiku-5-5", max_tokens: 700, system, messages }),
    });
    clearTimeout(to);
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: "IA indisponible pour le moment" });
    const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "Erreur serveur IA" });
  }
}
