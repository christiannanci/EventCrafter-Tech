// ============================================================================
// RÉGLAGES DE LA PHASE DE RECRUTEMENT (un seul fichier à modifier)
// ============================================================================

// true  = phase de recrutement : en bas de chaque article, deux boutons
//         (« Vous êtes prestataire ? » / « Vous organisez un événement ? »).
// false = lancement : retour au bloc « Trouver des prestataires ».
//         Aucun article à modifier.
export const RECRUITMENT_MODE = true;

// Adresses internes (routes du site)
export const ROUTES = {
  vendorSignup: '/Login',          // ouvre l'inscription ; le mode « register » est ajouté ci-dessous
  waitlist: '/liste-attente',
  marketplace: '/Marketplace',
  article: (n) => '/articles/article-' + String(n).padStart(2, '0'),
};

export const SITE_URL = 'https://www.eventcraftercm.com';
export const ASSETS = '/article-assets';

// Lien d'inscription prestataire avec les catégories de l'article (identifiants anglais stables)
export function vendorSignupUrl(categoryKeys = []) {
  const p = new URLSearchParams({ mode: 'register', role: 'vendor', source: 'article' });
  if (categoryKeys.length) p.set('categories', categoryKeys.join(','));
  return ROUTES.vendorSignup + '?' + p.toString();
}

export function waitlistUrl(articleNumber) {
  const p = new URLSearchParams({ source: 'article' });
  if (articleNumber) p.set('article', String(articleNumber).padStart(2, '0'));
  return ROUTES.waitlist + '?' + p.toString();
}

// Libellés français des catégories de prestataires (les clés anglaises sont les identifiants stables)
export const VENDOR_CATEGORY_LABELS_FR = {
  "Drinks Suppliers": "Fournisseurs de boissons",
  "Fabric & Pagne Sellers": "Vendeurs de pagnes et tissus",
  "Decorators": "Décorateurs",
  "Cultural Advisors": "Conseillers culturels",
  "Photographers": "Photographes",
  "Caterers": "Traiteurs",
  "Printing & Stationery": "Imprimerie et papeterie",
  "Drummers & Musicians": "Tambourinaires et musiciens",
  "Tents & Chairs Rental": "Location de bâches et chaises",
  "Tailors & Designers": "Couturiers et stylistes",
  "Sound & Lighting": "Sonorisation et éclairage",
  "Videographers": "Vidéastes",
  "Event Venues": "Salles de fête",
  "MCs": "Maîtres de cérémonie",
  "Tableware Rental": "Location de vaisselle",
  "Soya & Grill Stations": "Stands de soya et grillades",
  "Florists": "Fleuristes",
  "Artisans & Carvers": "Artisans et sculpteurs",
  "Event Planners": "Organisateurs d'événements",
  "Jewelry & Accessories": "Bijoux et accessoires",
  "Makeup & Hair": "Maquillage et coiffure",
  "Dance Troupes": "Troupes de danse",
  "Cake & Pastry": "Gâteaux et pâtisserie",
  "DJs & Musicians": "DJ et musiciens"
};

export const vendorCategoryLabel = (key, language = 'fr') =>
  language === 'fr' ? (VENDOR_CATEGORY_LABELS_FR[key] || key) : key;

// --- Mémorisation du parcours « prestataire » entre le lien et la création du profil ---
const LS_ROLE = 'ec_pending_role';
const LS_CATS = 'ec_vendor_categories';

// À appeler sur la page /Login : lit ?role=vendor&categories=… et les garde en mémoire.
export function captureRecruitmentParams(search) {
  try {
    const p = new URLSearchParams(search);
    if (p.get('role') !== 'vendor') return;
    localStorage.setItem(LS_ROLE, 'vendor');
    const cats = (p.get('categories') || '')
      .split(',').map((s) => s.trim())
      .filter((s) => Object.prototype.hasOwnProperty.call(VENDOR_CATEGORY_LABELS_FR, s));
    localStorage.setItem(LS_CATS, JSON.stringify(cats));
  } catch (e) { /* stockage indisponible : on continue sans */ }
}

export const getPendingRole = () => {
  try { return localStorage.getItem(LS_ROLE); } catch (e) { return null; }
};
export const getPendingCategories = () => {
  try { return JSON.parse(localStorage.getItem(LS_CATS) || '[]'); } catch (e) { return []; }
};
export const setPendingCategories = (cats) => {
  try { localStorage.setItem(LS_CATS, JSON.stringify(cats)); } catch (e) { /* ignore */ }
};
export const clearPending = () => {
  try { localStorage.removeItem(LS_ROLE); localStorage.removeItem(LS_CATS); } catch (e) { /* ignore */ }
};
