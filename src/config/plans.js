// Source unique des prix mensuels des abonnements (FCFA).
// Utilisee par la page Tarifs, la fenetre d'upsell des prospects et l'ecran admin.
export const PLAN_PRICES = {
  premium_monthly: 10000,
  gold_monthly: 25000,
};

// Mise en avant sur la page d'accueil : reservee au plan Gold (voir le guide d'accueil des prestataires)
export const PLAN_RANK = { gold: 1 };

// Prix de deblocage d'un prospect pour un prestataire en plan Basic (FCFA),
// conformes au guide d'accueil : 500 a 2 000 FCFA par client qui contacte le prestataire.
export const LEAD_PRICES_FCFA = { small: 500, medium: 1000, large: 2000 };
