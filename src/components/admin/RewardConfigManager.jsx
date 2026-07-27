import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Star, Award, Target, Sparkles, Save, TrendingUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function RewardConfigManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    credit_value_leads: 1,
    eligible_categories: ['small', 'medium', 'large'],
    contracts_for_bonus: 3,
    bonus_amount_per_threshold: 1,
    auto_reward_enabled: true,
    spiritual_integrity_multiplier: 2,
  });

  // Charger la config existante
  const { data: configs } = useQuery({
    queryKey: ['reward-config'],
    queryFn: async () => {
      const data = await base44.entities.RewardConfig.filter({ config_key: 'default' });
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
        return await base44.entities.RewardConfig.update(configs[0].id, configData);
      } else {
        return await base44.entities.RewardConfig.create({
          config_key: 'default',
          ...configData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-config'] });
      toast({
        title: "✅ Configuration sauvegardée",
        description: "Le système de récompenses est à jour",
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

  const handleCategoryToggle = (category) => {
    const newCategories = config.eligible_categories.includes(category)
      ? config.eligible_categories.filter(c => c !== category)
      : [...config.eligible_categories, category];
    setConfig({ ...config, eligible_categories: newCategories });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            Gestion des Récompenses
          </h2>
          <p className="text-stone-500 mt-1">
            Configurez le système de crédits bonus et fidélité
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration Valeur Crédit */}
        <Card className="border-amber-200">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Valeur du Crédit Bonus
            </CardTitle>
            <CardDescription>Définissez la générosité du système</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>1 Crédit Bonus = X Leads</Label>
              <Input
                type="number"
                min="1"
                value={config.credit_value_leads}
                onChange={(e) => setConfig({...config, credit_value_leads: parseInt(e.target.value)})}
                placeholder="1"
              />
              <p className="text-xs text-stone-500 mt-1">
                Nombre de leads qu'un prestataire peut débloquer avec 1 crédit
              </p>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-sm text-amber-900 mb-2">
                💡 Stratégies Recommandées
              </h4>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• <strong>Lancement:</strong> 1 crédit = 3-5 leads (très attractif)</li>
                <li>• <strong>Normal:</strong> 1 crédit = 1-2 leads (équilibré)</li>
                <li>• <strong>Haute saison:</strong> 1 crédit = 1 lead (contrôle)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Règle d'Obtention */}
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Règle d'Obtention
            </CardTitle>
            <CardDescription>Automatisation des récompenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Contrats requis pour 1 crédit</Label>
              <Input
                type="number"
                min="1"
                value={config.contracts_for_bonus}
                onChange={(e) => setConfig({...config, contracts_for_bonus: parseInt(e.target.value)})}
                placeholder="3"
              />
              <p className="text-xs text-stone-500 mt-1">
                Nombre de contrats conclus pour gagner un bonus
              </p>
            </div>

            <div>
              <Label>Crédits attribués par seuil</Label>
              <Input
                type="number"
                min="1"
                value={config.bonus_amount_per_threshold}
                onChange={(e) => setConfig({...config, bonus_amount_per_threshold: parseInt(e.target.value)})}
                placeholder="1"
              />
              <p className="text-xs text-stone-500 mt-1">
                Nombre de crédits bonus reçus quand le seuil est atteint
              </p>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <Checkbox
                id="auto-reward"
                checked={config.auto_reward_enabled}
                onCheckedChange={(checked) => setConfig({...config, auto_reward_enabled: checked})}
              />
              <label htmlFor="auto-reward" className="text-sm font-medium cursor-pointer">
                Attribution automatique activée
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Types de Leads Éligibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Types de Leads Éligibles
          </CardTitle>
          <CardDescription>
            Choisissez quelles catégories peuvent être débloquées avec des bonus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              config.eligible_categories.includes('small') 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-stone-200 bg-white'
            }`} onClick={() => handleCategoryToggle('small')}>
              <div className="flex items-center justify-between mb-2">
                <Checkbox
                  checked={config.eligible_categories.includes('small')}
                  onCheckedChange={() => handleCategoryToggle('small')}
                />
                <Badge variant="outline" className="bg-blue-100 text-blue-800">Catégorie 1</Badge>
              </div>
              <h4 className="font-semibold text-stone-900 mb-1">💡 Leads Faibles</h4>
              <p className="text-xs text-stone-600">
                Petits budgets, {"<"} 300K FCFA
              </p>
            </div>

            <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              config.eligible_categories.includes('medium') 
                ? 'border-amber-500 bg-amber-50' 
                : 'border-stone-200 bg-white'
            }`} onClick={() => handleCategoryToggle('medium')}>
              <div className="flex items-center justify-between mb-2">
                <Checkbox
                  checked={config.eligible_categories.includes('medium')}
                  onCheckedChange={() => handleCategoryToggle('medium')}
                />
                <Badge variant="outline" className="bg-amber-100 text-amber-800">Catégorie 2</Badge>
              </div>
              <h4 className="font-semibold text-stone-900 mb-1">⭐ Leads Moyens</h4>
              <p className="text-xs text-stone-600">
                Budget standard, 300K-1.5M FCFA
              </p>
            </div>

            <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              config.eligible_categories.includes('large') 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-stone-200 bg-white'
            }`} onClick={() => handleCategoryToggle('large')}>
              <div className="flex items-center justify-between mb-2">
                <Checkbox
                  checked={config.eligible_categories.includes('large')}
                  onCheckedChange={() => handleCategoryToggle('large')}
                />
                <Badge variant="outline" className="bg-purple-100 text-purple-800">Catégorie 3</Badge>
              </div>
              <h4 className="font-semibold text-stone-900 mb-1">👑 Leads VIP</h4>
              <p className="text-xs text-stone-600">
                Prestige, {">"} 1.5M FCFA
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-rose-50 rounded-lg border border-rose-200">
            <p className="text-sm text-rose-800">
              <strong>⚠️ Astuce:</strong> Désactiver les leads VIP pour les bonus force les prestataires à acheter pour les gros contrats (maximise revenus).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Spéciaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Bonus Spéciaux & Multiplicateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Multiplicateur "Spiritual Integrity"</Label>
            <Input
              type="number"
              step="0.5"
              min="1"
              value={config.spiritual_integrity_multiplier}
              onChange={(e) => setConfig({...config, spiritual_integrity_multiplier: parseFloat(e.target.value)})}
              placeholder="2"
            />
            <p className="text-xs text-stone-500 mt-1">
              Les prestataires vérifiés "Spiritual Integrity" reçoivent x fois plus de crédits
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-sm text-purple-900 mb-2">
              📊 Simulation Actuelle
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-600 mb-1">Prestataire Standard</p>
                <p className="text-stone-900">
                  {config.contracts_for_bonus} contrats → <strong>{config.bonus_amount_per_threshold} crédit</strong> → débloquer <strong className="text-amber-600">{config.credit_value_leads} lead(s)</strong>
                </p>
              </div>
              <div className="border-l pl-4">
                <p className="text-stone-600 mb-1">Prestataire "Spiritual Integrity" 🌟</p>
                <p className="text-stone-900">
                  {config.contracts_for_bonus} contrats → <strong>{config.bonus_amount_per_threshold * config.spiritual_integrity_multiplier} crédits</strong> → débloquer <strong className="text-purple-600">{config.credit_value_leads * config.spiritual_integrity_multiplier} lead(s)</strong>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}