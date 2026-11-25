// EVEN IA - moteur autonome (regles, sans LLM). Cote vendeur.
// Utilise la session Supabase du vendeur : les regles RLS s'appliquent.
import { base44 } from "@/api/apiClient";
import { getServicePhotos, MIN_SERVICE_PHOTOS, meetsPhotoRule, isServiceDisplayable } from "@/lib/servicePhotos";
import { UploadFile } from "@/api/integrations";
import { generateEntityCode, generateSlug } from "@/components/SecurityUtils";
import { serviceSchema, validateData } from "@/components/ValidationSchemas";

export const norm = (s) => (s || "").toString().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const EVENT_TYPES = ["Wedding","Birthday","Corporate","Conference","Baby Shower","Graduation","Religious","Funeral","Concert","Other"];
const EVENT_ALIASES = {
  mariage: "Wedding", wedding: "Wedding", anniversaire: "Birthday", birthday: "Birthday",
  entreprise: "Corporate", corporate: "Corporate", conference: "Conference", seminaire: "Conference",
  "baby shower": "Baby Shower", bapteme: "Religious", religieux: "Religious", religious: "Religious",
  diplome: "Graduation", graduation: "Graduation", deuil: "Funeral", funerailles: "Funeral", obseques: "Funeral",
  concert: "Concert", autre: "Other", other: "Other",
};
const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR")} FCFA`;

// ---------- Intentions ----------
const INTENTS = [
  { id: "create_service", re: /(cree|creer|ajoute|ajouter|nouveau|publier|publie|lance).*(service|offre|prestation)|(service|offre).*(cree|creer|ajouter)/ },
  { id: "my_services", re: /(mes|liste|voir|affiche).*(service|offre|catalogue)|catalogue/ },
  { id: "service_check", re: /(complet|qualite|ameliorer|optimis|visible|marketplace|marche|pourquoi).*(service|annonce|offre|profil)?|service.*(visible|marche)/ },
  { id: "hide_service", re: /(masque|masquer|cache|cacher|desactive|desactiver|suspend|mets.*hors ligne)/ },
  { id: "show_service", re: /(reactive|reactiver|reaffiche|afficher.*service|remets.*en ligne)/ },
  { id: "leads", re: /prospect|lead|demande.*client|nouvelles demandes/ },
  { id: "bookings", re: /dossier|reservation|booking|commande|contrat/ },
  { id: "balance", re: /solde|portefeuille|wallet|argent|paiement|retrait|gain/ },
  { id: "profile", re: /profil|verifi|badge|entreprise.*nom|mon compte/ },
  { id: "advice", re: /analyse|diagnostic|probleme|que dois.?je|solution|conseille|aide.?moi|recommand/ },
  { id: "growth", re: /croissance|conseil|boost|augmenter|plus de clients|visibilite|statistique|stats/ },
  { id: "price", re: /prix|tarif|combien.*(faire payer|facturer)|position/ },
  { id: "help", re: /aide|help|que peux|quoi faire|capacite|fonction/ },
  { id: "greet", re: /^(salut|bonjour|bonsoir|hello|coucou|hi)\b/ },
];
export function detectIntent(text) {
  const t = norm(text);
  for (const i of INTENTS) if (i.re.test(t)) return i.id;
  return "unknown";
}

// ---------- Entites ----------
export function extractEntities(text) {
  const t = norm(text);
  const e = {};
  const price = t.match(/(\d[\d\s.]*)\s*(k|mille|fcfa|f cfa|francs|xaf)?/);
  if (price) {
    let n = parseInt(price[1].replace(/[\s.]/g, ""), 10);
    if (!isNaN(n)) {
      if (price[2] === "k" || price[2] === "mille") n *= 1000;
      e.number = n;
    }
  }
  for (const [k, v] of Object.entries(EVENT_ALIASES)) if (t.includes(k)) { e.eventType = v; break; }
  return e;
}

// ---------- Outils de LECTURE ----------
export async function loadContext(user) {
  const uid = user.id;
  const safe = async (p, d) => { try { return await p; } catch { return d; } };
  const [vp, services, bookings, serviceTypes] = await Promise.all([
    safe(base44.entities.VendorProfile.filter({ user_id: uid }), []),
    safe(base44.entities.Service.filter({ planner_id: uid }), []),
    safe(base44.entities.Booking.filter({ planner_id: uid }), []),
    safe(base44.entities.ServiceType.list(), []),
  ]);
  const leads = await safe(base44.entities.Lead.list("-created_date", 50), []);
  return { user, vendorProfile: vp[0] || null, services, bookings, leads, serviceTypes };
}

