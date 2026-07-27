import { z } from 'zod';

/**
 * Schémas de validation Zod pour tous les formulaires de l'application
 * Prévient les données corrompues et améliore l'UX avec des messages d'erreur clairs
 */

// Service Schema
export const serviceSchema = z.object({
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères").max(100, "Maximum 100 caractères"),
  description: z.string().min(20, "La description doit contenir au moins 20 caractères").max(1000, "Maximum 1000 caractères"),
  category: z.string().min(1, "Catégorie requise"),
  price_min: z.number().min(1000, "Prix minimum: 1000 FCFA").max(100000000, "Prix trop élevé"),
  availability_level: z.enum(["continent", "country", "region", "departement", "ville", "arrondissement", "quartier"]),
  availability_code: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  neighborhood_code: z.string().optional(),
  supported_event_types: z.array(z.string()).min(1, "Sélectionnez au moins un type d'événement"),
});

// Booking/Negotiation Schema
export const negotiationSchema = z.object({
  unit_price: z.number().min(100, "Prix minimum: 100 FCFA").max(100000000, "Prix trop élevé"),
  quantity: z.number().min(1, "Quantité minimum: 1").max(10000, "Quantité trop élevée"),
  unit_measure: z.string().min(1, "Unité de mesure requise").max(50, "Maximum 50 caractères"),
  condition_1: z.string().max(200, "Maximum 200 caractères").optional(),
  condition_2: z.string().max(200, "Maximum 200 caractères").optional(),
  condition_3: z.string().max(200, "Maximum 200 caractères").optional(),
  condition_4: z.string().max(200, "Maximum 200 caractères").optional(),
  notes: z.string().max(500, "Maximum 500 caractères").optional(),
});

// Event Schema
export const eventSchema = z.object({
  title: z.string().min(3, "Nom minimum: 3 caractères").max(100, "Maximum 100 caractères"),
  event_type: z.enum(["Wedding", "Birthday", "Corporate", "Conference", "Baby Shower", "Graduation", "Religious", "Funeral", "Concert", "Other"]),
  start_date: z.string().min(1, "Date de début requise"),
  end_date: z.string().optional(),
  address: z.string().max(200, "Maximum 200 caractères").optional(),
  guest_count_expected: z.number().min(1).max(100000).optional(),
  budget_total: z.number().min(0).max(1000000000).optional(),
});

// Lead/Request Schema
export const leadSchema = z.object({
  event_type: z.enum(["Wedding", "Birthday", "Corporate", "Conference", "Baby Shower", "Graduation", "Religious", "Funeral", "Concert", "Other"]),
  service_category: z.string().min(1, "Catégorie de service requise"),
  event_date: z.string().optional(),
  location: z.string().min(2, "Lieu requis").max(100, "Maximum 100 caractères"),
  budget: z.string().max(100, "Maximum 100 caractères").optional(),
  description: z.string().min(10, "Description minimum: 10 caractères").max(1000, "Maximum 1000 caractères"),
});

// Vendor Profile Schema
export const vendorProfileSchema = z.object({
  business_name: z.string().min(2, "Nom minimum: 2 caractères").max(100, "Maximum 100 caractères"),
  description: z.string().max(1000, "Maximum 1000 caractères").optional(),
  phone: z.string().regex(/^[0-9]{9,15}$/, "Format de téléphone invalide (9-15 chiffres)"),
  city: z.string().min(2, "Ville requise").max(50, "Maximum 50 caractères").optional(),
  region: z.string().max(50, "Maximum 50 caractères").optional(),
  address_details: z.string().max(200, "Maximum 200 caractères").optional(),
});

// Client Profile Schema
export const clientProfileSchema = z.object({
  last_name: z.string().min(2, "Nom minimum: 2 caractères").max(50, "Maximum 50 caractères"),
  first_name: z.string().min(2, "Prénom minimum: 2 caractères").max(50, "Maximum 50 caractères"),
  phone: z.string().regex(/^[0-9]{9,15}$/, "Format de téléphone invalide (9-15 chiffres)"),
  city: z.string().max(50, "Maximum 50 caractères").optional(),
});

// Payment Schema
export const paymentSchema = z.object({
  phone: z.string().regex(/^[0-9]{9,15}$/, "Format de téléphone invalide (9-15 chiffres)").optional(),
  amount: z.number().min(100, "Montant minimum: 100 FCFA").max(100000000, "Montant trop élevé"),
  payment_method: z.enum(["mtn_momo", "orange_momo", "card", "paystack", "flutterwave", "stripe", "taptap"]),
});

// Review Schema
export const reviewSchema = z.object({
  rating: z.number().min(1, "Note minimum: 1").max(5, "Note maximum: 5"),
  comment: z.string().min(10, "Commentaire minimum: 10 caractères").max(500, "Maximum 500 caractères"),
});

/**
 * Helper pour valider et retourner les erreurs formatées
 */
export function validateData(schema, data) {
  try {
    schema.parse(data);
    return { success: true, errors: null };
  } catch (error) {
    const errors = {};
    error.errors.forEach(err => {
      errors[err.path[0]] = err.message;
    });
    return { success: false, errors };
  }
}