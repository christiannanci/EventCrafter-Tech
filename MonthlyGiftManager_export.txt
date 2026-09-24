import React, { useState } from 'react';
import { base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Gift, Zap, Calendar, Users, Filter, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MonthlyGiftManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [leadsCount, setLeadsCount] = useState(1);
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterCulturalBadge, setFilterCulturalBadge] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [targetVendors, setTargetVendors] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Charger tous les vendeurs pour ciblage
  const { data: allVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['all-vendors'],
    queryFn: async () => {
      const vendors = await base44.entities.VendorProfile.list('-created_date', 5000);
      return vendors;
    },
  });

  // Charger les reviews pour filtrer par note
  const { data: allReviews } = useQuery({
    queryKey: ['vendor-reviews'],
    queryFn: async () => {
      const reviews = await base44.entities.VendorReview.filter({ status: 'approved' });
      return reviews;
    },
  });

  // Charger l'historique des distributions
  const { data: distributions } = useQuery({
    queryKey: ['gift-distributions'],
    queryFn: async () => {
      const dists = await base44.entities.GiftDistribution.list('-distribution_date', 100);
      return dists;
    },
  });

  // Charger les usages pour analytics
  const { data: giftUsages } = useQuery({
    queryKey: ['gift-usages'],
    queryFn: async () => {
      const usages = await base44.entities.GiftUsage.list('-created_date', 5000);
      return usages;
    },
  });

  // Calculer note moyenne par vendeur
  const getVendorRating = (vendorId) => {
    if (!allReviews) return 0;
    const vendorReviews = allReviews.filter(r => r.provider_id === vendorId);
    if (vendorReviews.length === 0) return 0;
    const avg = vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;
    return avg;
  };

  // Filtrer les vendeurs selon critères
  const getFilteredVendors = () => {
    if (!allVendors) return [];
    
    return allVendors.filter(vendor => {
      // Filtre par plan
      if (filterPlan !== 'all' && vendor.plan !== filterPlan) return false;
      
      // Filtre par badge culturel
      if (filterCulturalBadge !== 'all') {
        if (!vendor.cultural_badge_active) return false;
        if (vendor.cultural_badge_type !== filterCulturalBadge) return false;
      }
      
      // Filtre par note minimale
      if (minRating > 0) {
        const rating = getVendorRating(vendor.user_id);
        if (rating < minRating) return false;
      }
      
      return true;
    });
  };

  const handlePrepareGift = () => {
    const filtered = getFilteredVendors();
    setTargetVendors(filtered);
    setShowConfirmDialog(true);
  };

  const handleDistributeGift = async () => {
    setProcessing(true);
    setShowConfirmDialog(false);
    
    try {
      const currentUser = await base44.auth.me();
      
      // Créer l'enregistrement de distribution
      const distribution = await base44.entities.GiftDistribution.create({
        distribution_date: new Date().toISOString(),
        leads_count: leadsCount,
        total_vendors: targetVendors.length,
        filter_plan: filterPlan,
        filter_cultural_badge: filterCulturalBadge,
        filter_min_rating: minRating,
        total_leads_distributed: targetVendors.length * leadsCount,
        admin_id: currentUser.id,
        campaign_name: `Cadeau ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
      });

      let successCount = 0;
      let errorCount = 0;

      for (const vendor of targetVendors) {
        try {
          // Ajouter les crédits reward
          await base44.entities.VendorProfile.update(vendor.id, {
            reward_credits: (vendor.reward_credits || 0) + leadsCount,
            monthly_free_lead_used: false // Réinitialiser le flag
          });

          // Créer l'enregistrement d'usage pour tracking
          await base44.entities.GiftUsage.create({
            distribution_id: distribution.id,
            vendor_id: vendor.user_id,
            leads_received: leadsCount,
            leads_used: 0,
            plan_before: vendor.plan,
            plan_after: vendor.plan
          });

          // Envoyer notification
          await base44.entities.Notification.create({
            user_id: vendor.user_id,
            title: "🎁 Cadeau du Mois Arrivé !",
            message: `L'administrateur vient de vous offrir ${leadsCount} lead${leadsCount > 1 ? 's' : ''} gratuit${leadsCount > 1 ? 's' : ''} ! Allez trouver votre prochain client !`,
            type: "system",
            is_read: false
          });

          successCount++;
        } catch (err) {
          console.error(`Error for vendor ${vendor.id}:`, err);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['all-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['gift-distributions'] });

      toast({
        title: "✅ Cadeaux distribués !",
        description: `${successCount} vendeurs ont reçu leur cadeau. ${errorCount > 0 ? `${errorCount} erreurs.` : ''}`,
      });
    } catch (error) {
      console.error('Distribution error:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de distribuer les cadeaux.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredCount = getFilteredVendors().length;

  // Calculer les métriques analytics
  const calculateAnalytics = () => {
    if (!distributions || !giftUsages || !allVendors) return null;

    const totalDistributed = distributions.reduce((sum, d) => sum + d.total_leads_distributed, 0);
    const totalUsed = giftUsages.reduce((sum, u) => sum + u.leads_used, 0);
    const usageRate = totalDistributed > 0 ? ((totalUsed / totalDistributed) * 100).toFixed(1) : 0;

    const conversions = giftUsages.filter(u => u.converted_to_paid);
    const freeVendorsWhoGotGift = giftUsages.filter(u => u.plan_before === 'free');
    const conversionRate = freeVendorsWhoGotGift.length > 0 
      ? ((conversions.length / freeVendorsWhoGotGift.length) * 100).toFixed(1) 
      : 0;

    return {
      totalDistributed,
      totalUsed,
      usageRate,
      conversions: conversions.length,
      conversionRate,
      totalCampaigns: distributions.length
    };
  };

  const analytics = calculateAnalytics();

  if (vendorsLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-stone-600">Chargement des vendeurs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Gift className="w-6 h-6 text-pink-600" />
            Gestion du Cadeau Mensuel
          </h2>
          <p className="text-stone-500 mt-1">
            Offrez des leads gratuits à vos prestataires
          </p>
        </div>
      </div>

      {/* Analytics Section */}
      {analytics && (
        <Card className="border-indigo-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Analytics & Performance
            </CardTitle>
            <CardDescription>Impact des cadeaux mensuels sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 mb-1">Leads Distribués</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalDistributed}</p>
                <p className="text-xs text-blue-600 mt-1">{analytics.totalCampaigns} campagnes</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 mb-1">Leads Utilisés</p>
                <p className="text-3xl font-bold text-green-600">{analytics.totalUsed}</p>
                <p className="text-xs text-green-600 mt-1">{analytics.usageRate}% taux d'utilisation</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 mb-1">Conversions</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.conversions}</p>
                <p className="text-xs text-purple-600 mt-1">Free → Premium/Gold</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 mb-1">Taux Conversion</p>
                <p className="text-3xl font-bold text-amber-600">{analytics.conversionRate}%</p>
                <p className="text-xs text-amber-600 mt-1">ROI du cadeau</p>
              </div>
            </div>

            {distributions && distributions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-stone-800 mb-3">📅 Historique des Distributions</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {distributions.slice(0, 5).map((dist) => {
                    const distUsages = giftUsages?.filter(u => u.distribution_id === dist.id) || [];
                    const used = distUsages.reduce((sum, u) => sum + u.leads_used, 0);
                    const distRate = dist.total_leads_distributed > 0 
                      ? ((used / dist.total_leads_distributed) * 100).toFixed(0) 
                      : 0;

                    return (
                      <div key={dist.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium text-stone-800">{dist.campaign_name}</p>
                          <p className="text-xs text-stone-500">
                            {dist.total_vendors} vendeurs • {dist.total_leads_distributed} leads
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={distRate > 50 ? "bg-green-600" : "bg-amber-600"}>
                            {distRate}% utilisés
                          </Badge>
                          <p className="text-xs text-stone-500 mt-1">
                            {new Date(dist.distribution_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mode Impulsion */}
        <Card className="border-pink-200">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-pink-600" />
              Mode "Impulsion" (Manuel)
            </CardTitle>
            <CardDescription>Déclenchez maintenant avec ciblage précis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Nombre de leads à offrir</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={leadsCount}
                onChange={(e) => setLeadsCount(parseInt(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-stone-500 mt-1">
                Chaque vendeur recevra ce nombre de crédits
              </p>
            </div>

            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
              <h4 className="font-semibold text-sm text-pink-900 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtres de Ciblage
              </h4>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Plan d'abonnement</Label>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les plans</SelectItem>
                      <SelectItem value="free">Free uniquement</SelectItem>
                      <SelectItem value="premium">Premium uniquement</SelectItem>
                      <SelectItem value="gold">Gold uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Badge Culturel</Label>
                  <Select value={filterCulturalBadge} onValueChange={setFilterCulturalBadge}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="Bamiléké">Bamiléké</SelectItem>
                      <SelectItem value="Sawa">Sawa</SelectItem>
                      <SelectItem value="Grassfields">Grassfields</SelectItem>
                      <SelectItem value="Béti">Béti</SelectItem>
                      <SelectItem value="Grand Nord">Grand Nord</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Note minimale (étoiles)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={minRating}
                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {filteredCount} vendeur{filteredCount > 1 ? 's' : ''} ciblé{filteredCount > 1 ? 's' : ''}
                </span>
              </div>
              <Badge className="bg-blue-600">
                {filteredCount * leadsCount} leads total
              </Badge>
            </div>

            <Button 
              onClick={handlePrepareGift}
              disabled={filteredCount === 0 || processing}
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              <Gift className="w-4 h-4 mr-2" />
              Générer les Leads Gratuits
            </Button>
          </CardContent>
        </Card>

        {/* Statistiques & Info */}
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Statistiques & Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-stone-50 rounded-lg border">
                <p className="text-xs text-stone-600 mb-1">Total Vendeurs</p>
                <p className="text-2xl font-bold text-stone-900">{allVendors?.length || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 mb-1">Actifs (avec badge)</p>
                <p className="text-2xl font-bold text-green-600">
                  {allVendors?.filter(v => v.cultural_badge_active).length || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 mb-1">Plans Free</p>
                <p className="text-2xl font-bold text-blue-600">
                  {allVendors?.filter(v => v.plan === 'free').length || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 mb-1">Premium + Gold</p>
                <p className="text-2xl font-bold text-purple-600">
                  {allVendors?.filter(v => v.plan === 'premium' || v.plan === 'gold').length || 0}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-sm text-amber-900 mb-2">
                💡 Moments Opportuns
              </h4>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• <strong>1er du mois :</strong> Cadeau mensuel classique</li>
                <li>• <strong>11 Février :</strong> Fête de la Jeunesse</li>
                <li>• <strong>20 Mai :</strong> Fête Nationale</li>
                <li>• <strong>Après événement :</strong> Récompense performance</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-sm text-green-900 mb-2">
                ✅ Bonnes Pratiques
              </h4>
              <ul className="text-xs text-green-800 space-y-1">
                <li>• Cibler les Free pour les inciter à utiliser</li>
                <li>• Récompenser les bien notés ({'>'}4⭐)</li>
                <li>• Varier les badges culturels chaque mois</li>
                <li>• Annoncer à l'avance pour créer l'attente</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-600" />
              Confirmer la Distribution
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vous êtes sur le point d'offrir <strong>{leadsCount} crédit{leadsCount > 1 ? 's' : ''} de lead</strong> à <strong>{targetVendors.length} vendeur{targetVendors.length > 1 ? 's' : ''}</strong>.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-medium mb-2">Filtres appliqués :</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Plan : {filterPlan === 'all' ? 'Tous' : filterPlan}</li>
                  <li>• Badge : {filterCulturalBadge === 'all' ? 'Tous' : filterCulturalBadge}</li>
                  <li>• Note min : {minRating > 0 ? `${minRating}⭐` : 'Aucune'}</li>
                </ul>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-700">
                  Chaque vendeur recevra une notification push immédiate
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-amber-700">
                  Total de {targetVendors.length * leadsCount} leads distribués
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDistributeGift}
              className="bg-pink-600 hover:bg-pink-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Distribuer Maintenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}