// src/api/apiClient.js
// Couche de compatibilité : reproduit l'interface base44.entities.Query.<Entity>
// et base44.auth.* mais utilise Supabase en arrière-plan.

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function createEntityQuery(table) {
  return {
    list: async (sort) => {
      let query = supabase.from(table).select('*');
      if (sort) {
        const desc = sort.startsWith('-');
        query = query.order(desc ? sort.slice(1) : sort, { ascending: !desc });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    filter: async (filters = {}, sort) => {
      let query = supabase.from(table).select('*');
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      if (sort) {
        const desc = sort.startsWith('-');
        query = query.order(desc ? sort.slice(1) : sort, { ascending: !desc });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    get: async (id) => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    create: async (payload) => {
      const { data: { user } } = await supabase.auth.getUser();
      const enrichedPayload = {
        id: payload.id || crypto.randomUUID(),
        created_by_id: user?.id || null,
        created_by: user?.email || null,
        ...payload,
      };
      const { data, error } = await supabase.from(table).insert(enrichedPayload).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, payload) => {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

// Map complete des 55 entites Base44 -> tables Supabase
const ENTITY_TABLE_MAP = {
  User: 'app_user',
  Service: 'service',
  ServiceType: 'service_type',
  Fonction: 'fonction',
  Booking: 'booking',
  Contract: 'contract',
  ServiceReception: 'service_reception',
  Receipt: 'receipt',
  Invoice: 'invoice',
  Transaction: 'transaction',
  ProviderPayout: 'provider_payout',
  ClientRefund: 'client_refund',
  PaymentProof: 'payment_proof',
  Dispute: 'dispute',
  NegotiationLog: 'negotiation_log',
  Event: 'event',
  BudgetItem: 'budget_item',
  Guest: 'guest',
  Inspiration: 'inspiration',
  VendorProfile: 'vendor_profile',
  ClientProfile: 'client_profile',
  VendorBankAccount: 'vendor_bank_account',
  ClientBankAccount: 'client_bank_account',
  Lead: 'lead',
  LeadUnlock: 'lead_unlock',
  LeadPricingConfig: 'lead_pricing_config',
  LeadPackConfig: 'lead_pack_config',
  VendorLeadPack: 'vendor_lead_pack',
  RewardConfig: 'reward_config',
  LeadRefundRequest: 'lead_refund_request',
  RefundPolicyConfig: 'refund_policy_config',
  GiftDistribution: 'gift_distribution',
  GiftUsage: 'gift_usage',
  Membership: 'membership',
  MembershipType: 'membership_type',
  Conversation: 'conversation',
  Message: 'message',
  Notification: 'notification',
  Review: 'review',
  VendorReview: 'vendor_review',
  ClientReview: 'client_review',
  PlatformFeedback: 'platform_feedback',
  CulturalBadgeRequest: 'cultural_badge_request',
  VendorFlag: 'vendor_flag',
  AvailabilitySlot: 'availability_slot',
  VerificationRequest: 'verification_request',
  Continent: 'continent',
  Country: 'country',
  Region: 'region',
  Departement: 'departement',
  Arrondissement: 'arrondissement',
  Ville: 'ville',
  Quartier: 'quartier',
  SystemSettings: 'system_settings',
  RankingConfig: 'ranking_config',
};

const entitiesQuery = {};
Object.entries(ENTITY_TABLE_MAP).forEach(([entityName, tableName]) => {
  entitiesQuery[entityName] = createEntityQuery(tableName);
});

// entitiesQuery est expose sous base44.entities.XXX ET base44.entities.Query.XXX
// (alias) pour supporter les deux styles d'appel presents dans le code existant
entitiesQuery.Query = entitiesQuery;

export const base44 = {
  auth: {
    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      let { data: appUser } = await supabase
        .from('app_user')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (!appUser) {
        const { data: created, error: insertError } = await supabase
          .from('app_user')
          .insert({
            id: user.id,
            email: user.email,
            role: 'user',
            full_name: user.user_metadata?.full_name || user.email,
          })
          .select()
          .single();
        if (insertError) {
          const { data: retry } = await supabase
            .from('app_user')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          appUser = retry;
        } else {
          appUser = created;
        }
      }
      return { ...user, ...appUser };
    },
    logout: async () => {
      await supabase.auth.signOut();
    },
    redirectToLogin: () => {
      window.location.href = '/Login';
    },
  },
  entities: entitiesQuery,
};