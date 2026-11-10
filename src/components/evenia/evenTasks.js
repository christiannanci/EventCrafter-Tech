// EVEN IA - planificateur multi-etapes (regles, sans LLM).
// Transforme une demande en liste d'actions, executee apres UNE confirmation.
import { base44 } from "@/api/apiClient";
import { norm, extractEntities, fcfa } from "./evenEngine";

const MONTHS = { janvier:0, fevrier:1, mars:2, avril:3, mai:4, juin:5, juillet:6, aout:7, septembre:8, octobre:9, novembre:10, decembre:11 };
const VERBS = "masque|masquer|cache|cacher|reactive|reactiver|affiche|bloque|bloquer|libere|liberer|debloque|debloquer|ecris|ecrire|envoie|mets|met|change|modifie|modifier";
const SPLIT = new RegExp("\\s*;\\s*|\\s+(?:puis|ensuite|apres)\\s+|\\s+et\\s+(?=(?:" + VERBS + ")\\b)");

// ---------- Dates ----------
function mkDate(d, m, y) {
  const now = new Date();
  let year = y ? parseInt(y, 10) : now.getFullYear();
  if (year < 100) year += 2000;
  let dt = new Date(year, m, parseInt(d, 10), 0, 0, 0);
  if (!y && dt < new Date(now.getFullYear(), now.getMonth(), now.getDate())) dt = new Date(year + 1, m, parseInt(d, 10), 0, 0, 0);
  return dt;
}
export function parseDateRange(text) {
  const t = norm(text);
  const mo = Object.keys(MONTHS).join("|");
  let m = t.match(new RegExp("du (\\d{1,2})(?:er)? (" + mo + ")?\\s*(\\d{4})? ?au (\\d{1,2})(?:er)? (" + mo + ")\\s*(\\d{4})?"));
  if (m) {
    const em = MONTHS[m[5]], sm = m[2] ? MONTHS[m[2]] : em, y = m[6] || m[3];
    return { start: mkDate(m[1], sm, y), end: mkDate(m[4], em, y) };
  }
  m = t.match(/du (\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))? au (\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) return { start: mkDate(m[1], +m[2] - 1, m[3] || m[6]), end: mkDate(m[4], +m[5] - 1, m[6] || m[3]) };
  m = t.match(new RegExp("(\\d{1,2})(?:er)? (" + mo + ")\\s*(\\d{4})?"));
  if (m) { const d = mkDate(m[1], MONTHS[m[2]], m[3]); return { start: d, end: d }; }
  m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) { const d = mkDate(m[1], +m[2] - 1, m[3]); return { start: d, end: d }; }
  return null;
}
const fmtD = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
const rangeLabel = (r) => r.start.getTime() === r.end.getTime() ? fmtD(r.start) : `du ${fmtD(r.start)} au ${fmtD(r.end)}`;

// ---------- Utilitaires ----------
export function matchingLeads(ctx) {
  const cats = new Set((ctx.services || []).map(s => norm(s.category)));
  const all = ctx.leads || [];
  const m = all.filter(l => l.status === "open" && (norm(l.service_category) === "all" || cats.has(norm(l.service_category))));
  return m.length ? m : all.filter(l => l.status === "open");
}
function findServices(text, services) {
  const t = norm(text);
  if (/\btous\b|\btoutes\b/.test(t)) return { list: services, bulk: true };
  const hits = services.filter(s => t.includes(norm(s.title)));
  if (hits.length) return { list: hits };
  if (services.length === 1) return { list: services };
  return { list: [], ambiguous: true };
}
const leadByNumber = (text, ctx) => { const m = norm(text).match(/lead\s*(?:n[o°]?\s*)?(\d+)|demande\s*(?:n[o°]?\s*)?(\d+)|prospect\s*(?:n[o°]?\s*)?(\d+)/); const n = m && parseInt(m[1] || m[2] || m[3], 10); const l = matchingLeads(ctx); return n && l[n - 1] ? l[n - 1] : null; };

