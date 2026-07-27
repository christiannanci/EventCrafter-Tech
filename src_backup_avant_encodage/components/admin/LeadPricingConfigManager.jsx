import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, TrendingUp, Settings, Calendar, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LeadPricingConfigManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    small_threshold_max: 300000,
    medium_threshold_max: 1500000,
    small_price_usd: 2,
    medium_price_usd: 4,
    large_price_usd: 10,
    seasonal_multiplier: 1.0,
    premium_event_multiplier: 1.0,
  });

  // Charger la config existante
  const { data: configs } = useQuery({
    queryKey: ['lead-pricing-config'],
    queryFn: async () => {
      const data = await base44.entities.LeadPricingConfig.filter({ config_key: 'default' });
      return data;
    },
  });

  useEffect(() => {
    if (configs && configs[0]) {
      setConfig(configs[0]);
    }
  }, [configs]);

  // Mutation pour sauvegarder
  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      if (configs && configs[0]) {
        return await base44.entities.LeadPricingConfig.update(configs[0].id, configData);
      } else {
        return await base44.entities.LeadPricingConfig.create({
          config_key: 'default',
          ...configData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-pricing-config'] });
      toast({
        title: "✅ Configuration sauvegardée",
        description: "Les nouveaux tarifs sont maintenant actifs",
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

  const handleSeasonalToggle = (isHighSeason) => {
    setConfig({
      ...config,
      seasonal_multiplier: isHighSeason ? 1.2 : 1.0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-rose-600" />
            Configuration Tarification des Leads
          </h2>
          <p className="text-stone-500 mt-1">
            Gérez les seuils et prix des différentes catégories de leads
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Catégorie FAIBLE */}
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg flex items-center gap-2">
              💡 Catégorie FAIBLE
              <Badge variant="outline" className="ml-auto">Découverte</Badge>
            </CardTitle>
            <CardDescription>Petits événements ou budgets serrés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Seuil Maximum (FCFA)</Label>
              <Input
                type="number"
                value={config.small_threshold_max}
                onChange={(e) => setConfig({...config, small_threshold_max: parseInt(e.target.value)})}
                placeholder="300000"
              />
              <p className="text-xs text-stone-500 mt-1">
                Budget maximum pour cette catégorie
              </p>
            </div>
            <div>
              <Label>Prix du Lead (USD)</Label>
              <Input
                type="number"
                value={config.small_price_usd}
                onChange={(e) => setConfig({...config, small_price_usd: parseInt(e.target.value)})}
                placeholder="2"
              />
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-stone-600">
                <strong>Profil:</strong> Moins de 50 invités, budget {"<"} 300K FCFA
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Catégorie MOYENNE */}
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-lg flex items-center gap-2">
              ⭐ Catégorie MOYENNE
              <Badge variant="outline" className="ml-auto">Standard</Badge>
            </CardTitle>
            <CardDescription>Événements familiaux classiques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Seuil Maximum (FCFA)</Label>
              <Input
                type="number"
                value={config.medium_threshold_max}
                onChange={(e) => setConfig({...config, medium_threshold_max: parseInt(e.target.value)})}
                placeholder="1500000"
              />
              <p className="text-xs text-stone-500 mt-1">
                Budget maximum pour cette catégorie
              </p>
            </div>
            <div>
              <Label>Prix du Lead (USD)</Label>
              <Input
                type="number"
                value={config.medium_price_usd}
                onChange={(e) => setConfig({...config, medium_price_usd: parseInt(e.target.value)})}
                placeholder="4"
              />
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-stone-600">
                <strong>Profil:</strong> 50-200 invités, budget 300K-1.5M FCFA
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Catégorie HAUTE */}
        <Card className="border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="text-lg flex items-center gap-2">
              👑 Catégorie HAUTE
              <Badge variant="outline" className="ml-auto">Premium VIP</Badge>
            </CardTitle>
            <CardDescription>Événements de prestige</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Prix du Lead (USD)</Label>
              <Input
                type="number"
                value={config.large_price_usd}
                onChange={(e) => setConfig({...config, large_price_usd: parseInt(e.target.value)})}
                placeholder="10"
              />
              <p className="text-xs text-stone-500 mt-1">
                Prix entre $8-$10 recommandé
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-stone-600">
                <strong>Profil:</strong> +200 invités, budget {">"} 1.5M FCFA
              </p>
              <p className="text-xs text-purple-600 mt-1">
                ⚡ Priorité Gold membres
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multiplicateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Multiplicateurs & Ajustements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4" />
                Multiplicateur Saisonnier
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={config.seasonal_multiplier === 1.0 ? "default" : "outline"}
                  onClick={() => handleSeasonalToggle(false)}
                  className="flex-1"
                >
                  Normal (x1.0)
                </Button>
                <Button
                  variant={config.seasonal_multiplier > 1.0 ? "default" : "outline"}
                  onClick={() => handleSeasonalToggle(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700"
                >
                  Haute Saison (x1.2)
                </Button>
              </div>
              <p className="text-xs text-stone-500 mt-2">
                Activer pendant les périodes de forte demande (Décembre, Août)
              </p>
            </div>

            <div>
              <Label>Multiplicateur Événements Premium</Label>
              <Input
                type="number"
                step="0.1"
                value={config.premium_event_multiplier}
                onChange={(e) => setConfig({...config, premium_event_multiplier: parseFloat(e.target.value)})}
                placeholder="1.0"
              />
              <p className="text-xs text-stone-500 mt-1">
                Augmente automatiquement le prix pour Mariages, Galas (ex: x1.2)
              </p>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-sm text-amber-900 mb-2">
              📊 Simulation des Prix Actuels
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-stone-600">Lead Faible</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(config.small_price_usd * config.seasonal_multiplier).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-stone-600">Lead Moyen</p>
                <p className="text-2xl font-bold text-amber-600">
                  ${(config.medium_price_usd * config.seasonal_multiplier).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-stone-600">Lead Haute</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${(config.large_price_usd * config.seasonal_multiplier).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}