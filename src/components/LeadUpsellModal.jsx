import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Zap, Package, Clock, DollarSign, Sparkles, TrendingUp, Check } from 'lucide-react';
import { base44 } from '@/api/apiClient';
import { getLeadPrice } from '@/components/LeadPricingCalculator';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from './utils';
import { Link } from 'react-router-dom';

export default function LeadUpsellModal({ 
  isOpen, 
  onClose, 
  lead, 
  vendorProfile,
  onPurchaseComplete 
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [singleLeadPrice, setSingleLeadPrice] = useState(2400);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (lead && lead.budget_category) {
      getLeadPrice(lead.budget_category).then(price => {
        setSingleLeadPrice(price);
      });
    }
  }, [lead]);

  const loadConfig = async () => {
    try {
      const configs = await base44.entities.LeadPackConfig.filter({ config_key: 'default' });
      if (configs[0]) {
        setConfig(configs[0]);
      } else {
        // Config par défaut (FCFA)
        setConfig({
          premium_monthly_price: 18000,
          gold_monthly_price: 36000,
          pack_10_leads_price: 10800,
          pack_25_leads_price: 24000,
          pack_50_leads_price: 45000,
          pass_24h_unlimited_price: 6000,
          premium_24h_trial_price: 4200,
          show_single_purchase: true,
          show_packs: true,
          show_temporary_passes: true,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handlePurchaseSingleLead = async () => {
    setLoading(true);
    try {
      // Créer une transaction
      await base44.entities.Transaction.create({
        user_id: vendorProfile.user_id,
        amount: singleLeadPrice,
        type: 'ad_fee',
        description: `Achat lead unique - ${lead.event_type}`,
        status: 'completed',
        reference_id: lead.id,
      });

      // Incrémenter le quota
      await base44.entities.VendorProfile.update(vendorProfile.id, {
        purchased_leads_allowance: (vendorProfile.purchased_leads_allowance || 0) + 1,
      });

      toast({
        title: "✅ Lead débloqué !",
        description: "Vous pouvez maintenant voir les informations de contact",
      });

      onPurchaseComplete();
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePack = async (packType) => {
    setLoading(true);
    try {
      let leadsCount = 0;
      let price = 0;
      let expiresAt = null;

      switch(packType) {
        case 'pack_10':
          leadsCount = 10;
          price = config.pack_10_leads_price;
          break;
        case 'pack_25':
          leadsCount = 25;
          price = config.pack_25_leads_price;
          break;
        case 'pack_50':
          leadsCount = 50;
          price = config.pack_50_leads_price;
          break;
        case 'pass_24h':
          leadsCount = 999999; // Illimité
          price = config.pass_24h_unlimited_price;
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'premium_24h':
          leadsCount = 999999;
          price = config.premium_24h_trial_price;
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      // Créer le pack
      await base44.entities.VendorLeadPack.create({
        vendor_id: vendorProfile.user_id,
        pack_type: packType,
        leads_remaining: leadsCount,
        amount_paid: price,
        expires_at: expiresAt,
        status: 'active',
      });

      // Créer transaction
      await base44.entities.Transaction.create({
        user_id: vendorProfile.user_id,
        amount: price,
        type: 'ad_fee',
        description: `Achat ${packType.replace('_', ' ')}`,
        status: 'completed',
      });

      toast({
        title: "✅ Pack activé !",
        description: `Vous disposez maintenant de ${leadsCount} leads`,
      });

      onPurchaseComplete();
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!config) return null;

  const leadInfo = lead ? {
    type: lead.event_type === 'Wedding' ? 'Mariage VIP' :
          lead.event_type === 'Gala' ? 'Gala' :
          lead.event_type === 'Corporate' ? 'Événement Corporate' : lead.event_type,
    guests: lead.guest_count || '100+',
    category: lead.budget_category === 'large' ? 'Haute Valeur' :
              lead.budget_category === 'medium' ? 'Moyen' : 'Standard',
  } : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-rose-600" />
            Oups ! Votre quota gratuit est épuisé 📈
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {leadInfo && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-2">
                <p className="text-amber-900 font-medium">
                  Un client vient de publier un besoin pour un <strong>{leadInfo.type}</strong> ({leadInfo.guests} invités).
                  <br />
                  Ne laissez pas vos concurrents prendre ce contrat !
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Options d'abonnement permanent */}
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600" />
              Passage au Niveau Supérieur (Accès Illimité)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Link to={createPageUrl('VendorDashboard') + '?tab=membership'}>
                <Card className="border-2 border-purple-300 hover:border-purple-500 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className="bg-purple-600">PREMIUM</Badge>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-purple-600">{config.premium_monthly_price.toLocaleString()} FCFA</p>
                        <p className="text-xs text-stone-500">/mois</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Quota leads élevé</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Badge Premium visible</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Priorité modérée</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl('VendorDashboard') + '?tab=membership'}>
                <Card className="border-2 border-amber-300 hover:border-amber-500 transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-50 h-full">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">⭐ GOLD</Badge>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-amber-600">{config.gold_monthly_price.toLocaleString()} FCFA</p>
                        <p className="text-xs text-stone-500">/mois</p>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> <strong>Leads illimités</strong></li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Badge Gold + Priorité Max</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Accès leads VIP en premier</li>
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Packs de leads */}
          {config.show_packs && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Packs de Leads (Flexibilité)
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="border-2 hover:border-blue-400 transition-all">
                  <CardContent className="p-4">
                    <div className="text-center mb-3">
                      <p className="text-2xl font-bold">10 Leads</p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">{config.pack_10_leads_price.toLocaleString()} FCFA</p>
                      <p className="text-xs text-stone-500">{Math.round(config.pack_10_leads_price / 10).toLocaleString()} FCFA par lead</p>
                    </div>
                    <Button 
                      onClick={() => handlePurchasePack('pack_10')}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Acheter
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-400 relative">
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600">POPULAIRE</Badge>
                  <CardContent className="p-4">
                    <div className="text-center mb-3">
                      <p className="text-2xl font-bold">25 Leads</p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">{config.pack_25_leads_price.toLocaleString()} FCFA</p>
                      <p className="text-xs text-stone-500">{Math.round(config.pack_25_leads_price / 25).toLocaleString()} FCFA par lead</p>
                    </div>
                    <Button 
                      onClick={() => handlePurchasePack('pack_25')}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Acheter
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-blue-400 transition-all">
                  <CardContent className="p-4">
                    <div className="text-center mb-3">
                      <p className="text-2xl font-bold">50 Leads</p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">{config.pack_50_leads_price.toLocaleString()} FCFA</p>
                      <p className="text-xs text-stone-500">{Math.round(config.pack_50_leads_price / 50).toLocaleString()} FCFA par lead</p>
                    </div>
                    <Button 
                      onClick={() => handlePurchasePack('pack_50')}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Acheter
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Pass temporaires */}
          {config.show_temporary_passes && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Pass Temporaires (Urgence)
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-2 border-orange-300 hover:border-orange-500 transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Badge className="bg-orange-600 mb-2">⚡ ILLIMITÉ 24H</Badge>
                        <p className="text-sm text-stone-600">Chassez tous les leads pendant 24h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-orange-600">{config.pass_24h_unlimited_price.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handlePurchasePack('pass_24h')}
                      disabled={loading}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Activer Pass 24h
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-300 hover:border-purple-500 transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Badge className="bg-purple-600 mb-2">✨ TEST PREMIUM 24H</Badge>
                        <p className="text-sm text-stone-600">Essayez Premium + Badge pendant 24h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-purple-600">{config.premium_24h_trial_price.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handlePurchasePack('premium_24h')}
                      disabled={loading}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Tester Premium 24h
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Achat à l'unité */}
          {config.show_single_purchase && leadInfo && (
            <div className="border-t pt-6">
              <Card className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-rose-600" />
                        Débloquer ce lead uniquement
                      </h3>
                      <p className="text-sm text-stone-600">
                        Accès immédiat aux informations de contact - Lead {leadInfo.category}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-4xl font-bold text-rose-600">{singleLeadPrice.toLocaleString()} FCFA</p>
                      <Button 
                        onClick={handlePurchaseSingleLead}
                        disabled={loading}
                        size="lg"
                        className="mt-2 bg-rose-600 hover:bg-rose-700"
                      >
                        Débloquer maintenant
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}