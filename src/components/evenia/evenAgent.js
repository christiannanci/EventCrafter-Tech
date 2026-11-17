// EVEN IA - agent : le modele (via /api/even-ai) choisit des outils ; ils s'executent ICI, dans le navigateur,
// avec la session Supabase du vendeur (regles RLS appliquees). Lecture = automatique ; ecriture = apres confirmation.
import { base44, supabase } from "@/api/apiClient";
import { serviceSchema, validateData } from "@/components/ValidationSchemas";
import * as E from "./evenEngine";
import { matchingLeads } from "./evenTasks";

export const WRITE_TOOLS = ["update_service", "set_service_visibility", "block_dates", "free_dates", "unlock_lead", "message_client"];
export const READ_TOOLS = ["get_overview", "list_services", "check_service", "market_price", "list_leads", "list_bookings", "list_blocked_dates", "get_balance"];
export const DRAFT_TOOLS = ["propose_service_draft"];
export const ALL_TOOLS = [...READ_TOOLS, ...DRAFT_TOOLS, ...WRITE_TOOLS];

// ---------- utilitaires ----------
const clip = (s, n = 7000) => (s.length > n ? s.slice(0, n) + "...[tronque]" : s);
const str = (v, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v) => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/\s/g, "")); return Number.isFinite(n) ? n : null; };
const pd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtD = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
const eod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
const rangeLabel = (a, b) => (a.getTime() === b.getTime() ? fmtD(a) : `du ${fmtD(a)} au ${fmtD(b)}`);
const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const getService = (ctx, id) => (ctx.services || []).find(s => String(s.id) === String(id));
const noService = { error: "Service introuvable. Utilise list_services pour obtenir les identifiants." };
const getLead = (ctx, id) => matchingLeads(ctx).find(l => String(l.id) === String(id));
const noLead = { error: "Demande introuvable ou deja fermee. Utilise list_leads pour obtenir les identifiants." };

const publicService = (s) => {
  const sc = E.serviceScore(s), v = E.serviceVisibility(s);
  return { service_id: s.id, titre: s.title, categorie: s.category, prix_min: s.price_min, prix_max: s.price_max || null, ville: s.city, visible: v.visible, masque: !!s.is_hidden, suspendu: !!s.is_suspended, motif_suspension: s.suspension_note || undefined, qualite_pct: sc.score, manque: sc.missing, vues: s.views || 0 };
};

