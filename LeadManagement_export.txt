import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, BarChart3, Users, DollarSign, Bell, 
  Calendar, Filter, Send, AlertTriangle, Crown,
  ChevronDown, ChevronUp, Activity, Target, Zap, CheckCircle2
} from "lucide-react";
import { base44 } from "@/api/apiClient";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { determineBudgetCategory } from '@/components/LeadPricingCalculator';
import { useCurrency } from '@/components/CurrencyContext';
import LeadPricingConfigManager from './LeadPricingConfigManager';
import LeadUpsellConfigManager from './LeadUpsellConfigManager';
import RewardConfigManager from './RewardConfigManager';
import RefundPolicyManager from './RefundPolicyManager';
import MonthlyGiftManager from './MonthlyGiftManager';
import RankingConfigManager from './RankingConfigManager';
import DossiersMonitoring from './DossiersMonitoring';

export default function LeadManagement() {
  const { formatPrice } = useCurrency();
  const [leads, setLeads] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [unlocks, setUnlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [seasonalPricing, setSeasonalPricing] = useState({
    small: 2,
    medium: 4,
    large: 10
  });

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allLeads, allVendors, allUnlocks, allPacks, allTransactions] = await Promise.all([
        base44.entities.Lead.list('-created_date', 1000),
        base44.entities.VendorProfile.list('-created_date', 1000),
        base44.entities.LeadUnlock.list('-unlocked_at', 1000),
        base44.entities.VendorLeadPack.list('-created_date', 1000),
        base44.entities.Transaction.filter({ type: 'ad_fee' }, '-created_date', 1000)
      ]);

      setLeads(allLeads);
      setVendors(allVendors);
      setUnlocks(allUnlocks);
      
      calculateAnalytics(allLeads, allVendors, allUnlocks, allPacks, allTransactions);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (leadsData, vendorsData, unlocksData, packsData, transactionsData) => {
    const now = new Date();
    const periodStart = new Date();
    if (selectedPeriod === 'week') periodStart.setDate(now.getDate() - 7);
    else if (selectedPeriod === 'month') periodStart.setMonth(now.getMonth() - 1);
    else if (selectedPeriod === 'year') periodStart.setFullYear(now.getFullYear() - 1);

    const filteredLeads = leadsData.filter(l => new Date(l.created_date) >= periodStart);
    const filteredUnlocks = unlocksData.filter(u => new Date(u.unlocked_at) >= periodStart);
    const filteredPacks = packsData.filter(p => new Date(p.created_date) >= periodStart);
    const filteredTransactions = transactionsData.filter(t => new Date(t.created_date) >= periodStart);

    const byCategory = {};
    filteredLeads.forEach(lead => {
      const cat = lead.service_category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    const byPlan = { free: 0, premium: 0, gold: 0 };
    filteredUnlocks.forEach(unlock => {
      const vendor = vendorsData.find(v => v.user_id === unlock.vendor_id);
      if (vendor) {
        byPlan[vendor.plan] = (byPlan[vendor.plan] || 0) + 1;
      }
    });

    const culturalBadges = {};
    vendorsData.filter(v => v.cultural_badge_active).forEach(vendor => {
      const badge = vendor.cultural_badge_type || 'unknown';
      culturalBadges[badge] = (culturalBadges[badge] || 0) + 1;
    });

    const vendorActivity = {};
    filteredUnlocks.forEach(unlock => {
      vendorActivity[unlock.vendor_id] = (vendorActivity[unlock.vendor_id] || 0) + 1;
    });
    const topVendors = Object.entries(vendorActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([vendorId, count]) => {
        const vendor = vendorsData.find(v => v.user_id === vendorId);
        return { vendorId, count, vendor };
      });

    const conversionRate = filteredLeads.length > 0 
      ? ((filteredUnlocks.length / filteredLeads.length) * 100).toFixed(1)
      : 0;

    const totalRevenue = filteredUnlocks.reduce((sum, u) => sum + (u.amount_paid || 0), 0);

    const freeVendorsMissed = vendorsData.filter(v => 
      v.plan === 'free' && (v.missed_leads_count || 0) > 3
    );

    const freeVendors = vendorsData.filter(v => v.plan === 'free');
    const freeVendorsWhoUpgraded = vendorsData.filter(v => 
      v.plan !== 'free' && new Date(v.updated_date) >= periodStart
    );
    const freeVendorsWhoBoughtPacks = new Set(
      filteredPacks.filter(p => {
        const vendor = vendorsData.find(v => v.user_id === p.vendor_id);
        return vendor && vendor.plan === 'free';
      }).map(p => p.vendor_id)
    );
    const freeVendorsWhoBoughtSingle = new Set(
      filteredTransactions.filter(t => {
        const vendor = vendorsData.find(v => v.user_id === t.user_id);
        return vendor && vendor.plan === 'free' && t.description?.includes('Achat lead unique');
      }).map(t => t.user_id)
    );

    const totalFreeConverted = freeVendorsWhoUpgraded.length + 
                               freeVendorsWhoBoughtPacks.size + 
                               freeVendorsWhoBoughtSingle.size;
    
    const freeToPayingConversionRate = freeVendors.length > 0 
      ? ((totalFreeConverted / freeVendors.length) * 100).toFixed(1)
      : 0;

    const singlePurchases = filteredTransactions.filter(t => 
      t.description?.includes('Achat lead unique')
    );
    const pack10Purchases = filteredPacks.filter(p => p.pack_type === 'pack_10');
    const pack25Purchases = filteredPacks.filter(p => p.pack_type === 'pack_25');
    const pack50Purchases = filteredPacks.filter(p => p.pack_type === 'pack_50');
    const pass24hPurchases = filteredPacks.filter(p => p.pack_type === 'pass_24h');
    const premium24hPurchases = filteredPacks.filter(p => p.pack_type === 'premium_24h');

    const highValueLeadsByFree = singlePurchases.filter(t => {
      const vendor = vendorsData.find(v => v.user_id === t.user_id);
      if (!vendor || vendor.plan !== 'free') return false;
      
      const lead = leadsData.find(l => l.id === t.reference_id);
      return lead && lead.budget_category === 'large';
    });

    const highValueLeadsRevenue = highValueLeadsByFree.reduce((sum, t) => sum + (t.amount || 0), 0);

    const purchaseTypeAnalytics = {
      single: {
        count: singlePurchases.length,
        revenue: singlePurchases.reduce((sum, t) => sum + (t.amount || 0), 0),
        label: 'Achat à l\'unité'
      },
      pack10: {
        count: pack10Purchases.length,
        revenue: pack10Purchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0),
        label: 'Pack 10 Leads'
      },
      pack25: {
        count: pack25Purchases.length,
        revenue: pack25Purchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0),
        label: 'Pack 25 Leads'
      },
      pack50: {
        count: pack50Purchases.length,
        revenue: pack50Purchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0),
        label: 'Pack 50 Leads'
      },
      pass24h: {
        count: pass24hPurchases.length,
        revenue: pass24hPurchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0),
        label: 'Pass Illimité 24h'
      },
      premium24h: {
        count: premium24hPurchases.length,
        revenue: premium24hPurchases.reduce((sum, p) => sum + (p.amount_paid || 0), 0),
        label: 'Test Premium 24h'
      }
    };

    setAnalytics({
      totalLeads: filteredLeads.length,
      totalUnlocks: filteredUnlocks.length,
      byCategory,
      byPlan,
      culturalBadges,
      topVendors,
      conversionRate,
      totalRevenue,
      freeVendorsMissed,
      freeVendors: freeVendors.length,
      freeToPayingConversionRate,
      totalFreeConverted,
      purchaseTypeAnalytics,
      highValueLeadsByFree: highValueLeadsByFree.length,
      highValueLeadsRevenue,
    });
  };

  const handleSendUpgradeIncentive = async (vendor) => {
    try {
      await base44.entities.Notification.create({
        user_id: vendor.user_id,
        title: "Opportunites Manquées",
        message: `Vous avez manqué ${vendor.missed_leads_count} demandes ce mois. Passez à Premium pour ne plus rater d'opportunités !`,
        type: "system",
        link: "/VendorDashboard",
        is_read: false
      });

      toast.success(`Incitation envoyée à ${vendor.business_name || vendor.user_id}`);
    } catch (error) {
      toast.error("Impossible d'envoyer la notification");
    }
  };

  const handleUpdateSeasonalPricing = async () => {
    try {
      toast.success(`Prix mis à jour: Petit=${formatPrice(seasonalPricing.small)}, Moyen=${formatPrice(seasonalPricing.medium)}, Eleve=${formatPrice(seasonalPricing.large)}`);
    } catch (error) {
      toast.error("Impossible de mettre à jour les prix");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
        <p className="mt-4 text-stone-600">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <LeadPricingConfigManager />
      <LeadUpsellConfigManager />
      <RewardConfigManager />
      <RefundPolicyManager />
      <MonthlyGiftManager />
      <RankingConfigManager />
      <DossiersMonitoring />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-rose-600" />
            Gestion des Leads
          </h2>
          <p className="text-stone-600">Analyse, monitoring et contrôle des demandes prospects</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">7 derniers jours</SelectItem>
            <SelectItem value="month">30 derniers jours</SelectItem>
            <SelectItem value="year">1 an</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Leads Créés</p>
                <h3 className="text-3xl font-bold text-stone-900 mt-1">{analytics.totalLeads}</h3>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Leads Débloqués</p>
                <h3 className="text-3xl font-bold text-stone-900 mt-1">{analytics.totalUnlocks}</h3>
              </div>
              <Zap className="w-10 h-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Conversion Free->Payant</p>
                <h3 className="text-3xl font-bold text-purple-600 mt-1">{analytics.freeToPayingConversionRate}%</h3>
                <p className="text-xs text-purple-600 mt-1">{analytics.totalFreeConverted}/{analytics.freeVendors} convertis</p>
              </div>
              <Crown className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Taux Déblocage</p>
                <h3 className="text-3xl font-bold text-green-600 mt-1">{analytics.conversionRate}%</h3>
              </div>
              <Activity className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Revenus Générés</p>
                <h3 className="text-3xl font-bold text-rose-600 mt-1">{formatPrice(analytics.totalRevenue || 0)}</h3>
              </div>
              <DollarSign className="w-10 h-10 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analyse</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="automation">Automatisation</TabsTrigger>
          <TabsTrigger value="pricing">Controle Prix</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Rentabilité par Type d'Achat
              </CardTitle>
              <p className="text-sm text-stone-600">
                Quelle option génère le plus de revenus ?
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {Object.entries(analytics.purchaseTypeAnalytics || {})
                  .sort(([,a], [,b]) => b.revenue - a.revenue)
                  .map(([key, data]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-stone-900">{data.label}</p>
                        <p className="text-xs text-stone-500 mt-1">
                          {data.count} achat{data.count > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(data.revenue)}
                        </p>
                        {data.count > 0 && (
                          <p className="text-xs text-stone-500">
                            ~{formatPrice(data.revenue / data.count)} / achat
                          </p>
                        )}
                      </div>
                      {data.revenue > 0 && (
                        <div className="ml-4 w-24 bg-stone-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(data.revenue / Math.max(...Object.values(analytics.purchaseTypeAnalytics || {}).map(d => d.revenue))) * 100}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Insights</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {analytics.purchaseTypeAnalytics?.pass24h?.count > analytics.purchaseTypeAnalytics?.single?.count && (
                    <li>- <strong>Pass 24h plus populaire</strong> que l'achat à l'unité</li>
                  )}
                  {analytics.purchaseTypeAnalytics?.single?.count > analytics.purchaseTypeAnalytics?.pass24h?.count && (
                    <li>- <strong>Achat à l'unité préféré</strong> - considérer promotion Pass 24h</li>
                  )}
                  {(analytics.purchaseTypeAnalytics?.pack25?.count || 0) > (analytics.purchaseTypeAnalytics?.pack10?.count || 0) && (
                    <li>- <strong>Pack 25 plus performant</strong> que Pack 10 - bon rapport qualité/prix</li>
                  )}
                  {analytics.highValueLeadsByFree > 0 && (
                    <li>- <strong>{analytics.highValueLeadsByFree} leads Haute Catégorie</strong> débloqués par Free via achat unique ({formatPrice(analytics.highValueLeadsRevenue || 0)} générés)</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Flux par Catégorie de Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.byCategory || {})
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-stone-700">{category}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-stone-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${(count / analytics.totalLeads) * 100}%` }}
                            />
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-600" />
                  Débloquages par Niveau Prestataire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.byPlan || {}).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          plan === 'gold' ? 'bg-yellow-500' :
                          plan === 'premium' ? 'bg-purple-500' :
                          'bg-stone-500'
                        }>
                          {plan.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-stone-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              plan === 'gold' ? 'bg-yellow-500' :
                              plan === 'premium' ? 'bg-purple-500' :
                              'bg-stone-500'
                            }`}
                            style={{ width: `${(count / analytics.totalUnlocks) * 100}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-stone-900">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Badges Culturels Actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.culturalBadges || {}).map(([badge, count]) => (
                    <div key={badge} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                      <span className="text-sm font-medium text-stone-700 capitalize">{badge}</span>
                      <Badge className="bg-amber-500">{count} vendors</Badge>
                    </div>
                  ))}
                  {Object.keys(analytics.culturalBadges || {}).length === 0 && (
                    <p className="text-sm text-stone-500 text-center py-4">Aucun badge actif</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Top 10 Prestataires les Plus Actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topVendors?.map((item, idx) => (
                  <div key={item.vendorId} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={
                        idx === 0 ? 'bg-yellow-500' :
                        idx === 1 ? 'bg-stone-400' :
                        idx === 2 ? 'bg-amber-600' :
                        'bg-stone-300'
                      }>
                        #{idx + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-stone-900">
                          {item.vendor?.business_name || item.vendorId}
                        </p>
                        <p className="text-xs text-stone-500">
                          Plan: {item.vendor?.plan || 'unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{item.count}</p>
                      <p className="text-xs text-stone-500">leads débloqués</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                Prestataires Gratuits - Leads Manqués
              </CardTitle>
              <p className="text-sm text-stone-600">
                Envoyer des incitations à passer Premium quand un prestataire rate trop de leads
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.freeVendorsMissed?.length > 0 ? (
                  analytics.freeVendorsMissed.map(vendor => (
                    <div key={vendor.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-stone-900">
                            {vendor.business_name || vendor.user_id}
                          </p>
                          <p className="text-sm text-stone-600">
                            {vendor.missed_leads_count} leads manqués ce mois
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleSendUpgradeIncentive(vendor)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer Incitation
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-stone-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p>Aucun prestataire gratuit avec trop de leads manqués</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Ajustement Prix Saisonniers
              </CardTitle>
              <p className="text-sm text-stone-600">
                Modifier les prix de déblocage selon la saisonnalité (ex: haute saison mariages)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Petit Budget (USD)</label>
                    <Input 
                      type="number"
                      value={seasonalPricing.small}
                      onChange={(e) => setSeasonalPricing({...seasonalPricing, small: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                    <p className="text-xs text-stone-500">Anniversaires, baptêmes - {formatPrice(seasonalPricing.small)}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Budget Moyen (USD)</label>
                    <Input 
                      type="number"
                      value={seasonalPricing.medium}
                      onChange={(e) => setSeasonalPricing({...seasonalPricing, medium: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                    <p className="text-xs text-stone-500">Déco mariage, traiteur - {formatPrice(seasonalPricing.medium)}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Budget Eleve (USD)</label>
                    <Input 
                      type="number"
                      value={seasonalPricing.large}
                      onChange={(e) => setSeasonalPricing({...seasonalPricing, large: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                    <p className="text-xs text-stone-500">Mariages premium - {formatPrice(seasonalPricing.large)}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Recommandations Saisonnières</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>- <strong>Haute saison mariages (Déc-Jan):</strong> +20-30%</li>
                    <li>- <strong>Saison basse:</strong> -10-15% pour stimuler</li>
                    <li>- <strong>Périodes festives:</strong> Prix standard</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleUpdateSeasonalPricing}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Appliquer Nouveau Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}