export function serviceVisibility(s) {
  const reasons = [];
  if (s.is_hidden) reasons.push("masque par vous");
  if (s.is_suspended) reasons.push("suspendu par l'administration");
  if (!s.title) reasons.push("titre manquant");
  if (!s.price_min) reasons.push("prix manquant");
  if (!s.city) reasons.push("ville manquante");
  if (!s.image_url) reasons.push("pas d'image (fortement recommande)");
  const photos = getServicePhotos(s).length;
  if (photos < MIN_SERVICE_PHOTOS) reasons.push(`moins de ${MIN_SERVICE_PHOTOS} photos (${photos}/${MIN_SERVICE_PHOTOS}) : ${meetsPhotoRule(s) ? "ajoutez-en pour rester visible" : "non affiche sur la marketplace"}`);
  return { visible: isServiceDisplayable(s), reasons };
}

export function serviceScore(s) {
  const checks = [
    [!!s.title, "titre"], [(s.description || "").length >= 80, "description (80+ caracteres)"],
    [!!s.description_details, "details des prestations"], [!!s.description_terms, "conditions"],
    [!!s.image_url, "image de couverture"], [!!s.video_url, "video"],
    [!!s.price_min, "prix"], [!!s.city, "ville"], [(s.supported_event_types || []).length > 0, "types d'evenements"],
  ];
  const ok = checks.filter(c => c[0]).length;
  return { score: Math.round((ok / checks.length) * 100), missing: checks.filter(c => !c[0]).map(c => c[1]) };
}

export function priceAdvice(service, ctx) {
  // compare aux autres services de la meme categorie visibles dans la marketplace
  return base44.entities.Service.filter({ category: service.category }).then(all => {
    const prices = all.filter(x => !x.is_hidden && !x.is_suspended && x.price_min && x.id !== service.id).map(x => Number(x.price_min)).sort((a, b) => a - b);
    if (prices.length < 3) return { enough: false, n: prices.length };
    const med = prices[Math.floor(prices.length / 2)];
    return { enough: true, n: prices.length, min: prices[0], max: prices[prices.length - 1], median: med, mine: Number(service.price_min) };
  }).catch(() => ({ enough: false, n: 0 }));
}

// ---------- Outils d'ECRITURE (toujours apres confirmation) ----------
export async function uploadMedia(file) {
  const r = await UploadFile({ file });
  return r.file_url;
}

export async function setServiceHidden(service, hidden) {
  if (service.is_suspended) throw new Error("Service suspendu par l'administration");
  return base44.entities.Service.update(service.id, { is_hidden: hidden });
}

export async function createServiceFromDraft(draft, user) {
  const v = validateData(serviceSchema, {
    title: draft.title, description: draft.description, category: draft.category,
    price_min: parseFloat(draft.price_min), availability_level: "ville",
    availability_code: draft.availability_code || (draft.city || "").slice(0, 3).toUpperCase(),
    city: draft.city, region: draft.region || "", neighborhood_code: draft.neighborhood_code || "",
    supported_event_types: draft.supported_event_types || [],
  });
  if (!v.success) throw new Error(Object.values(v.errors)[0]);
  const payload = {
    title: draft.title, description: draft.description,
    description_details: draft.description_details || "", description_terms: draft.description_terms || "", title_en: "", description_en: "", description_terms_en: "",
    category: draft.category, service_type_code: draft.service_type_code || "",
    function_codes: draft.function_codes || [], supported_event_types: draft.supported_event_types || [],
    price_min: parseFloat(draft.price_min), price_max: draft.price_max ? parseFloat(draft.price_max) : null, availability_level: "ville",
    availability_code: draft.availability_code || (draft.city || "").slice(0, 3).toUpperCase(),
    location: draft.city, city: draft.city, region: draft.region || "", neighborhood_code: draft.neighborhood_code || "",
    address_details: draft.address_details || "", image_url: draft.image_url || "", gallery_urls: [draft.gallery_1, draft.gallery_2].filter(Boolean), video_url: draft.video_url || "",
    cultural_zones: [], cultural_compliance_details: "", spoken_languages: [], religious_compatibility: [], diaspora_ready: false,
    service_code: generateEntityCode("SERVICE"), slug: generateSlug(draft.title), planner_id: user.id,
  };
  return base44.entities.Service.create(payload);
}