// ---------- preparation : valide, decrit, fournit run() ----------
// Retourne { error } | { kind:"read", run } | { kind:"draft", draft } | { kind:"write", label, run }
export function prepareTool(name, input, ctx, user) {
  const i = input && typeof input === "object" ? input : {};
  const uid = user.id;
  switch (name) {
    // ----- lecture -----
    case "get_overview": return { kind: "read", run: async () => {
      const vp = ctx.vendorProfile || {};
      const sv = ctx.services || [];
      return {
        entreprise: vp.business_name || null, plan: vp.plan || "free", verification: vp.verification_status || "unverified", credits_reward: vp.reward_credits || 0,
        services_total: sv.length, services_visibles: sv.filter(s => E.serviceVisibility(s).visible).length,
        demandes_ouvertes: matchingLeads(ctx).length,
        dossiers_par_statut: (ctx.bookings || []).reduce((a, b) => (a[b.status] = (a[b.status] || 0) + 1, a), {}),
        categories_disponibles: (ctx.serviceTypes || []).map(t => t.name), types_evenements: E.EVENT_TYPES,
      };
    } };
    case "list_services": return { kind: "read", run: async () => ({ services: (ctx.services || []).map(publicService) }) };
    case "check_service": { const s = getService(ctx, i.service_id); if (!s) return noService; return { kind: "read", run: async () => {
      const v = E.serviceVisibility(s), sc = E.serviceScore(s), a = await E.priceAdvice(s, ctx);
      return { ...publicService(s), raisons_non_visible: v.reasons.filter(r => !r.includes("recommande")), comparaison_prix: a.enough ? { offres_comparees: a.n, min: a.min, mediane: a.median, max: a.max, votre_prix: a.mine } : { info: "pas assez d'offres comparables (moins de 3)" }, a_ajouter: sc.missing };
    } }; }
    case "market_price": { const cat = str(i.category, 100); if (!cat) return { error: "Categorie manquante." }; return { kind: "read", run: async () => {
      const a = await E.priceAdvice({ category: cat, id: null }, ctx);
      return a.enough ? { categorie: cat, offres_comparees: a.n, min: a.min, mediane: a.median, max: a.max } : { categorie: cat, info: "pas assez d'offres comparables (moins de 3)" };
    } }; }
    case "list_leads": return { kind: "read", run: async () => {
      let unlocked = new Set();
      try { unlocked = new Set((await base44.entities.LeadUnlock.filter({ vendor_id: uid })).map(x => String(x.lead_id))); } catch {}
      return { credits_reward: ctx.vendorProfile?.reward_credits || 0, demandes: matchingLeads(ctx).slice(0, 15).map(l => ({ lead_id: l.id, evenement: l.event_type, categorie: l.service_category, lieu: l.location || null, budget: l.budget || null, budget_categorie: l.budget_category || null, debloquee: unlocked.has(String(l.id)) })) };
    } };
    case "list_bookings": return { kind: "read", run: async () => ({ dossiers: (ctx.bookings || []).slice(0, 30).map(b => ({ booking_id: b.id, statut: b.status, evenement: b.event_type || null, date: b.event_date ? String(b.event_date).slice(0, 10) : null, montant_fcfa: b.total_amount || null })) }) };
    case "list_blocked_dates": return { kind: "read", run: async () => {
      const t0 = today0();
      const slots = (await base44.entities.AvailabilitySlot.filter({ planner_id: uid })).filter(s => s.type === "blocked" && new Date(s.end_time) >= t0);
      return { periodes_bloquees: slots.slice(0, 40).map(s => ({ du: ymd(new Date(s.start_time)), au: ymd(new Date(s.end_time)) })) };
    } };
    case "get_balance": return { kind: "read", run: async () => ({ solde_disponible_fcfa: ctx.vendorProfile?.account_balance || 0, note: "Les retraits se font uniquement depuis l'onglet Paiement du tableau de bord." }) };

    // ----- brouillon de creation (affiche dans le chat, publie par le vendeur) -----
    case "propose_service_draft": {
      const cats = (ctx.serviceTypes || []).map(t => t.name);
      let category = str(i.category, 100);
      if (cats.length) {
        const n = E.norm(category);
        const hit = cats.find(c => E.norm(c) === n) || cats.find(c => n && (E.norm(c).includes(n) || n.includes(E.norm(c))));
        if (!hit) return { error: `Categorie invalide. Choisis parmi : ${cats.join(", ")}` };
        category = hit;
      }
      const types = [...new Set((Array.isArray(i.event_types) ? i.event_types : []).map(x => E.EVENT_TYPES.find(t => E.norm(t) === E.norm(String(x)))).filter(Boolean))];
      const city = str(i.city, 100), price_min = num(i.price_min), price_max = num(i.price_max);
      const draft = {
        title: str(i.title, 100), category, service_type_code: (ctx.serviceTypes || []).find(t => t.name === category)?.code_service || "",
        supported_event_types: types, price_min, price_max: price_max || "", city, region: str(i.region, 100), neighborhood_code: str(i.neighborhood, 100),
        description: str(i.description, 1000), description_details: str(i.description_details, 1500), description_terms: str(i.description_terms, 800),
      };
      const v = validateData(serviceSchema, {
        title: draft.title, description: draft.description, category: draft.category, price_min, availability_level: "ville",
        availability_code: city.slice(0, 3).toUpperCase(), city, region: draft.region, neighborhood_code: draft.neighborhood_code, supported_event_types: types,
      });
      if (!v.success) return { error: "Brouillon invalide : " + Object.values(v.errors)[0] };
      if (price_max && price_max < price_min) return { error: "Le prix maximum doit etre superieur au prix minimum." };
      return { kind: "draft", draft };
    }

    // ----- ecriture (confirmation du vendeur requise) -----
    case "update_service": {
      const s = getService(ctx, i.service_id); if (!s) return noService;
      if (s.is_suspended) return { error: `« ${s.title} » est suspendu par l'administration : modification impossible.` };
      const patch = {}, parts = [];
      if (i.title !== undefined) { const t = str(i.title, 100); if (t.length < 5) return { error: "Titre trop court (5 a 100 caracteres)." }; patch.title = t; parts.push(`titre « ${t} »`); }
      if (i.description !== undefined) { const d = str(i.description, 1000); if (d.length < 20) return { error: "Description trop courte (20 a 1000 caracteres)." }; patch.description = d; parts.push("nouvelle description"); }
      if (i.city !== undefined) { const c = str(i.city, 100); if (c.length < 2) return { error: "Ville invalide." }; patch.city = c; patch.location = c; parts.push(`ville ${c}`); }
      const pmin = i.price_min !== undefined ? num(i.price_min) : null, pmax = i.price_max !== undefined ? num(i.price_max) : null;
      if (i.price_min !== undefined) { if (pmin === null || pmin < 1000 || pmin > 100000000) return { error: "Prix minimum invalide (1 000 a 100 000 000 FCFA)." }; patch.price_min = pmin; parts.push(`prix min ${E.fcfa(s.price_min)} -> ${E.fcfa(pmin)}`); }
      if (i.price_max !== undefined) { if (pmax === null || pmax < 1000 || pmax > 100000000) return { error: "Prix maximum invalide." }; patch.price_max = pmax; parts.push(`prix max ${s.price_max ? E.fcfa(s.price_max) : "aucun"} -> ${E.fcfa(pmax)}`); }
      const fmin = patch.price_min ?? Number(s.price_min), fmax = patch.price_max ?? (s.price_max ? Number(s.price_max) : null);
      if (fmax && fmax < fmin) return { error: "Le prix maximum doit rester superieur au prix minimum." };
      if (!parts.length) return { error: "Aucune modification fournie." };
      return { kind: "write", label: `Modifier « ${s.title} » : ${parts.join(", ")}`, run: async () => {
        await base44.entities.Service.update(s.id, patch);
        return { summary: "Service mis à jour", data: { ok: true, service: s.title, modifications: Object.keys(patch) } };
      } };
    }
    case "set_service_visibility": {
      const s = getService(ctx, i.service_id); if (!s) return noService;
      if (s.is_suspended) return { error: `« ${s.title} » est suspendu par l'administration : impossible de changer sa visibilité.` };
      const hide = i.hidden === true;
      if (!!s.is_hidden === hide) return { error: `« ${s.title} » est déjà ${hide ? "masqué" : "visible"}.` };
      return { kind: "write", label: `${hide ? "Masquer" : "Réactiver"} « ${s.title} » dans la marketplace`, run: async () => {
        await base44.entities.Service.update(s.id, { is_hidden: hide });
        return { summary: hide ? "Service masqué" : "Service réactivé", data: { ok: true, service: s.title, masque: hide } };
      } };
    }
    case "block_dates": case "free_dates": {
      const a = pd(i.start_date), b = pd(i.end_date);
      if (!a || !b) return { error: "Dates invalides : utilise le format AAAA-MM-JJ." };
      if (b < a) return { error: "La date de fin est avant la date de début." };
      if (b < today0()) return { error: "Cette période est déjà passée." };
      if (name === "block_dates") return { kind: "write", label: `Bloquer le calendrier ${rangeLabel(a, b)}`, run: async () => {
        await base44.entities.AvailabilitySlot.create({ planner_id: uid, start_time: a.toISOString(), end_time: eod(b).toISOString(), type: "blocked", recurrence: "none" });
        return { summary: "Dates bloquées", data: { ok: true, du: ymd(a), au: ymd(b) } };
      } };
      return { kind: "write", label: `Libérer les dates ${rangeLabel(a, b)}`, run: async () => {
        const slots = await base44.entities.AvailabilitySlot.filter({ planner_id: uid });
        const hit = slots.filter(s => s.type === "blocked" && new Date(s.start_time) <= eod(b) && new Date(s.end_time) >= a);
        for (const s of hit) await base44.entities.AvailabilitySlot.delete(s.id);
        return { summary: hit.length ? `${hit.length} blocage(s) retiré(s)` : "Aucun blocage sur ces dates", data: { ok: true, retires: hit.length } };
      } };
    }
    case "unlock_lead": {
      const l = getLead(ctx, i.lead_id); if (!l) return noLead;
      if ((ctx.vendorProfile?.reward_credits || 0) < 1) return { error: "Aucun crédit reward disponible. Le déblocage par le portefeuille se fait depuis l'onglet Prospects." };
      return { kind: "write", label: `Débloquer la demande ${l.event_type} (${l.location || "lieu non précisé"}) avec 1 crédit reward`, run: async () => {
        const [vp] = await base44.entities.VendorProfile.filter({ user_id: uid });
        if (!vp || (vp.reward_credits || 0) < 1) throw new Error("Aucun crédit reward disponible");
        const done = await base44.entities.LeadUnlock.filter({ vendor_id: uid, lead_id: l.id });
        if (done.length) return { summary: "Déjà débloquée", data: { ok: true, deja_debloquee: true } };
        await base44.entities.VendorProfile.update(vp.id, { reward_credits: vp.reward_credits - 1 });
        await base44.entities.LeadUnlock.create({ vendor_id: uid, lead_id: l.id, unlock_type: "reward_credit", amount_paid: 0, unlocked_at: new Date().toISOString() });
        return { summary: `Débloquée (crédits restants : ${vp.reward_credits - 1})`, data: { ok: true, credits_restants: vp.reward_credits - 1 } };
      } };
    }
    case "message_client": {
      const l = getLead(ctx, i.lead_id); if (!l) return noLead;
      const text = str(i.message, 1000);
      if (text.length < 3) return { error: "Message trop court." };
      if (!l.client_id) return { error: "Client introuvable pour cette demande." };
      return { kind: "write", label: `Écrire au client de la demande ${l.event_type} : « ${text.length > 120 ? text.slice(0, 120) + "..." : text} »`, run: async () => {
        const unlocked = await base44.entities.LeadUnlock.filter({ vendor_id: uid, lead_id: l.id });
        if (!unlocked.length) throw new Error("Débloquez d'abord cette demande pour contacter le client");
        const convs = await base44.entities.Conversation.list("-created_date", 100);
        let conv = convs.find(c => (c.participants || []).includes(uid) && (c.participants || []).includes(l.client_id));
        const now = new Date().toISOString();
        if (!conv) conv = await base44.entities.Conversation.create({ participants: [String(uid), String(l.client_id)], last_message: text, last_message_at: now });
        await base44.entities.Message.create({ conversation_id: conv.id, sender_id: uid, content: text, read_status: "unread" });
        await base44.entities.Conversation.update(conv.id, { last_message: text, last_message_at: now });
        return { summary: "Message envoyé dans le Chat", data: { ok: true } };
      } };
    }
    default: return { error: "Outil inconnu." };
  }
}

