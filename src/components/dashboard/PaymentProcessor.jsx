import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from "@/api/apiClient";
import { CreditCard, Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { NotificationService } from '@/components/NotificationService';

export default function PaymentProcessor({ booking, contract, open, onOpenChange, onSuccess }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('mtn');

  const handlePayment = async () => {
    if (paymentMethod === 'mobile_money' && !phoneNumber) {
      toast({ 
        title: "Numéro requis", 
        description: "Veuillez entrer votre numéro de téléphone",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // Simuler le paiement (intégration réelle à faire)
      const amount = contract.contract_amount || booking.total_amount || 0;
      
      // Créer la transaction
      const transaction = await base44.entities.Transaction.create({
        booking_id: booking.id,
        user_id: booking.created_by,
        amount: amount,
        currency: 'XAF',
        status: 'completed',
        payment_method: paymentMethod,
        payment_provider: provider,
        payment_phone: phoneNumber,
        description: `Paiement contrat ${contract?.contract_number || booking.id}`,
        transaction_type: 'payment'
      });

      // Mettre à jour le statut du booking
      await base44.entities.Booking.update(booking.id, {
        status: 'in_progress',
        payment_status: 'deposit_paid',
        paid_amount: amount
      });

      // Obtenir les informations du vendeur
      const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: booking.planner_id });
      const vendorProfile = vendorProfiles[0];

      // Obtenir les informations du client
      const allUsers = await base44.entities.User.list();
      const clientUser = allUsers.find(u => u.email === booking.created_by);

      // Notification au VENDEUR
      await NotificationService.sendToVendor({
        vendorId: booking.planner_id,
        title: "💰 Fonds Reçus !",
        message: `Paiement confirmé de ${amount.toLocaleString()} FCFA pour le contrat ${contract?.contract_number || booking.id}. Vous pouvez commencer la préparation !`,
        type: "payment",
        link: "/VendorDashboard?tab=dossiers"
      });

      // Notification au CLIENT
      if (clientUser) {
        await base44.entities.Notification.create({
          user_id: clientUser.id,
          title: "✅ Paiement Confirmé !",
          message: `Votre événement est sécurisé ! Paiement de ${amount.toLocaleString()} FCFA confirmé. Le prestataire commence la préparation.`,
          type: "payment",
          link: "/ClientDashboard",
          is_read: false
        });
      }

      toast({
        title: "🎉 Paiement Réussi !",
        description: "Votre événement est maintenant confirmé"
      });

      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        title: "Erreur de paiement",
        description: "Impossible de traiter le paiement. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const amount = contract?.contract_amount || booking?.total_amount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            Procéder au Paiement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Résumé */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
            <p className="text-sm text-stone-600 mb-1">Montant à payer</p>
            <p className="text-3xl font-bold text-green-700">{amount.toLocaleString()} FCFA</p>
            {contract?.contract_number && (
              <p className="text-xs text-stone-500 mt-2">Contrat: {contract.contract_number}</p>
            )}
          </div>

          {/* Méthode de paiement */}
          <div className="space-y-3">
            <Label>Méthode de Paiement</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-stone-50">
                <RadioGroupItem value="mobile_money" id="mobile" />
                <Label htmlFor="mobile" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span>Mobile Money (MTN / Orange)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-stone-50 opacity-50">
                <RadioGroupItem value="card" id="card" disabled />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Carte Bancaire (Bientôt)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {paymentMethod === 'mobile_money' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Opérateur</Label>
                <RadioGroup value={provider} onValueChange={setProvider}>
                  <div className="flex gap-3">
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-stone-50 flex-1">
                      <RadioGroupItem value="mtn" id="mtn" />
                      <Label htmlFor="mtn" className="cursor-pointer flex-1 text-center font-semibold text-yellow-600">
                        MTN
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-stone-50 flex-1">
                      <RadioGroupItem value="orange" id="orange" />
                      <Label htmlFor="orange" className="cursor-pointer flex-1 text-center font-semibold text-orange-600">
                        Orange
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="6XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={9}
                />
                <p className="text-xs text-stone-500">
                  Vous recevrez une notification pour approuver le paiement
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmer le Paiement
              </>
            )}
          </Button>

          <p className="text-xs text-center text-stone-500">
            Paiement sécurisé par EventCrafter. Vos fonds sont protégés jusqu'à la livraison du service.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}