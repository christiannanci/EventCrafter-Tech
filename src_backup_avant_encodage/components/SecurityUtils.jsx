/**
 * Utilitaires de sécurité pour masquer les IDs réels
 * Génère des codes uniques pour éviter l'exposition des IDs séquentiels
 */

/**
 * Génère un code unique aléatoire
 * Format: PREFIX-XXXXXX (ex: SRV-A3F9K2)
 */
export function generateUniqueCode(prefix = "CODE") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sans I, O, 0, 1 pour éviter confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

/**
 * Génère un slug unique basé sur un texte
 * Ex: "Mon Super Service" -> "mon-super-service-a3f9k2"
 */
export function generateSlug(text, addRandomSuffix = true) {
  let slug = text
    .toLowerCase()
    .normalize("NFD") // Décompose les accents
    .replace(/[\u0300-\u036f]/g, "") // Retire les accents
    .replace(/[^a-z0-9]+/g, "-") // Remplace caractères spéciaux par -
    .replace(/^-+|-+$/g, ""); // Retire - au début/fin
  
  if (addRandomSuffix) {
    const suffix = Math.random().toString(36).substring(2, 8);
    slug = `${slug}-${suffix}`;
  }
  
  return slug;
}

/**
 * Génère un UUID v4 simplifié (sans tirets pour URL)
 */
export function generateShortUUID() {
  return 'xxxxxxxxxxxxxxxx'.replace(/x/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

/**
 * Hash un ID pour le masquer (unidirectionnel)
 */
export function hashId(id, salt = "EventCrafter2026") {
  const str = `${id}-${salt}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

/**
 * Codes préfixés par type d'entité
 */
export const CODE_PREFIXES = {
  SERVICE: "SRV",
  BOOKING: "BKG",
  EVENT: "EVT",
  INVOICE: "INV",
  CONTRACT: "CTR",
  DISPUTE: "DSP",
  RECEIPT: "RCP",
  LEAD: "LED",
  REVIEW: "REV",
  TRANSACTION: "TXN",
  MEMBERSHIP: "MBR"
};

/**
 * Génère un code unique pour une entité spécifique
 */
export function generateEntityCode(entityType) {
  const prefix = CODE_PREFIXES[entityType.toUpperCase()] || "CODE";
  return generateUniqueCode(prefix);
}

/**
 * Vérifie si un code est valide (format PREFIX-XXXXXX)
 */
export function isValidCode(code) {
  return /^[A-Z]{3}-[A-Z0-9]{6}$/.test(code);
}

/**
 * Masque un email pour l'affichage public
 * Ex: john.doe@gmail.com -> j***@gmail.com
 */
export function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local}@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 5))}@${domain}`;
}

/**
 * Masque un numéro de téléphone
 * Ex: 670123456 -> 670***456
 */
export function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone;
  const start = phone.substring(0, 3);
  const end = phone.substring(phone.length - 3);
  return `${start}***${end}`;
}