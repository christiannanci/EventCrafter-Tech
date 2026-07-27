import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Target, Clock, TrendingUp } from "lucide-react";
import { base44 } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { format, addWeeks } from "date-fns";

const BOOST_PRICE = 2400; // 2400 FCFA/semaine
const BOOST_DURATION_DAYS = 7;

const SERVICE_CATEGORIES = [
  "Event Planner", "Caterer", "Photographer", "Florist", 
  "Stage Builder", "Decorator", "Draper", "Seamstress",
  "Server", "Bartender", "Musician", "DJ", "Venue"
];

export default function SmartMatchBoost({ vendorProfile, onUpdate }) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!vendorProfile) {
    return null;
  }

  const isBoostActive = vendorProfile.smart_match_boost_active 
    && vendorProfile.smart_match_boost_expiry 
    && new Date(vendorProfile.smart_match_boost_expiry) > new Date();

  const handleActivateBoost = async () => {
    if (!selectedCategory) {
      toast({
        title: "Sélection requise",
        description: "Choisissez une catégorie à booster",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Vérifier le solde
      if ((vendorProfile.account_balance || 0) < BOOST_PRICE) {
        toast({
          title: "Solde insuffisant",
          description: `Vous avez besoin de ${BOOST_PRICE.toLocaleString()} FCFA pour activer le boost.`,
          variant: "destructive"
        });
        return;
      }

      const expiryDate = addWeeks(new Date(), 1);

      // Débiter et activer le boost
      await base44.entities.VendorProfile.update(vendorProfile.id, {
        account_balance: (vendorProfile.account_balance || 0) - BOOST_PRICE,
        smart_match_boost_active: true,
        smart_match_boost_category: selectedCategory,
        smart_match_boost_expiry: expiryDate.toISOString()
      });

      // Créer transaction
      await base44.entities.Transaction.create({
        user_id: vendorProfile.user_id,
        amount: -BOOST_PRICE,
        type: 'ad_fee',
        status: 'completed',
        description: `Boost Smart Match - ${selectedCategory} (7 jours)`
      });

      toast({
        title: "🚀 Boost Activé !",
        description: `Priorisé dans "${selectedCategory}" jusqu'au ${format(expiryDate, 'dd/MM/yyyy')}`
      });

      setDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Boost activation error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer le boost. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Boost Smart Match
          <Badge className="bg-blue-500 text-white text-xs">{BOOST_PRICE.toLocaleString()} FCFA / semaine</Badge>
        </CardTitle>
        <p className="text-sm text-stone-500">
          Soyez priorisé par l'algorithme dans une catégorie spécifique pendant 7 jours
        </p>
      </CardHeader>
      <CardContent>
        {isBoostActive ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-300">
              <Zap className="w-8 h-8 text-blue-600" />
              <div className="flex-1">
                <h4 className="font-bold text-stone-900">
                  Boost actif: {vendorProfile.smart_match_boost_category}
                </h4>
                <div className="flex items-center gap-2 text-sm text-stone-600 mt-1">
                  <Clock className="w-4 h-4" />
                  Expire le {format(new Date(vendorProfile.smart_match_boost_expiry), 'dd/MM/yyyy')}
                </div>
              </div>
              <Badge className="bg-green-500 text-white">ACTIF</Badge>
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-cyan-600 mt-0.5" />
                <div className="text-sm text-stone-700">
                  <strong>Avantages actifs:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>+30% de visibilité dans les résultats de recherche</li>
                    <li>Priorité dans les notifications aux clients</li>
                    <li>Badge "Recommandé" dans votre catégorie</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Zap className="w-4 h-4 mr-2" />
                Activer un Boost
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Booster une Catégorie</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-stone-600">
                  Choisissez une catégorie de service où vous voulez être priorisé par l'algorithme Smart Match pendant 7 jours.
                </p>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="bg-stone-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Prix:</span>
                    <span className="font-bold">{BOOST_PRICE.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Durée:</span>
                    <span className="font-bold">{BOOST_DURATION_DAYS} jours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Votre solde:</span>
                    <span className={`font-bold ${(vendorProfile.account_balance || 0) >= BOOST_PRICE ? 'text-green-600' : 'text-red-600'}`}>
                      {(vendorProfile.account_balance || 0).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
                  <strong>Ce que vous obtenez:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>+30% visibilité dans résultats de recherche</li>
                    <li>Badge "Recommandé" pendant 7 jours</li>
                    <li>Priorité dans notifications clients</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleActivateBoost} 
                  disabled={processing || !selectedCategory}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? 'Activation...' : `Activer Boost - ${BOOST_PRICE.toLocaleString()} FCFA`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}