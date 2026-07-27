import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Shield, Sparkles, Clock } from "lucide-react";
import { base44 } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { format, addMonths } from "date-fns";

const CULTURAL_BADGES = [
  { value: "bamileke", label: "Décorateur Certifié Bamiléké", icon: "🏔️" },
  { value: "sawa", label: "Expert Traditions Sawa", icon: "🌊" },
  { value: "grassfields", label: "Spécialiste Grassfields", icon: "🌾" },
  { value: "grand_nord", label: "Artisan Grand Nord", icon: "🐪" },
  { value: "forest", label: "Maître Forêt Équatoriale", icon: "🌴" },
  { value: "diaspora", label: "Expert Événements Diaspora", icon: "✈️" }
];

const BADGE_PRICE_MONTHLY = 5; // $5/mois

export default function CulturalBadgeManager({ vendorProfile, onUpdate }) {
  const { toast } = useToast();
  const [selectedBadge, setSelectedBadge] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!vendorProfile) {
    return null;
  }

  const activeBadge = vendorProfile.cultural_badge_active 
    ? CULTURAL_BADGES.find(b => b.value === vendorProfile.cultural_badge_type)
    : null;

  const isExpired = vendorProfile.cultural_badge_expiry 
    ? new Date(vendorProfile.cultural_badge_expiry) < new Date()
    : true;

  const handlePurchaseBadge = async () => {
    if (!selectedBadge) {
      toast({
        title: "Sélection requise",
        description: "Choisissez un badge culturel",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Vérifier le solde
      if ((vendorProfile.account_balance || 0) < BADGE_PRICE_MONTHLY) {
        toast({
          title: "Solde insuffisant",
          description: `Vous avez besoin de $${BADGE_PRICE_MONTHLY} pour activer ce badge.`,
          variant: "destructive"
        });
        return;
      }

      // Débiter le compte
      await base44.entities.VendorProfile.update(vendorProfile.id, {
        account_balance: (vendorProfile.account_balance || 0) - BADGE_PRICE_MONTHLY,
        cultural_badge_active: true,
        cultural_badge_type: selectedBadge,
        cultural_badge_expiry: addMonths(new Date(), 1).toISOString()
      });

      // Créer transaction
      await base44.entities.Transaction.create({
        user_id: vendorProfile.user_id,
        amount: -BADGE_PRICE_MONTHLY,
        type: 'subscription',
        status: 'completed',
        description: `Badge Culturel: ${CULTURAL_BADGES.find(b => b.value === selectedBadge)?.label}`
      });

      toast({
        title: "✅ Badge Activé !",
        description: `Votre badge culturel est actif pour 30 jours. +10% visibilité !`
      });

      setDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Badge purchase error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer le badge. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRenewBadge = async () => {
    setProcessing(true);
    try {
      if ((vendorProfile.account_balance || 0) < BADGE_PRICE_MONTHLY) {
        toast({
          title: "Solde insuffisant",
          description: `Rechargez votre portefeuille de $${BADGE_PRICE_MONTHLY}.`,
          variant: "destructive"
        });
        return;
      }

      const currentExpiry = new Date(vendorProfile.cultural_badge_expiry);
      const newExpiry = isExpired 
        ? addMonths(new Date(), 1) 
        : addMonths(currentExpiry, 1);

      await base44.entities.VendorProfile.update(vendorProfile.id, {
        account_balance: (vendorProfile.account_balance || 0) - BADGE_PRICE_MONTHLY,
        cultural_badge_active: true,
        cultural_badge_expiry: newExpiry.toISOString()
      });

      await base44.entities.Transaction.create({
        user_id: vendorProfile.user_id,
        amount: -BADGE_PRICE_MONTHLY,
        type: 'subscription',
        status: 'completed',
        description: `Renouvellement Badge Culturel: ${activeBadge?.label}`
      });

      toast({
        title: "✅ Badge Renouvelé !",
        description: `Valide jusqu'au ${format(newExpiry, 'dd/MM/yyyy')}`
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de renouveler le badge.",
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
          <Award className="w-5 h-5 text-amber-600" />
          Badge d'Affinité Tribale
          <Badge className="bg-amber-500 text-white text-xs">$5/mois</Badge>
        </CardTitle>
        <p className="text-sm text-stone-500">
          Affichez votre expertise culturelle et augmentez votre classement de +10%
        </p>
      </CardHeader>
      <CardContent>
        {activeBadge && !isExpired ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-2 border-amber-300">
              <div className="text-4xl">{activeBadge.icon}</div>
              <div className="flex-1">
                <h4 className="font-bold text-stone-900">{activeBadge.label}</h4>
                <div className="flex items-center gap-2 text-sm text-stone-600 mt-1">
                  <Clock className="w-4 h-4" />
                  Expire le {format(new Date(vendorProfile.cultural_badge_expiry), 'dd/MM/yyyy')}
                </div>
              </div>
              <Badge className="bg-green-500 text-white">ACTIF</Badge>
            </div>
            <Button onClick={handleRenewBadge} disabled={processing} variant="outline" className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Renouveler pour $5
            </Button>
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                <Award className="w-4 h-4 mr-2" />
                {activeBadge ? 'Réactiver Badge' : 'Activer un Badge Culturel'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choisissez votre Badge Culturel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-stone-600">
                  Les badges culturels augmentent votre visibilité et votre crédibilité auprès des clients recherchant une expertise spécifique.
                </p>
                <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un badge" />
                  </SelectTrigger>
                  <SelectContent>
                    {CULTURAL_BADGES.map((badge) => (
                      <SelectItem key={badge.value} value={badge.value}>
                        {badge.icon} {badge.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="bg-stone-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Prix mensuel:</span>
                    <span className="font-bold">${BADGE_PRICE_MONTHLY}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Votre solde:</span>
                    <span className={`font-bold ${(vendorProfile.account_balance || 0) >= BADGE_PRICE_MONTHLY ? 'text-green-600' : 'text-red-600'}`}>
                      ${(vendorProfile.account_balance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={handlePurchaseBadge} 
                  disabled={processing || !selectedBadge}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {processing ? 'Activation...' : 'Activer Badge - $5'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {vendorProfile.plan === 'gold' && (
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-300">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-yellow-600" />
              <div>
                <h4 className="font-bold text-stone-900 flex items-center gap-2">
                  Garantie d'Intégrité Spirituelle
                  {vendorProfile.spiritual_integrity_verified && (
                    <Badge className="bg-yellow-600 text-white text-xs">VÉRIFIÉ</Badge>
                  )}
                </h4>
                <p className="text-sm text-stone-600">
                  {vendorProfile.spiritual_integrity_verified 
                    ? `Audité le ${format(new Date(vendorProfile.spiritual_audit_date), 'dd/MM/yyyy')} - Respect des rites confirmé`
                    : 'Avantage GOLD: Audit de respect des traditions et rites pour crédibilité maximale'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}