// ---------- appel du serveur (flux SSE) ----------
export async function checkLLM() {
  try { const r = await fetch("/api/even-ai"); if (!r.ok) return false; const j = await r.json(); return j.configured === true; } catch { return false; }
}

async function streamTurn(messages, { onText, signal }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { const e = new Error("Session expirée, reconnectez-vous"); e.status = 401; throw e; }
  const r = await fetch("/api/even-ai", { method: "POST", signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ messages }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.error || "IA indisponible"); e.status = r.status; throw e; }
  const blocks = []; let cur = "", stop = null, got = false;
  const flush = () => { if (cur) { blocks.push({ type: "text", text: cur }); cur = ""; } };
  const handle = (ev) => {
    if (ev.t === "text") { cur += ev.d; onText?.(ev.d); }
    else if (ev.t === "tool") { flush(); blocks.push({ type: "tool_use", id: ev.id, name: ev.name, input: ev.input || {} }); }
    else if (ev.t === "done") { stop = ev.stop; got = true; }
    else if (ev.t === "error") { const e = new Error(ev.m || "Erreur IA"); e.status = 502; throw e; }
  };
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("event-stream")) { // ancien serveur : reponse JSON simple
    const j = await r.json().catch(() => ({})); if (j.text) { cur = j.text; onText?.(j.text); } flush(); return { blocks, stop: "end_turn" };
  }
  const reader = r.body.getReader(), dec = new TextDecoder(); let buf = "";
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let k; while ((k = buf.indexOf("\n\n")) >= 0) {
      const raw = buf.slice(0, k); buf = buf.slice(k + 2);
      const line = raw.split("\n").find(l => l.startsWith("data:")); if (!line) continue;
      let ev; try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
      handle(ev);
    }
  }
  flush();
  if (!got) { const e = new Error("Connexion interrompue"); e.status = 502; throw e; }
  return { blocks, stop };
}

