// Regle "3 photos minimum" (guide d'accueil des prestataires) :
// un service n'est affiche sur la marketplace que s'il a au moins 3 photos
// (image de couverture + galerie). Les services crees AVANT la date ci-dessous
// restent visibles pour ne pas vider la marketplace ; ils sont invites a ajouter des photos.
export const MIN_SERVICE_PHOTOS = 3;
export const MAX_SERVICE_PHOTOS = 8;
export const PHOTO_RULE_START = new Date("2026-11-26T00:00:00Z");

const isVideoUrl = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u || "") || String(u || "").includes("video");

// Liste ordonnee des photos : couverture d'abord, puis la galerie (sans doublons ni videos)
export function getServicePhotos(s) {
  const out = [];
  if (s?.image_url && !isVideoUrl(s.image_url)) out.push(s.image_url);
  const g = Array.isArray(s?.gallery_urls) ? s.gallery_urls : [];
  for (const u of g) if (u && !isVideoUrl(u) && !out.includes(u)) out.push(u);
  return out;
}

export const photoCount = (s) => getServicePhotos(s).length;
export const hasEnoughPhotos = (s) => photoCount(s) >= MIN_SERVICE_PHOTOS;

// Service cree avant l'entree en vigueur de la regle
export function isLegacyService(s) {
  const d = new Date(s?.created_date || s?.created_at || "");
  return !isNaN(d.getTime()) && d < PHOTO_RULE_START;
}

// Visible sur la marketplace du point de vue des photos
export const meetsPhotoRule = (s) => hasEnoughPhotos(s) || isLegacyService(s);

// Visible pour les clients : ni masque, ni suspendu, et regle des photos respectee
export const isServiceDisplayable = (s) => !!s && !s.is_hidden && !s.is_suspended && meetsPhotoRule(s);
