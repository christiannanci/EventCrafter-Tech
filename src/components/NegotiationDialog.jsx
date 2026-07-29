import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/apiClient";
import { Calculator, FileText, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { negotiationSchema, validateData } from '@/components/ValidationSchemas';
import { NotificationService } from '@/components/NotificationService';

export default function NegotiationDialog({ booking, isClient, onConfirm }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Form State
  const [formData, setFormData] = useState({
    unit_price: booking.requested_unit_price || 0,
    quantity: booking.quantity || 1,
    unit_measure: booking.unit_measure || 'Unité',
    condition_1: booking.condition_1 || '',
    condition_2: booking.condition_2 || '',
    condition_3: booking.condition_3 || '',
    condition_4: booking.condition_4 || '',
    notes: booking.notes || ''
  });

  const totalAmount = formData.unit_price * formData.quantity;
  const commission = totalAmount * 0.05;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!isClient) {
        // Validation des données vendeur
        const validation = validateData(negotiationSchema, {
          unit_price: parseFloat(formData.unit_price),
          quantity: parseFloat(formData.quantity),
          unit_measure: formData.unit_measure,
          condition_1: formData.condition_1,
          condition_2: formData.condition_2,
          condition_3: formData.condition_3,
          condition_4: formData.condition_4,
          notes: formData.notes
        });

        if (!validation.success) {
          const firstError = Object.values(validation.errors)[0];
          toast({ 
            title: "Validation échouée", 
            description: firstError,
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
      }

      if (isClient) {
        // Client Accepting Offer
        await base44.entities.Booking.update(booking.id, {
          status: 'contract_pending',
          negotiation_status: 'contrat_attendu'
        });
        
        // Notify Vendor
        if (booking.planner_id) {
          await NotificationService.sendToVendor({
            vendorId: booking.planner_id,
            title: "Offre Acceptée",
            message: `Le client a accepté votre offre pour ${booking.event_type}. Préparez le contrat.`,
            type: "booking",
            link: "/VendorDashboard?tab=bookings_received"
          });
        }
      } else {
        // Vendor Submitting Offer
        await base44.entities.Booking.update(booking.id, {
          requested_unit_price: parseFloat(formData.unit_price),
          quantity: parseFloat(formData.quantity),
          unit_measure: formData.unit_measure,
          condition_1: formData.condition_1,
          condition_2: formData.condition_2,
          condition_3: formData.condition_3,
          condition_4: formData.condition_4,
          total_amount: totalAmount,
          commission_amount: commission,
          status: 'offer_submitted',
          negotiation_status: 'offre_soumise',
          notes: formData.notes
        });

        // Notify Client
        if (booking.created_by) {
          const users = await base44.entities.User.list();
          const client = users.find(u => u.email === booking.created_by);
          if (client) {
            await NotificationService.sendToClient({
              clientId: client.id,
              title: "Nouvelle Offre Reçue",
              message: `Le vendeur a soumis une offre de ${totalAmount.toLocaleString()} FCFA pour votre événement.`,
              type: "booking",
              link: "/ClientDashboard"
            });
          }
        }
      }
      
      setOpen(false);
      toast({ title: "Offre envoyée avec succès" });
      if (onConfirm) onConfirm();
    } catch (error) {
      console.error("Negotiation update failed", error);
      toast({ 
        title: "Échec de soumission", 
        description: error.message || "L'offre n'a pas pu être envoyée.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isClient ? (
             <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-2" /> Examiner et Accepter l'Offre
             </Button>
        ) : (
            <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Calculator className="w-4 h-4 mr-2" /> {booking.status === 'offer_submitted' ? 'Modifier l\'Offre' : 'Soumettre une Offre'}
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isClient ? "Examiner les Détails de l'Offre" : "Soumettre une Offre de Service"}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Pricing Section */}
            <div className="space-y-4">
                <h4 className="font-semibold text-stone-900 flex items-center gap-2">
                    <Calculator className="w-4 h-4" /> Tarification & Quantité
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Prix Unitaire (FCFA)</Label>
                        <Input 
                            type="number" 
                            value={formData.unit_price}
                            onChange={e => setFormData({...formData, unit_price: e.target.value})}
                            disabled={isClient}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Quantité</Label>
                        <Input 
                            type="number" 
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: e.target.value})}
                            disabled={isClient}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Unité de Mesure</Label>
                    <Input 
                        placeholder="ex. Heures, Personnes, Jours"
                        value={formData.unit_measure}
                        onChange={e => setFormData({...formData, unit_measure: e.target.value})}
                        disabled={isClient}
                    />
                </div>
                
                <div className="bg-stone-50 p-4 rounded-lg mt-4">
                    <div className="flex justify-between mb-2">
                        <span className="text-stone-500">Sous-total :</span>
                        <span className="font-medium">{totalAmount.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between mb-2 text-sm text-stone-400">
                        <span>Frais de Plateforme (5%) :</span>
                        <span>{commission.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-stone-200 font-bold text-lg text-stone-900">
                        <span>Total :</span>
                        <span>{totalAmount.toLocaleString()} FCFA</span>
                    </div>
                </div>
            </div>

            {/* Conditions Section */}
            <div className="space-y-4">
                <h4 className="font-semibold text-stone-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Conditions Générales
                </h4>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-stone-500">Condition 1</Label>
                        <Input 
                            placeholder="ex. Acompte de 50% requis"
                            value={formData.condition_1}
                            onChange={e => setFormData({...formData, condition_1: e.target.value})}
                            disabled={isClient}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-stone-500">Condition 2</Label>
                        <Input 
                            placeholder="ex. Transport inclus"
                            value={formData.condition_2}
                            onChange={e => setFormData({...formData, condition_2: e.target.value})}
                            disabled={isClient}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-stone-500">Condition 3</Label>
                        <Input 
                            placeholder="ex. Tarif heures supplémentaires applicable"
                            value={formData.condition_3}
                            onChange={e => setFormData({...formData, condition_3: e.target.value})}
                            disabled={isClient}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-stone-500">Condition 4</Label>
                        <Input 
                            placeholder="ex. Politique d'annulation"
                            value={formData.condition_4}
                            onChange={e => setFormData({...formData, condition_4: e.target.value})}
                            disabled={isClient}
                        />
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={loading} className={isClient ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}>
                {loading ? "Traitement..." : isClient ? "Accepter l'Offre" : "Soumettre l'Offre"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