// ---------- Analyse d'une clause ----------
function parseClause(raw, ctx) {
  const t = norm(raw);
  const uid = ctx.user.id;

  // Agenda : bloquer / liberer des dates
  if (/\b(bloque|bloquer|indisponible)\b/.test(t) || /\b(libere|liberer|disponible)\b/.test(t) && /(date|jour|\d)/.test(t)) {
    const r = parseDateRange(raw);
    if (!r) return { error: "Precisez la date, par exemple : « bloque du 10 au 12 decembre »." };
    if (r.end < r.start) return { error: "La date de fin est avant la date de debut." };
    if (/\b(libere|liberer|disponible)\b/.test(t) && !/\b(bloque|bloquer)\b/.test(t)) {
      return { label: `Liberer les dates ${rangeLabel(r)}`, run: async () => {
        const slots = await base44.entities.AvailabilitySlot.filter({ planner_id: uid });
        const hit = slots.filter(s => s.type === "blocked" && new Date(s.start_time) <= endOfDay(r.end) && new Date(s.end_time) >= r.start);
        for (const s of hit) await base44.entities.AvailabilitySlot.delete(s.id);
        return hit.length ? `${hit.length} blocage(s) retire(s)` : "Aucun blocage sur ces dates";
      } };
    }
    return { label: `Bloquer les dates ${rangeLabel(r)}`, run: async () => {
      await base44.entities.AvailabilitySlot.create({ planner_id: uid, start_time: r.start.toISOString(), end_time: endOfDay(r.end).toISOString(), type: "blocked", recurrence: "none" });
      return "Dates bloquees dans votre calendrier";
    } };
  }

  // Prospects : debloquer avec un credit reward (jamais avec le portefeuille)
  if (/\bdebloque|\bdebloquer/.test(t)) {
    const lead = leadByNumber(raw, ctx);
    if (!lead) return { error: "Quel lead ? Dites par exemple « debloque le lead 2 avec un credit » (voir la liste via « mes prospects »)." };
    if (!/credit|reward/.test(t)) return { error: "Je ne debloque un lead qu'avec un credit reward. Pour payer avec le portefeuille, utilisez l'onglet Prospects." };
    return { label: `Debloquer le lead ${lead.event_type} (${lead.location || "lieu non precise"}) avec 1 credit`, run: async () => {
      const vp = ctx.vendorProfile; if (!vp) throw new Error("Profil vendeur introuvable");
      if ((vp.reward_credits || 0) < 1) throw new Error("Aucun credit reward disponible");
      const done = await base44.entities.LeadUnlock.filter({ vendor_id: uid, lead_id: lead.id });
      if (done.length) return "Ce lead est deja debloque";
      await base44.entities.VendorProfile.update(vp.id, { reward_credits: vp.reward_credits - 1 });
      await base44.entities.LeadUnlock.create({ vendor_id: uid, lead_id: lead.id, unlock_type: "reward_credit", amount_paid: 0, unlocked_at: new Date().toISOString() });
      return `Lead debloque (credits restants : ${vp.reward_credits - 1})`;
    } };
  }

  // Prospects : ecrire au client
  if (/\b(ecris|ecrire|envoie|envoyer|contacte|contacter)\b/.test(t) && /(client|lead|demande|prospect)/.test(t)) {
    const lead = leadByNumber(raw, ctx);
    if (!lead) return { error: "Quel lead ? Par exemple « ecris au client du lead 1 »." };
    const colon = raw.indexOf(":");
    const bn = ctx.vendorProfile?.business_name || "votre prestataire";
    const text = colon > -1 && raw.slice(colon + 1).trim().length > 3 ? raw.slice(colon + 1).trim()
      : `Bonjour, ici ${bn}. J'ai bien pris connaissance de votre demande (${lead.event_type}${lead.location ? " a " + lead.location : ""}). Je suis disponible pour en discuter : pouvez-vous me donner quelques details supplementaires ?`;
    return { label: `Ecrire au client du lead ${lead.event_type} : « ${text.slice(0, 70)}${text.length > 70 ? "..." : ""} »`, run: async () => {
      const unlocked = await base44.entities.LeadUnlock.filter({ vendor_id: uid, lead_id: lead.id });
      if (!unlocked.length) throw new Error("Debloquez d'abord ce lead pour contacter le client");
      if (!lead.client_id) throw new Error("Client introuvable pour ce lead");
      const convs = await base44.entities.Conversation.list("-created_date", 100);
      let conv = convs.find(c => (c.participants || []).includes(uid) && (c.participants || []).includes(lead.client_id));
      if (!conv) conv = await base44.entities.Conversation.create({ participants: [String(uid), String(lead.client_id)], last_message: text, last_message_at: new Date().toISOString() });
      await base44.entities.Message.create({ conversation_id: conv.id, sender_id: uid, content: text, read_status: "unread" });
      await base44.entities.Conversation.update(conv.id, { last_message: text, last_message_at: new Date().toISOString() });
      return "Message envoye dans le Chat";
    } };
  }

  // Catalogue : modifier prix / description
  if (/\b(mets|met|change|modifie|modifier|baisse|augmente)\b/.test(t) && /(prix|tarif|description)/.test(t)) {
    const f = findServices(raw, ctx.services);
    if (f.bulk) return { error: "Je modifie un service a la fois. Precisez lequel." };
    if (!f.list.length) return { error: "Quel service ? Citez son titre." };
    const s = f.list[0];
    if (s.is_suspended) return { error: `« ${s.title} » est suspendu par l'administration : je ne peux pas le modifier.` };
    if (/description/.test(t)) {
      const i = raw.indexOf(":"); const d = i > -1 ? raw.slice(i + 1).trim() : "";
      if (d.length < 20 || d.length > 1000) return { error: "Ecrivez la nouvelle description apres « : » (20 a 1000 caracteres)." };
      return { label: `Nouvelle description pour « ${s.title} »`, run: async () => { await base44.entities.Service.update(s.id, { description: d }); return "Description mise a jour"; } };
    }
    const rest = norm(raw).replace(norm(s.title), " ");
    const n = extractEntities(rest).number;
    const isMax = /\bmax(imum)?\b/.test(t);
    if (!n || n < 1000 || n > 100000000) return { error: "Indiquez un prix valide entre 1 000 et 100 000 000 FCFA." };
    if (isMax && n < Number(s.price_min)) return { error: "Le prix maximum doit etre superieur au prix minimum." };
    if (!isMax && s.price_max && n > Number(s.price_max)) return { error: "Le prix minimum depasse votre prix maximum actuel." };
    const field = isMax ? "price_max" : "price_min";
    return { label: `${isMax ? "Prix maximum" : "Prix minimum"} de « ${s.title} » : ${fcfa(s[field])} -> ${fcfa(n)}`, run: async () => { await base44.entities.Service.update(s.id, { [field]: n }); return "Prix mis a jour"; } };
  }

  // Catalogue : masquer / reactiver (un ou tous)
  if (/\b(masque|masquer|cache|cacher|reactive|reactiver|affiche|afficher)\b/.test(t) && /(service|offre|tous|toutes|\w)/.test(t) && ctx.services.some(s => t.includes(norm(s.title))) || /\b(masque|masquer|reactive|reactiver)\b.*\b(tous|toutes)\b/.test(t)) {
    const hide = /\b(masque|masquer|cache|cacher)\b/.test(t);
    const f = findServices(raw, ctx.services);
    const targets = f.list.filter(s => !s.is_suspended && !!s.is_hidden !== hide);
    if (!f.list.length) return { error: "Quel service ? Citez son titre ou dites « tous mes services »." };
    if (!targets.length) return { error: `Rien a faire : ${f.list.length > 1 ? "ces services sont" : "ce service est"} deja ${hide ? "masque(s)" : "visible(s)"} ou suspendu(s).` };
    return { label: `${hide ? "Masquer" : "Reactiver"} : ${targets.map(s => s.title).join(", ")}`, run: async () => {
      for (const s of targets) await base44.entities.Service.update(s.id, { is_hidden: hide });
      return `${targets.length} service(s) ${hide ? "masque(s)" : "reactive(s)"}`;
    } };
  }
  return null;
}

