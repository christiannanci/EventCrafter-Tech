// EVEN IA - conseiller autonome (sans modele de langage) : diagnostic + comprehension approximative.
// L'agent avec modele de langage est dans evenAgent.js.
import { norm, serviceScore, serviceVisibility, priceAdvice, fcfa } from "./evenEngine";
import { matchingLeads } from "./evenTasks";

const SEV = { high: 3, med: 2, low: 1 };

// ---------- Diagnostic autonome ----------
export async function diagnose(ctx) {
  const f = [];
  const sv = ctx.services || [], vp = ctx.vendorProfile || {};
  const add = (sev, title, detail, cmds = []) => f.push({ sev, title, detail, cmds });

  if (!sv.length) add("high", "Vous n'avez aucun service en ligne", "Sans service, les clients ne peuvent pas vous trouver ni vous reserver.", [{ label: "Creer mon premier service", send: "Creer un service" }]);

  for (const s of sv) {
    if (s.is_suspended) add("high", `« ${s.title} » est suspendu`, `${s.suspension_note ? "Motif : " + s.suspension_note + ". " : ""}Contactez le support pour le faire reexaminer.`);
    else if (s.is_hidden) add("med", `« ${s.title} » est masque`, "Il n'apparait pas dans la marketplace.", [{ label: `Reactiver ${s.title}`, send: `reactive ${s.title}` }]);
    const sc = serviceScore(s);
    if (!s.is_suspended && sc.score < 70) add("med", `« ${s.title} » est incomplet (${sc.score} %)`, `Il manque : ${sc.missing.join(", ")}. Les offres completes recoivent plus de demandes. Modifiez-le dans l'onglet Catalogue.`);
  }

  // Positionnement prix (compare aux offres visibles de la meme categorie)
  for (const s of sv.filter(x => !x.is_hidden && !x.is_suspended && x.price_min).slice(0, 3)) {
    const a = await priceAdvice(s, ctx);
    if (a.enough) {
      if (a.mine > a.median * 1.6) add("med", `« ${s.title} » est cher par rapport au marche`, `Votre prix ${fcfa(a.mine)} vs median ${fcfa(a.median)} (${a.n} offres). Un tarif d'entree plus proche attire plus de contacts.`, [{ label: `Prix min ${fcfa(a.median)}`, send: `mets le prix de ${s.title} a ${Math.round(a.median / 1000) * 1000}` }]);
      else if (a.mine < a.median * 0.5) add("low", `« ${s.title} » est tres bas`, `Votre prix ${fcfa(a.mine)} vs median ${fcfa(a.median)}. Vous pourriez vendre plus cher sans perdre de clients.`, [{ label: `Prix min ${fcfa(a.median * 0.8)}`, send: `mets le prix de ${s.title} a ${Math.round(a.median * 0.8 / 1000) * 1000}` }]);
    }
  }

  const leads = matchingLeads(ctx);
  if (leads.length) {
    const cmds = [{ label: "Voir mes prospects", send: "mes prospects" }];
    if ((vp.reward_credits || 0) > 0) cmds.push({ label: "Debloquer le lead 1 (1 credit)", send: "debloque le lead 1 avec un credit" });
    add(leads.length >= 3 ? "high" : "med", `${leads.length} demande(s) client ouverte(s) dans vos categories`, `${(vp.reward_credits || 0) > 0 ? `Vous avez ${vp.reward_credits} credit(s) reward a utiliser.` : "Repondre vite augmente vos chances."}`, cmds);
  }

  const b = ctx.bookings || [];
  const todo = b.filter(x => ["pending", "negotiating", "contract_pending"].includes(x.status));
  if (todo.length) add("high", `${todo.length} dossier(s) attendent votre action`, "Un client qui attend sans reponse va souvent chez un concurrent.", [{ label: "Voir mes dossiers", send: "mes dossiers" }]);
  if (b.some(x => x.status === "disputed")) add("high", "Un dossier est en litige", "Ouvrez-le depuis l'onglet Dossiers pour repondre.", [{ label: "Voir mes dossiers", send: "mes dossiers" }]);

  if (!vp.verification_status || vp.verification_status === "unverified" || vp.verification_status === "rejected") add("med", "Votre profil n'est pas verifie", "Un badge verifie rassure les clients. Envoyez vos documents depuis Parametres.");
  if (!vp.phone) add("low", "Telephone manquant sur votre profil", "Completez-le dans Parametres pour etre contacte plus facilement.");

  f.sort((a, b) => SEV[b.sev] - SEV[a.sev]);
  return f;
}

export function formatFindings(findings, max = 4) {
  if (!findings.length) return { text: "Tout est en ordre : services visibles, aucun dossier en attente, aucun probleme detecte. Bravo !", chips: [] };
  const top = findings.slice(0, max);
  const icon = { high: "🔴", med: "🟠", low: "🟡" };
  return {
    text: top.map(x => `${icon[x.sev]} **${x.title}**\n${x.detail}`).join("\n\n"),
    chips: top.flatMap(x => x.cmds).slice(0, 5),
    more: findings.length - top.length,
  };
}

// ---------- Comprehension approximative (fautes de frappe) ----------
const lev = (a, b) => { const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
const HINTS = [
  { label: "Creer un service", words: ["creer", "service", "offre", "ajouter", "publier"] },
  { label: "Mes services", words: ["services", "catalogue", "offres"] },
  { label: "Mes prospects", words: ["prospects", "leads", "demandes", "clients"] },
  { label: "Mes dossiers", words: ["dossiers", "reservations", "contrats", "commandes"] },
  { label: "Mon solde", words: ["solde", "portefeuille", "argent", "gains"] },
  { label: "Analyse mon activite", words: ["analyse", "conseils", "probleme", "solution", "ameliorer", "croissance"] },
];
export function guess(text) {
  const toks = norm(text).split(/[^a-z0-9]+/).filter(w => w.length > 3);
  const scored = HINTS.map(h => ({ label: h.label, s: toks.filter(t => h.words.some(w => w === t || (w.length > 4 && lev(w, t) <= 2))).length })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  return scored.slice(0, 3).map(x => x.label);
}