// Verifie que le service apparait bien comme le voit un client (relecture par id + regles de la marketplace)
export async function verifyInMarketplace(serviceId) {
  const s = await base44.entities.Service.get(serviceId);
  const v = serviceVisibility(s);
  return { service: s, visible: v.visible, reasons: v.reasons.filter(r => !r.includes("recommande")) };
}

// ---------- Formulaire de creation (memes champs que "Creer une Offre") ----------
const E_num = (v) => extractEntities(v).number;
export function buildServiceSteps(ctx) {
  const cats = (ctx.serviceTypes || []).map(t => t.name);
  return [
    { key: "title", ask: "Quel est le **titre** de votre service ? (ex. Organisation de Mariage de Luxe)", validate: v => (v.length >= 5 && v.length <= 100) || "Le titre doit faire entre 5 et 100 caracteres." },
    { key: "category", ask: "Dans quelle **categorie** ? Choisissez :", options: cats.length ? cats : ["Event Planner"],
      parse: (v, c) => (c || []).find(x => norm(x) === norm(v)) || (c || []).find(x => norm(x).includes(norm(v))) },
    { key: "supported_event_types", ask: "Pour quels **types d'evenements** ? (plusieurs possibles, ex. mariage, anniversaire)", multi: EVENT_TYPES,
      parse: v => { const t = norm(v); const out = new Set(); Object.entries(EVENT_ALIASES).forEach(([k, val]) => { if (t.includes(k)) out.add(val); }); return [...out]; } },
    { key: "price_min", ask: "Quel est votre **prix minimum en FCFA** ? (ex. 50000)", parse: v => { const e = extractEntities(v); return e.number; }, validate: v => (v >= 1000 && v <= 100000000) || "Prix minimum : 1 000 FCFA." },
    { key: "city", ask: "Dans quelle **ville** intervenez-vous ?", validate: v => v.length >= 2 || "Ville invalide." },
    { key: "price_max", ask: "Quel est votre **prix maximum en FCFA** ? (optionnel - ou 'passer')", optional: true, parse: v => E_num(v) },
    { key: "region", ask: "Quelle **region** ? (ex. Centre, Littoral) - ecrivez 'passer' si non applicable.", optional: true },
    { key: "neighborhood_code", ask: "Quel **quartier** principal ? (ou 'passer')", optional: true },
    { key: "description", ask: "Redigez la **description generale** de votre service (20 a 1000 caracteres).", validate: v => (v.length >= 20 && v.length <= 1000) || "La description doit faire entre 20 et 1000 caracteres." },
    { key: "description_details", ask: "Que comprennent vos **prestations** ? (max 1500 caracteres - ou 'passer')", optional: true, validate: v => v.length <= 1500 || "Maximum 1500 caracteres." },
    { key: "description_terms", ask: "Quelles sont vos **conditions** ? (max 800 caracteres - ou 'passer')", optional: true, validate: v => v.length <= 800 || "Maximum 800 caracteres." },
    { key: "image_url", ask: "Ajoutez votre **image de couverture** avec le bouton ci-dessous.", media: "image" },
    { key: "gallery_1", ask: "Ajoutez une **2e photo** de votre service (3 photos minimum pour etre affiche sur la marketplace).", media: "image" },
    { key: "gallery_2", ask: "Ajoutez une **3e photo** de votre service.", media: "image" },
    { key: "video_url", ask: "Ajoutez une **video de presentation** (optionnel).", media: "video", optional: true },
  ];
}

export function draftRecap(d) {
  return [
    `**${d.title}**`, `Categorie : ${d.category}`,
    `Evenements : ${(d.supported_event_types || []).join(", ") || "non precise"}`,
    `Prix : ${fcfa(d.price_min)}${d.price_max ? " a " + fcfa(d.price_max) : ""}`, `Lieu : ${d.city}${d.region ? ", " + d.region : ""}`,
    `Photos : ${[d.image_url, d.gallery_1, d.gallery_2].filter(Boolean).length}/3 - Video : ${d.video_url ? "oui" : "non"}`,
  ].join("\n");
}

export const FORBIDDEN = /(retire|retrait|virement|signe.*contrat|supprime.*compte|supprimer.*compte|mot de passe|change.*email|compte bancaire|valide.*paiement)/;
export { fcfa, EVENT_TYPES };
