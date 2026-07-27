import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/apiClient";
import { SendEmail, UploadFile } from "@/api/integrations";
import { Loader2, FileText, Upload, ShieldAlert, Gavel, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { NotificationService } from '@/components/NotificationService';

export default function DisputeManager({ booking, currentUser, onClose }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(true);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [dispute, setDispute] = useState(null);
    const [contract, setContract] = useState(null);

    // Form for opening a new dispute
    const [newDescription, setNewDescription] = useState("");
    const [newNature, setNewNature] = useState("client_dissatisfaction");

    // Form for Negotiation / Resolution
    const [conclusion, setConclusion] = useState("");
    const [reportUrl, setReportUrl] = useState("");
    const [actionType, setActionType] = useState("negotiate");

    const isVendor = currentUser?.id === booking.planner_id;
    const canArbitrate = isVendor || currentUser?.role === 'admin';

    useEffect(() => {
        const init = async () => {
            setChecking(true);
            const contracts = await base44.entities.Contract.filter({ booking_id: booking.id });
            if (contracts.length > 0) setContract(contracts[0]);

            const disputes = await base44.entities.Dispute.filter({ booking_id: booking.id });
            if (disputes.length > 0) {
                setDispute(disputes[0]);
                setConclusion(disputes[0].negotiation_conclusion || "");
                setReportUrl(disputes[0].report_url || "");
            }
            setChecking(false);
        };
        init();
    }, [booking]);

    const handleOpenDispute = async () => {
        if (!newDescription.trim()) {
            toast({ title: "Description requise", description: "Veuillez décrire le problème.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const contracts = await base44.entities.Contract.filter({ booking_id: booking.id });
            const linkedContract = contracts[0];

            const created = await base44.entities.Dispute.create({
                dispute_code: `DSP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
                booking_id: booking.id,
                contract_id: linkedContract?.id,
                nature: newNature,
                initiator: isVendor ? 'provider' : 'client',
                description: newDescription,
                is_resolved: false,
                is_closed: false
            });

            await base44.entities.Booking.update(booking.id, { status: 'disputed' });

            await NotificationService.sendToAdmins({
                title: "Nouveau litige",
                message: `Un litige a été ouvert sur une réservation (${created.dispute_code}) par le ${isVendor ? 'prestataire' : 'client'}.`,
                type: "system",
                link: "/AdminDashboard?tab=disputes"
            });

            setDispute(created);
            toast({ title: "Litige ouvert", description: "Notre équipe a été notifiée et va examiner la situation." });
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Impossible d'ouvrir le litige.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleUploadReport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const { file_url } = await UploadFile({ file });
            setReportUrl(file_url);
            toast({ title: "File Uploaded", description: "Dispute report attached." });
        } catch (err) {
            console.error(err);
            toast({
                title: "Echec du telechargement",
                description: "Le fichier n'a pas pu être téléchargé.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateDispute = async () => {
        if (!dispute) return;
        setLoading(true);

        try {
            const updates = {
                negotiation_conclusion: conclusion,
                report_url: reportUrl,
                negotiation_date: new Date().toISOString()
            };

            if (actionType === "resolve_pay") {
                updates.is_resolved = true;
                updates.payment_authorized = true;
                updates.refund_authorized = false;
                updates.is_closed = true;
                updates.closed_date = new Date().toISOString();

                const commission = booking.total_amount * 0.05;
                await base44.entities.ProviderPayout.create({
                    payment_code: `PAY-DISP-${Date.now()}`,
                    invoice_id: "FROM-DISPUTE",
                    reception_id: dispute.reception_id || "FROM-DISPUTE",
                    contract_id: contract?.id,
                    provider_id: booking.planner_id,
                    payment_nature: "total",
                    amount_paid: booking.total_amount - commission,
                    admin_fee: commission,
                    transaction_status: "pending_approval"
                });

                await base44.entities.Booking.update(booking.id, { status: "completed" });
                toast({ title: "Dispute Resolved", description: "Payment authorized to provider." });

            } else if (actionType === "resolve_refund") {
                updates.is_resolved = true;
                updates.payment_authorized = false;
                updates.refund_authorized = true;
                updates.is_closed = true;
                updates.closed_date = new Date().toISOString();

                const txs = await base44.entities.Transaction.list();
                const tx = txs.find(t => t.reference_id === booking.id && t.status === 'escrow_held');
                let transactionRef = tx ? tx.id : "";

                const commissionRetained = booking.total_amount * 0.05;
                const amountRefunded = booking.total_amount - commissionRetained;

                let clientId = booking.created_by_id || "unknown";
                if (tx) clientId = tx.user_id;

                await base44.entities.ClientRefund.create({
                    refund_code: `RFD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
                    booking_id: booking.id,
                    dispute_id: dispute.id,
                    client_id: clientId,
                    amount_refunded: amountRefunded,
                    commission_retained: commissionRetained,
                    penalty_amount: 0,
                    reason: "Dispute Resolution: Contract Cancelled",
                    status: "pending_approval",
                    processed_date: null,
                    transaction_reference: transactionRef
                });

                try {
                    await NotificationService.sendToAdmins({
                        title: "Demande de remboursement en attente",
                        message: `Un remboursement de ${amountRefunded.toLocaleString()} FCFA nécessite votre validation (litige ${dispute.dispute_code}).`,
                        type: "payment",
                        link: "/AdminDashboard?tab=payment_proofs"
                    });
                } catch (err) {
                    console.error("Failed to notify admin", err);
                }

                await base44.entities.Booking.update(booking.id, { status: "cancelled" });
                toast({ title: "Dispute Resolved", description: "Refund request sent to Admin for approval." });
            } else {
                toast({ title: "Updated", description: "Negotiation details saved." });
            }

            await base44.entities.Dispute.update(dispute.id, updates);
            setDispute({ ...dispute, ...updates });

            if (updates.is_closed) {
                setIsOpen(false);
                if (onClose) onClose();
            }

        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur de mise à jour",
                description: "Impossible de mettre à jour le litige. Réessayez.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (checking) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val && onClose) onClose(); }}>
            <DialogContent className="max-w-2xl">
                {!dispute ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <ShieldAlert className="w-5 h-5" />
                                Signaler un litige
                            </DialogTitle>
                            <DialogDescription>
                                Décrivez le problème rencontré. Notre équipe sera notifiée immédiatement.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nature du problème</Label>
                                <Select value={newNature} onValueChange={setNewNature}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="client_dissatisfaction">Client insatisfait du service</SelectItem>
                                        <SelectItem value="non_delivery">Service non livré</SelectItem>
                                        <SelectItem value="payment_issue">Problème de paiement</SelectItem>
                                        <SelectItem value="quality_issue">Qualité non conforme</SelectItem>
                                        <SelectItem value="other">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Description du problème</Label>
                                <Textarea
                                    placeholder="Expliquez en détail ce qui s'est passé..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    rows={5}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleOpenDispute} disabled={loading} className="bg-red-600 hover:bg-red-700">
                                {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                                Ouvrir le litige
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <ShieldAlert className="w-5 h-5" />
                                Dispute Resolution Center
                            </DialogTitle>
                            <DialogDescription>
                                Case #{dispute.dispute_code} - {dispute.nature?.replace('_', ' ')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-sm">
                                <div className="flex justify-between mb-2 font-medium">
                                    <span>Initiated by: {dispute.initiator?.toUpperCase()}</span>
                                    <span>Status: {dispute.is_closed ? "CLOSED" : "OPEN"}</span>
                                </div>
                                <p className="text-stone-700 italic">"{dispute.description}"</p>
                            </div>

                            <div className="space-y-3">
                                <Label>Negotiation Conclusion / Outcome</Label>
                                <Textarea
                                    placeholder="Details of the agreement or reason for decision..."
                                    value={conclusion}
                                    onChange={(e) => setConclusion(e.target.value)}
                                    disabled={dispute.is_closed}
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Official Report / Evidence</Label>
                                <div className="flex gap-2">
                                    <Input value={reportUrl} readOnly placeholder="No file attached" className="bg-stone-50" />
                                    <div className="relative">
                                        <Button type="button" variant="outline" size="icon" disabled={dispute.is_closed || loading}>
                                            <Upload className="w-4 h-4" />
                                        </Button>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleUploadReport}
                                            disabled={dispute.is_closed || loading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {!dispute.is_closed && canArbitrate && (
                                <div className="bg-stone-50 p-4 rounded-lg border space-y-4">
                                    <Label className="font-semibold flex items-center gap-2">
                                        <Gavel className="w-4 h-4" /> Final Decision
                                    </Label>

                                    <Select value={actionType} onValueChange={setActionType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="negotiate">Save Negotiation Progress (Keep Open)</SelectItem>
                                            <SelectItem value="resolve_pay">Resolve: Authorize Payment to Provider</SelectItem>
                                            <SelectItem value="resolve_refund">Resolve: Cancel & Refund Client (Fees deducted)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {actionType === 'resolve_refund' && (
                                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                            Warning: Contract will be cancelled. 5% platform fee will be retained from the refund.
                                        </div>
                                    )}
                                    {actionType === 'resolve_pay' && (
                                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                                            Note: Contract will be marked completed. Payment will be released to provider.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            {!dispute.is_closed ? (
                                canArbitrate ? (
                                    <Button onClick={handleUpdateDispute} disabled={loading} className="bg-stone-900">
                                        {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : "Update Case"}
                                    </Button>
                                ) : (
                                    <Button onClick={handleUpdateDispute} disabled={loading} variant="outline">
                                        {loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : "Sauvegarder mes notes"}
                                    </Button>
                                )
                            ) : (
                                <div className="w-full flex justify-between items-center text-sm text-stone-500">
                                    <span>Case Closed on {new Date(dispute.closed_date).toLocaleDateString()}</span>
                                    {dispute.payment_authorized && <span className="text-green-600 font-bold flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid Provider</span>}
                                    {dispute.refund_authorized && <span className="text-amber-600 font-bold flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Refunded Client</span>}
                                </div>
                            )}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