// ---------- boucle agent ----------
// callbacks : onTurnStart, onText(delta), onTurnEnd, confirm(labels) -> Promise<boolean>, progress(index, patch)
// Retourne { messages, draft, truncated }. Lance une erreur (le tour est alors a ignorer) si le serveur echoue.
export async function runAgent({ messages, user, callbacks = {}, signal, maxSteps = 6 }) {
  const msgs = [...messages];
  let draft = null;
  for (let step = 0; step < maxSteps; step++) {
    callbacks.onTurnStart?.();
    const { blocks, stop } = await streamTurn(msgs, { onText: callbacks.onText, signal });
    callbacks.onTurnEnd?.();
    msgs.push({ role: "assistant", content: blocks.length ? blocks : [{ type: "text", text: "(pas de réponse)" }] });
    const uses = blocks.filter(b => b.type === "tool_use");
    if (stop !== "tool_use" || !uses.length) return { messages: msgs, draft };

    const ctx = await E.loadContext(user);
    const prepared = uses.map(u => ({ u, p: prepareTool(u.name, u.input, ctx, user) }));
    const writes = prepared.filter(x => x.p.kind === "write");
    const approved = writes.length ? await callbacks.confirm?.(writes.map(x => x.p.label)) === true : false;

    const results = []; let wi = 0;
    const res = (id, content, isError = false) => results.push({ type: "tool_result", tool_use_id: id, content: clip(typeof content === "string" ? content : JSON.stringify(content)), ...(isError ? { is_error: true } : {}) });
    for (const { u, p } of prepared) {
      if (p.error) { res(u.id, p.error, true); continue; }
      if (p.kind === "write") {
        const idx = wi++;
        if (!approved) { callbacks.progress?.(idx, { status: "refused" }); res(u.id, "refuse_par_utilisateur : action non exécutée"); continue; }
        callbacks.progress?.(idx, { status: "running" });
        try { const out = await p.run(); callbacks.progress?.(idx, { status: "done", result: out.summary }); res(u.id, out.data ?? { ok: true }); }
        catch (e) { callbacks.progress?.(idx, { status: "error", error: e.message || "échec" }); res(u.id, "erreur : " + (e.message || "échec"), true); }
        continue;
      }
      if (p.kind === "draft") { draft = p.draft; res(u.id, "Brouillon affiché au vendeur. Il doit maintenant ajouter l'image puis confirmer la publication. Ne rappelle pas cet outil ; invite-le simplement à terminer."); continue; }
      try { res(u.id, await p.run()); } catch (e) { res(u.id, "erreur : " + (e.message || "lecture impossible"), true); }
    }
    msgs.push({ role: "user", content: results });
    if (draft) { // le reste se passe dans l'interface (image + confirmation) : un dernier tour pour la phrase d'accompagnement
      callbacks.onTurnStart?.();
      const last = await streamTurn(msgs, { onText: callbacks.onText, signal });
      callbacks.onTurnEnd?.();
      msgs.push({ role: "assistant", content: last.blocks.filter(b => b.type === "text").length ? last.blocks.filter(b => b.type === "text") : [{ type: "text", text: "Brouillon prêt." }] });
      return { messages: msgs, draft };
    }
  }
  msgs.push({ role: "assistant", content: [{ type: "text", text: "J'ai atteint la limite d'étapes pour cette demande." }] });
  return { messages: msgs, draft, truncated: true };
}

// garde les derniers messages en commencant par un message utilisateur texte
export function trimHistory(msgs, n = 30) {
  const a = msgs.slice(-n);
  while (a.length && !(a[0].role === "user" && typeof a[0].content === "string")) a.shift();
  return a;
}