// ---------- Plan ----------
// Retourne null (pas une tache d'ecriture) ou { actions:[{label,run}], errors:[] }
export function buildPlan(text, ctx) {
  const parts = text.split(SPLIT).map(s => s.trim()).filter(Boolean);
  const actions = [], errors = [];
  for (const p of parts) {
    const a = parseClause(p, ctx);
    if (!a) continue;
    if (a.error) errors.push(a.error); else actions.push(a);
  }
  if (!actions.length && !errors.length) return null;
  return { actions, errors };
}

// ---------- Lecture : dossiers ----------
const WAITING = { pending: "en attente de votre reponse", negotiating: "en negociation", offer_submitted: "offre envoyee", contract_pending: "contrat a signer", awaiting_payment: "en attente de paiement client", in_progress: "en cours", confirmed: "confirme", completed: "termine", disputed: "en litige" };
export function summarizeBookings(ctx) {
  const b = ctx.bookings || [];
  if (!b.length) return "Aucun dossier pour le moment.";
  const todo = b.filter(x => ["pending", "negotiating", "contract_pending"].includes(x.status));
  const lines = Object.entries(b.reduce((a, x) => (a[x.status] = (a[x.status] || 0) + 1, a), {})).map(([k, v]) => `• ${WAITING[k] || k} : ${v}`);
  let out = "Vos dossiers :\n" + lines.join("\n");
  if (todo.length) out += `\n\n⚠ ${todo.length} dossier(s) demandent votre action :\n` + todo.slice(0, 5).map(x => `• ${x.client_name || "Client"} - ${x.event_type || ""} ${x.event_date ? "le " + new Date(x.event_date).toLocaleDateString("fr-FR") : ""} (${WAITING[x.status]})`).join("\n") + "\nOuvrez l'onglet Dossiers pour traiter (je ne signe pas et ne valide pas de paiement).";
  const disputed = b.filter(x => x.status === "disputed").length;
  if (disputed) out += `\n🚩 ${disputed} dossier(s) en litige.`;
  return out;
}
export function listLeads(ctx) {
  const l = matchingLeads(ctx);
  if (!l.length) return "Aucune demande ouverte pour le moment.";
  return "Demandes ouvertes (utilisez le numero) :\n" + l.slice(0, 10).map((x, i) => `${i + 1}. ${x.event_type} - ${x.service_category} - ${x.location || "lieu ?"} - budget ${x.budget || "?"}`).join("\n") + "\n\nExemples : « debloque le lead 1 avec un credit », « ecris au client du lead 1 ».";
}
