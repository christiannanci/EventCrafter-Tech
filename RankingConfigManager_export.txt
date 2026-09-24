import React, { useState } from 'react';
import { base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TrendingUp, Save, RotateCw, Star, Zap, Shield, Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Slider } from '@/components/ui/slider';

export default function RankingConfigManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    boost_weight: 50,
    rating_weight: 30,
    responsiveness_weight: 10,
    verification_weight: 5,
    cultural_match_weight: 8,
    rotation_hours: 4,
  });

  // Charger la config existante
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['ranking-config'],
    queryFn: async () => {
      const configs = await base44.entities.RankingConfig.filter({ config_key: 'default' });
      return configs[0];
    },
  });

  React.useEffect(() => {
    if (existingConfig) {
      setConfig({
        boost_weight: existingConfig.boost_weight,
        rating_weight: existingConfig.rating_weight,
        responsiveness_weight: existingConfig.responsiveness_weight,
        verification_weight: existingConfig.verification_weight,
        cultural_match_weight: existingConfig.cultural_match_weight,
        rotation_hours: existingConfig.rotation_hours,
      });
    }
  }, [existingConfig]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig) => {
      if (existingConfig) {
        return await base44.entities.RankingConfig.update(existingConfig.id, newConfig);
      } else {
        return await base44.entities.RankingConfig.create({
          config_key: 'default',
          ...newConfig
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranking-config'] });
      toast({
        title: "✅ Configuration sauvegardée",
        description: "Les poids de ranking ont été mis à jour.",
      });
    },
    onError: () => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleReset = () => {
    setConfig({
      boost_weight: 50,
      rating_weight: 30,
      responsiveness_weight: 10,
      verification_weight: 5,
      cultural_match_weight: 8,
      rotation_hours: 4,
    });
  };

  // Calculer le score exemple
  const calculateExampleScore = (isBoost, rating, isResponsive, isVerified, hasCulturalMatch) => {
    let score = 0;
    if (isBoost) score += config.boost_weight;
    score += (rating / 5) * config.rating_weight;
    if (isResponsive) score += config.responsiveness_weight;
    if (isVerified) score += config.verification_weight;
    if (hasCulturalMatch) score += config.cultural_match_weight;
    return score.toFixed(1);
  };

  const totalWeight = config.boost_weight + config.rating_weight + config.responsiveness_weight + 
                      config.verification_weight + config.cultural_match_weight;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-stone-600">Chargement de la configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Configuration Smart Ranking
        </CardTitle>
        <CardDescription>
          Ajustez les poids de chaque critère pour l'ordre d'affichage des services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        
        {/* Boost Weight */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Poids du Boost (Payant 3-5$/semaine)
            </Label>
            <Badge className="bg-amber-600">{config.boost_weight} points</Badge>
          </div>
          <Slider
            value={[config.boost_weight]}
            onValueChange={(value) => setConfig({ ...config, boost_weight: value[0] })}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-stone-500">
            Services boostés apparaissent en priorité absolue
          </p>
        </div>

        {/* Rating Weight */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Poids de la Note Client (Qualité)
            </Label>
            <Badge className="bg-yellow-600">{config.rating_weight} points</Badge>
          </div>
          <Slider
            value={[config.rating_weight]}
            onValueChange={(value) => setConfig({ ...config, rating_weight: value[0] })}
            min={0}
            max={50}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-stone-500">
            Note 5/5 = {config.rating_weight} points, 4/5 = {(config.rating_weight * 0.8).toFixed(1)} points
          </p>
        </div>

        {/* Responsiveness Weight */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-blue-500" />
              Poids de la Réactivité (Réponse rapide)
            </Label>
            <Badge className="bg-blue-600">{config.responsiveness_weight} points</Badge>
          </div>
          <Slider
            value={[config.responsiveness_weight]}
            onValueChange={(value) => setConfig({ ...config, responsiveness_weight: value[0] })}
            min={0}
            max={30}
            step={2}
            className="w-full"
          />
          <p className="text-xs text-stone-500">
            Bonus si temps de réponse moyen &lt; 2h
          </p>
        </div>

        {/* Verification Weight */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              Poids Vérification Officielle
            </Label>
            <Badge className="bg-green-600">{config.verification_weight} points</Badge>
          </div>
          <Slider
            value={[config.verification_weight]}
            onValueChange={(value) => setConfig({ ...config, verification_weight: value[0] })}
            min={0}
            max={20}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-stone-500">
            Badge vérifié = confiance supplémentaire
          </p>
        </div>

        {/* Cultural Match Weight */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Poids Affinité Culturelle
            </Label>
            <Badge className="bg-pink-600">{config.cultural_match_weight} points</Badge>
          </div>
          <Slider
            value={[config.cultural_match_weight]}
            onValueChange={(value) => setConfig({ ...config, cultural_match_weight: value[0] })}
            min={0}
            max={25}
            step={2}
            className="w-full"
          />
          <p className="text-xs text-stone-500">
            Bonus si badge culturel correspond à la recherche
          </p>
        </div>

        {/* Rotation Hours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-purple-500" />
              Rotation Équitable (Heures)
            </Label>
            <Badge className="bg-purple-600">{config.rotation_hours}h</Badge>
          </div>
          <Slider
            value={[config.rotation_hours]}
            onValueChange={(value) => setConfig({ ...config, rotation_hours: value[0] })}
            min={1}
            max={24}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-stone-500">
            Durée avant rotation si plusieurs services boostés (RN7)
          </p>
        </div>

        {/* Simulation Section */}
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <h4 className="font-semibold text-sm text-indigo-900 mb-3">
            📊 Simulation de Scores
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 bg-white rounded border">
              <span className="text-stone-700">Service BOOSTÉ (5⭐, vérifié, réactif, match culturel)</span>
              <Badge className="bg-indigo-600">{calculateExampleScore(true, 5, true, true, true)} pts</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded border">
              <span className="text-stone-700">Service NON-BOOSTÉ (5⭐, vérifié, réactif, match culturel)</span>
              <Badge className="bg-stone-600">{calculateExampleScore(false, 5, true, true, true)} pts</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded border">
              <span className="text-stone-700">Service BOOSTÉ (4.2⭐, vérifié)</span>
              <Badge className="bg-amber-600">{calculateExampleScore(true, 4.2, false, true, false)} pts</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-white rounded border">
              <span className="text-stone-700">Service NON-BOOSTÉ (4.8⭐, vérifié, réactif)</span>
              <Badge className="bg-stone-500">{calculateExampleScore(false, 4.8, true, true, false)} pts</Badge>
            </div>
          </div>
          <p className="text-xs text-indigo-700 mt-3 font-medium">
            ✅ Un service excellent non-boosté reste sous un service boosté moyen
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-sm font-medium text-stone-800">Total des poids : {totalWeight}</p>
            <p className="text-xs text-stone-500">Score maximum possible : ~{totalWeight}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}