import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, Package, Crown, Clock, Settings, Save, Eye, EyeOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LeadUpsellConfigManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    premium_monthly_price: 30,
    gold_monthly_price: 60,
    pack_10_leads_price: 18,
    pack_25_leads_price: 40,
    pack_50_leads_price: 75,
    pass_24h_unlimited_price: 10,
    premium_24h_trial_price: 7,
    free_leads_threshold: 10,
    show_single_purchase: true,
    show_packs: true,
    show_temporary_passes: true,
  });

  const { data: configs } = useQuery({
    queryKey: ['lead-pack-config'],
    queryFn: async () => {
      const data = await base44.entities.LeadPackConfig.filter({ config_key: 'default' });
      return data;
    },
  });

  useEffect(() => {
    if (configs && configs[0]) {
      setConfig(configs[0]);
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      if (configs && configs[0]) {
        return await base44.entities.LeadPackConfig.update(configs[0].id, configData);
      } else {
        return await base44.entities.LeadPackConfig.create({
          config_key: 'default',
          ...configData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-pack-config'] });
      toast({
        title: "✅ Configuration sauvegardée",
        description: "Les nouveaux tarifs upsell sont maintenant actifs",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-600" />
            Configuration Upsell & Monétisation
          </h2>
          <p className="text-stone-500 mt-1">
            Gérez les prix des abonnements, packs et pass temporaires
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abonnements mensuels */}
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              Abonnements Mensuels
            </CardTitle>
            <CardDescription>Prix des plans Premium et Gold</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Prix Premium (USD/mois)</Label>
              <Input
                type="number"
                value={config.premium_monthly_price}
                onChange={(e) => setConfig({...config, premium_monthly_price: parseInt(e.target.value)})}
                placeholder="30"
              />
              <p className="text-xs text-stone-500 mt-1">
                Quota leads élevé + Badge Premium
              </p>
            </div>
            <div>
              <Label>Prix Gold (USD/mois)</Label>
              <Input
                type="number"
                value={config.gold_monthly_price}
                onChange={(e) => setConfig({...config, gold_monthly_price: parseInt(e.target.value)})}
                placeholder="60"
              />
              <p className="text-xs text-stone-500 mt-1">
                Leads illimités + Priorité maximale + Badge Gold
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Packs de leads */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Packs de Leads
            </CardTitle>
            <CardDescription>Packs de crédits leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pack 10 Leads (USD)</Label>
                <Input
                  type="number"
                  value={config.pack_10_leads_price}
                  onChange={(e) => setConfig({...config, pack_10_leads_price: parseInt(e.target.value)})}
                  placeholder="18"
                />
              </div>
              <div>
                <Label>Prix par lead</Label>
                <Input
                  disabled
                  value={`$${(config.pack_10_leads_price / 10).toFixed(2)}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pack 25 Leads (USD)</Label>
                <Input
                  type="number"
                  value={config.pack_25_leads_price}
                  onChange={(e) => setConfig({...config, pack_25_leads_price: parseInt(e.target.value)})}
                  placeholder="40"
                />
              </div>
              <div>
                <Label>Prix par lead</Label>
                <Input
                  disabled
                  value={`$${(config.pack_25_leads_price / 25).toFixed(2)}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pack 50 Leads (USD)</Label>
                <Input
                  type="number"
                  value={config.pack_50_leads_price}
                  onChange={(e) => setConfig({...config, pack_50_leads_price: parseInt(e.target.value)})}
                  placeholder="75"
                />
              </div>
              <div>
                <Label>Prix par lead</Label>
                <Input
                  disabled
                  value={`$${(config.pack_50_leads_price / 50).toFixed(2)}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pass temporaires */}
        <Card className="border-orange-200">
          <CardHeader className="bg-orange-50">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Pass Temporaires
            </CardTitle>
            <CardDescription>Offres d'essai et urgence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Pass Illimité 24h (USD)</Label>
              <Input
                type="number"
                value={config.pass_24h_unlimited_price}
                onChange={(e) => setConfig({...config, pass_24h_unlimited_price: parseInt(e.target.value)})}
                placeholder="10"
              />
              <p className="text-xs text-stone-500 mt-1">
                Accès illimité pendant 24 heures
              </p>
            </div>
            <div>
              <Label>Test Premium 24h (USD)</Label>
              <Input
                type="number"
                value={config.premium_24h_trial_price}
                onChange={(e) => setConfig({...config, premium_24h_trial_price: parseInt(e.target.value)})}
                placeholder="7"
              />
              <p className="text-xs text-stone-500 mt-1">
                Essai Premium avec badge pendant 24h
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Triggers & Visibilité */}
        <Card className="border-stone-200">
          <CardHeader className="bg-stone-50">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-stone-600" />
              Triggers & A/B Testing
            </CardTitle>
            <CardDescription>Paramètres d'affichage et seuils</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Seuil d'alerte (leads gratuits)</Label>
              <Input
                type="number"
                value={config.free_leads_threshold}
                onChange={(e) => setConfig({...config, free_leads_threshold: parseInt(e.target.value)})}
                placeholder="10"
              />
              <p className="text-xs text-stone-500 mt-1">
                Nombre de leads gratuits avant affichage du modal upsell
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-semibold text-sm">Options visibles dans le modal</h4>
              
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded">
                <div className="flex items-center gap-2">
                  {config.show_single_purchase ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-stone-400" />}
                  <span className="text-sm">Achat à l'unité</span>
                </div>
                <Button
                  size="sm"
                  variant={config.show_single_purchase ? "default" : "outline"}
                  onClick={() => setConfig({...config, show_single_purchase: !config.show_single_purchase})}
                >
                  {config.show_single_purchase ? "Visible" : "Caché"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded">
                <div className="flex items-center gap-2">
                  {config.show_packs ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-stone-400" />}
                  <span className="text-sm">Packs de leads</span>
                </div>
                <Button
                  size="sm"
                  variant={config.show_packs ? "default" : "outline"}
                  onClick={() => setConfig({...config, show_packs: !config.show_packs})}
                >
                  {config.show_packs ? "Visible" : "Caché"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded">
                <div className="flex items-center gap-2">
                  {config.show_temporary_passes ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-stone-400" />}
                  <span className="text-sm">Pass temporaires</span>
                </div>
                <Button
                  size="sm"
                  variant={config.show_temporary_passes ? "default" : "outline"}
                  onClick={() => setConfig({...config, show_temporary_passes: !config.show_temporary_passes})}
                >
                  {config.show_temporary_passes ? "Visible" : "Caché"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simulation */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Simulation de Rentabilité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-stone-600 mb-2">Revenus Pack 25 leads</p>
              <p className="text-2xl font-bold text-blue-600">${config.pack_25_leads_price}</p>
              <p className="text-xs text-stone-500 mt-1">Valeur par lead: ${(config.pack_25_leads_price / 25).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-stone-600 mb-2">Revenus Premium (1 mois)</p>
              <p className="text-2xl font-bold text-purple-600">${config.premium_monthly_price}</p>
              <p className="text-xs text-stone-500 mt-1">Engagement moyen: 3-6 mois</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-stone-600 mb-2">Revenus Gold (1 mois)</p>
              <p className="text-2xl font-bold text-amber-600">${config.gold_monthly_price}</p>
              <p className="text-xs text-stone-500 mt-1">Engagement moyen: 6-12 mois</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}