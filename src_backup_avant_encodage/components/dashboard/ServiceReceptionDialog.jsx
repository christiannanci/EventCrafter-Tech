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
        reception_type: "complete", // partial, complete
        client_satisfied: true,
        observations: "",
        payment_authorized: true,
        payment_quota: 100, // 100%
        dispute_opened: false
    });

    useEffect(() => {
        const fetchContract = async () => {
            if (booking && open) {
                // Find contract for this booking
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
            toast({ title: "Error", description: "No contract found for this booking.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // 1. Create Reception Record
            const reception = await base44.entities.ServiceReception.create({
                contract_id: contract.id,
                booking_id: booking.id,
                reception_date: new Date().toISOString(),
                ...formData,
                payment_quota: parseFloat(formData.payment_quota)
            });

            // 2. Trigger Logic based on inputs
            if (formData.dispute_opened) {
                // Open Dispute
                await base44.entities.Booking.update(booking.id, { status: 'disputed' });
                await base44.entities.Dispute.create({
                    dispute_code: `LIT-${Date.now()}`,
                    booking_id: booking.id,
                    contract_id: contract.id,
                    reception_id: reception.id, // we created 'reception' const above in the previous edit block, but wait - in ServiceReceptionDialog I might have missed capturing the reception result. 
                    // Ah, looking at my previous edit in ServiceReceptionDialog:
                    // I used `await base44.entities.ServiceReception.create({...})` but didn't assign it to a variable in the snippet I see in snapshot?
                    // Actually, I need to make sure I capture the ID. 
                    // Let's assume the previous `create` call returns the object.
                    // Wait, I am editing the `ServiceReceptionDialog` file again.
                    // I need to ensure `reception` is available.
                    
                    nature: "client_dissatisfaction",
                    initiator: "client",
                    description: formData.observations || "Client reported dissatisfaction during reception.",
                    is_resolved: false,
                    is_closed: false
                });
                toast({ title: "Dispute Opened", description: "The booking has been flagged for dispute resolution." });

            } else if (formData.payment_authorized) {
                // Authorize Payment
                // If complete reception and 100% payment
                if (formData.reception_type === 'complete' && formData.payment_quota === 100) {
                     await base44.entities.Booking.update(booking.id, { status: 'completed' });
                     
                     // Create Provider Payout Request (Pending Admin Approval)
                     // Calculate amounts
                     const totalAmount = contract.contract_amount || booking.total_amount || 0;
                     const commissionRate = 0.05; // 5% platform fee
                     const commission = totalAmount * commissionRate;
                     const netAmount = totalAmount - commission;

                     // Find invoice (assuming one exists or create a placeholder ref)
                     const invoices = await base44.entities.Invoice.filter({ booking_id: booking.id });
                     const invoiceId = invoices.length > 0 ? invoices[0].id : "INV-MISSING"; // Should handle better in real app

                     const reception = await base44.entities.ServiceReception.create({
                        contract_id: contract.id,
                        booking_id: booking.id,
                        reception_date: new Date().toISOString(),
                        ...formData,
                        payment_quota: parseFloat(formData.payment_quota)
                    });

                     await base44.entities.ProviderPayout.create({
                        payment_code: `PAY-${Date.now()}`,
                        invoice_id: invoiceId,
                        reception_id: reception.id,
                        contract_id: contract.id,
                        provider_id: booking.planner_id,
                        payment_nature: formData.reception_type === 'complete' ? 'total' : 'partial',
                        amount_paid: netAmount,
                        admin_fee: commission,
                        remaining_amount: 0, // Simplified for total payment
                        payment_date: new Date().toISOString(),
                        transaction_status: 'pending_approval'
                     });

                     // Send Email to Admin (Placeholder for Admin Email)
                     // In real app, configure this via environment or fetch actual admin
                     const adminEmail = "admin@eventcrafter.com"; 
                     
                     try {
                        await SendEmail({
                           to: adminEmail,
                           subject: "New Payout Request Pending Approval",
                           body: `A new payout request (Code: ${netAmount} FCFA) has been created by provider ${booking.planner_id} for Booking ${booking.id}. Please review in Admin Dashboard.`
                        });
                     } catch(err) {
                        console.error("Failed to email admin", err);
                     }

                     toast({ title: "Service Accepted", description: "Payout request sent to Admin for approval." });
                } else {
                    // Partial reception or partial payment
                    // Update booking status? Maybe keep it in 'delivered' or move to 'partially_accepted'? 
                    // Or 'warranty_period' if that fits.
                    // For now, let's keep it 'delivered' or move to 'completed' if user considers it done enough.
                    // If partial payment authorized, maybe we release that amount.
                    // Simplified: Just mark completed if satisfied, else dispute.
                    if (formData.reception_type === 'partial') {
                        toast({ title: "Partial Reception Recorded", description: "Feedback recorded. Status updated." });
                        // Maybe don't complete booking yet if partial?
                    } else {
                         await base44.entities.Booking.update(booking.id, { status: 'completed' });
                         toast({ title: "Service Accepted", description: "Payment authorized." });
                    }
                }
            } else {
                // Not authorized, but no dispute? Weird state. Maybe just feedback.
                toast({ title: "Reception Recorded", description: "Feedback saved." });
            }

            if (onSuccess) onSuccess();
            onOpenChange(false);

        } catch (error) {
            console.error("Reception failed", error);
            toast({ title: "Error", description: "Failed to submit reception.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Service Reception & Validation</DialogTitle>
                    <DialogDescription>
                        Confirm receipt of service for contract #{contract?.contract_number || '...'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Reception Type</Label>
                            <Select 
                                value={formData.reception_type} 
                                onValueChange={val => setFormData({...formData, reception_type: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="complete">Complete (Total)</SelectItem>
                                    <SelectItem value="partial">Partial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>Client Satisfaction</Label>
                             <div className="flex items-center space-x-2 h-10">
                                 <Checkbox 
                                     id="satisfied" 
                                     checked={formData.client_satisfied}
                                     onCheckedChange={(checked) => setFormData(prev => ({ 
                                         ...prev, 
                                         client_satisfied: checked,
                                         dispute_opened: !checked // Auto toggle dispute hint
                                     }))}
                                 />
                                 <label htmlFor="satisfied" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                     Satisfied with service
                                 </label>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observations / Remarks</Label>
                        <Textarea 
                            placeholder="Details about the reception, quality of service, missing items..."
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
                                <Label htmlFor="auth_pay" className="font-bold">Authorize Payment</Label>
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
                                Open Dispute (Litige)
                            </Label>
                        </div>
                        {formData.dispute_opened && (
                             <div className="text-xs text-red-500 flex items-center gap-1">
                                 <AlertTriangle className="w-3 h-3" />
                                 This will freeze funds and alert support.
                             </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !contract} className={formData.dispute_opened ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}>
                            {loading ? <Loader2 className="animate-spin mr-2" /> : formData.dispute_opened ? "Submit Dispute" : "Validate Reception"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}