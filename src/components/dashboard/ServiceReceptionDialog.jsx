import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ServiceReceptionDialog({ booking, open, onOpenChange, onSuccess }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [contract, setContract] = useState(null);
    const [formData, setFormData] = useState({
        reception_type: "complete",
        client_satisfied: true,
        observations: "",
        payment_authorized: true,
        payment_quota: 100,
        dispute_opened: false
    });

    useEffect(() => {
        const fetchContract = async () => {
            if (booking && open) {
                const contracts = await base44.entities.Contract.filter({ booking_id: booking.id });
                if (contracts && contracts.length > 0) {
                    setContract(contracts[0]);
                }
            }
        };
        fetchContract();
    }, [booking, open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!contract) {
            toast({ title: "Erreur", description: "Aucun contrat trouvé pour cette réservation.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const reception = await base44.entities.ServiceReception.create({
                contract_id: contract.id,
                booking_id: booking.id,
                reception_date: new Date().toISOString(),
                ...formData,
                payment_quota: parseFloat(formData.payment_quota)
            });

            if (formData.dispute_opened) {
                await base44.entities.Booking.update(booking.id, { status: 'disputed' });
                await base44.entities.Dispute.create({
                    dispute_code: `LIT-${Date.now()}`,
                    booking_id: booking.id,
                    contract_id: contract.id,
                    reception_id: reception.id,
                    nature: "client_dissatisfaction",
                    initiator: "client",
                    description: formData.observations || "Le client a signalé une insatisfaction lors de la réception.",
                    is_resolved: false,
                    is_closed: false
                });
                toast({ title: "Litige Ouvert", description: "La réservation a été signalée pour résolution de litige." });

            } else if (formData.payment_authorized) {
                if (formData.reception_type === 'complete' && formData.payment_quota === 100) {
                     await base44.entities.Booking.update(booking.id, { status: 'completed' });
                     
                     const totalAmount = contract.contract_amount || booking.total_amount || 0;
                     const commissionRate = 0.05;
                     const commission = totalAmount * commissionRate;
                     const netAmount = totalAmount - commission;

                     const invoices = await base44.entities.Invoice.filter({ booking_id: booking.id });
                     const invoiceId = invoices.length > 0 ? invoices[0].id : "INV-MISSING";

                     await base44.entities.ProviderPayout.create({
                        payment_code: `PAY-${Date.now()}`,
                        invoice_id: invoiceId,
                        reception_id: reception.id,
                        contract_id: contract.id,
                        provider_id: booking.planner_id,
                        payment_nature: formData.reception_type === 'complete' ? 'total' : 'partial',
                        amount_paid: netAmount,
                        admin_fee: commission,
                        remaining_amount: 0,
                        payment_date: new Date().toISOString(),
                        transaction_status: 'pending_approval'
                     });

                     // Notifier tous les admins réels (au lieu d'un email en dur sur le mauvais domaine)
                     try {
                        const allUsers = await base44.entities.User.list();
                        const admins = allUsers.filter(u => u.role === 'admin');
                        for (const admin of admins) {
                            await SendEmail({
                               to: admin.email,
                               subject: "Nouvelle demande de paiement en attente d'approbation",
                               body: `Bonjour ${admin.full_name},\n\nUne nouvelle demande de paiement (${netAmount.toLocaleString()} FCFA) a été créée par le prestataire ${booking.planner_id} pour la réservation ${booking.id}.\n\nVeuillez l'examiner dans le tableau de bord admin.\n\nCordialement,\nL'équipe EventCrafter`
                            });
                        }
                     } catch(err) {
                        console.error("Failed to email admin", err);
                     }

                     toast({ title: "Service Accepté", description: "Demande de paiement envoyée à l'administration pour approbation." });
                } else {
                    if (formData.reception_type === 'partial') {
                        toast({ title: "Réception Partielle Enregistrée", description: "Avis enregistré. Statut mis à jour." });
                    } else {
                         await base44.entities.Booking.update(booking.id, { status: 'completed' });
                         toast({ title: "Service Accepté", description: "Paiement autorisé." });
                    }
                }
            } else {
                toast({ title: "Réception Enregistrée", description: "Avis sauvegardé." });
            }

            if (onSuccess) onSuccess();
            onOpenChange(false);

        } catch (error) {
            console.error("Reception failed", error);
            toast({ title: "Erreur", description: "Échec de la soumission de la réception.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Réception & Validation du Service</DialogTitle>
                    <DialogDescription>
                        Confirmez la réception du service pour le contrat n°{contract?.contract_number || '...'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Type de Réception</Label>
                            <Select 
                                value={formData.reception_type} 
                                onValueChange={val => setFormData({...formData, reception_type: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="complete">Complète (Totale)</SelectItem>
                                    <SelectItem value="partial">Partielle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>Satisfaction Client</Label>
                             <div className="flex items-center space-x-2 h-10">
                                 <Checkbox 
                                     id="satisfied" 
                                     checked={formData.client_satisfied}
                                     onCheckedChange={(checked) => setFormData(prev => ({ 
                                         ...prev, 
                                         client_satisfied: checked,
                                         dispute_opened: !checked
                                     }))}
                                 />
                                 <label htmlFor="satisfied" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                     Satisfait du service
                                 </label>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observations / Remarques</Label>
                        <Textarea 
                            placeholder="Détails sur la réception, qualité du service, éléments manquants..."
                            value={formData.observations}
                            onChange={e => setFormData({...formData, observations: e.target.value})}
                        />
                    </div>

                    <div className="bg-stone-50 p-4 rounded-lg border space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="auth_pay" 
                                    checked={formData.payment_authorized}
                                    onCheckedChange={(checked) => setFormData({...formData, payment_authorized: checked})}
                                />
                                <Label htmlFor="auth_pay" className="font-bold">Autoriser le Paiement</Label>
                            </div>
                            {formData.payment_authorized && (
                                <div className="flex items-center gap-2">
                                    <Label>Quota (%)</Label>
                                    <Input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        className="w-20"
                                        value={formData.payment_quota}
                                        onChange={e => setFormData({...formData, payment_quota: e.target.value})}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <Checkbox 
                                id="dispute" 
                                checked={formData.dispute_opened}
                                onCheckedChange={(checked) => setFormData({...formData, dispute_opened: checked})}
                                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                            />
                            <Label htmlFor="dispute" className={`font-bold ${formData.dispute_opened ? "text-red-600" : ""}`}>
                                Ouvrir un Litige
                            </Label>
                        </div>
                        {formData.dispute_opened && (
                             <div className="text-xs text-red-500 flex items-center gap-1">
                                 <AlertTriangle className="w-3 h-3" />
                                 Ceci va bloquer les fonds et alerter le support.
                             </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !contract} className={formData.dispute_opened ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}>
                            {loading ? <Loader2 className="animate-spin mr-2" /> : formData.dispute_opened ? "Soumettre le Litige" : "Valider la Réception"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
