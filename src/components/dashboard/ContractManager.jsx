import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from "@/api/apiClient";
import { FileSignature, PenLine, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function ContractManager({ booking, currentUser, onUpdate }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [providerName, setProviderName] = useState('Provider');
    const [clientName, setClientName] = useState('Client');

    // Determines if current user is the provider or client
    const isProvider = currentUser.id === booking.planner_id;
    const isClient = !isProvider; // Assuming valid access

    const [formData, setFormData] = useState({});

    // Fetch existing contract or prepare default data
    useEffect(() => {
        if (open) {
            fetchContract();
            loadPartyNames();
        }
    }, [open, booking.id]);

    const loadPartyNames = async () => {
        try {
            // Get provider name
            const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: booking.planner_id });
            if (vendorProfiles.length > 0) {
                setProviderName(vendorProfiles[0].business_name || 'Provider');
            }

            // Get client name
            const allUsers = await base44.entities.User.list();
            const clientUser = allUsers.find(u => u.email === booking.created_by);
            if (clientUser) {
                const clientProfiles = await base44.entities.ClientProfile.filter({ user_id: clientUser.id });
                if (clientProfiles.length > 0) {
                    const profile = clientProfiles[0];
                    const fullName = profile.first_name && profile.last_name 
                        ? `${profile.first_name} ${profile.last_name}`.trim()
                        : null;
                    setClientName(fullName || profile.pseudo || clientUser.full_name || clientUser.email);
                } else {
                    setClientName(clientUser.full_name || clientUser.email);
                }
            } else {
                setClientName(booking.client_name || 'Client');
            }
        } catch (error) {
            console.error("Error loading party names:", error);
            toast({ 
                title: "Erreur de chargement", 
                description: "Impossible de charger les noms des parties.",
                variant: "destructive" 
            });
        }
    };

    const fetchContract = async () => {
        setLoading(true);
        try {
            const contracts = await base44.entities.Contract.filter({ booking_id: booking.id });
            if (contracts.length > 0) {
                const existing = contracts[0];
                setContract(existing);
                setFormData(existing);
            } else {
                // Initialize default form data from booking
                setFormData({
                    contract_number: `CTR-${new Date().getFullYear()}-${booking.id.slice(0, 8).toUpperCase()}`,
                    booking_id: booking.id,
                    delivery_address: "",
                    delivery_neighborhood_code: "",
                    delivery_date: booking.event_date || "",
                    execution_delay: "",
                    focal_point_name: isClient ? currentUser.full_name : booking.client_name,
                    focal_point_contact: isClient ? currentUser.email : "", 
                    negotiated_unit_price: booking.requested_unit_price || 0,
                    quantity: booking.quantity || 1,
                    negotiated_unit_measure: booking.unit_measure || "Unit",
                    contract_amount: booking.total_amount || 0,
                    payment_terms: "100% Escrow Release upon completion",
                    status: 'draft',
                    jurisdiction_clause: "En cas d'impasse dans les négociations ou de litige persistant, les tribunaux compétents seront ceux du ressort du siège social de la plateforme EventCrafter.",
                    cancellation_terms: "RESPONSABILITES ET ANNULATION :\n- Si l'échec du contrat est imputable au Client : Le Prestataire conserve les montants déjà versés à titre d'indemnité.\n- Si l'échec est imputable au Prestataire : Le Client sera remboursé des sommes versées (hors frais de service).\n- Conséquences financières : Toute annulation entraîne l'application des pénalités prévues aux CGU.",
                    commission_clause: "COMMISSION PLATEFORME :\nLa commission de service prélevée par EventCrafter rémunère l'intermédiation et la sécurisation de la transaction. Elle reste acquise à la plateforme en toute circonstance, quel que soit le motif de l'annulation ou l'issue du litige."
                });
                setIsEditing(true); // Force edit mode for new contract
            }
        } catch (error) {
            console.error("Error fetching contract", error);
            toast({ 
                title: "Erreur de chargement", 
                description: "Impossible de charger le contrat.",
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let savedContract;
            if (contract) {
                savedContract = await base44.entities.Contract.update(contract.id, formData);
                toast({ title: "Contract Updated", description: "Changes saved successfully." });
            } else {
                savedContract = await base44.entities.Contract.create(formData);
                toast({ title: "Contract Created", description: "Contract draft created." });
            }
            setContract(savedContract);
            setIsEditing(false);
            if(onUpdate) onUpdate();
        } catch (error) {
            console.error("Save failed", error);
            toast({ 
                title: "Échec de sauvegarde", 
                description: "Le contrat n'a pas pu être sauvegardé. Vérifiez les champs.",
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitForSignature = async () => {
        if (!contract) return;
        setLoading(true);
        try {
            const updated = await base44.entities.Contract.update(contract.id, {
                status: 'pending_signatures'
            });
            setContract(updated);
            toast({ title: "Soumis pour signature", description: "Le contrat attend les signatures." });
        } catch (error) {
            toast({ 
                title: "Échec de soumission", 
                description: "Impossible de soumettre le contrat.",
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        if (!contract) return;
        setLoading(true);
        try {
            const updateData = {};
            if (isProvider) {
                updateData.provider_signed_at = new Date().toISOString();
            } else {
                updateData.client_signed_at = new Date().toISOString();
            }

            // Check if both signed after this update
            const providerSigned = isProvider || contract.provider_signed_at;
            const clientSigned = isClient || contract.client_signed_at;

            if (providerSigned && clientSigned) {
                updateData.status = 'signed';
                updateData.signed_date = new Date().toISOString();
                
                // Also update Booking status to move forward
                await base44.entities.Booking.update(booking.id, {
                    status: 'awaiting_payment' // Move to payment phase
                });
            }

            const updated = await base44.entities.Contract.update(contract.id, updateData);
            setContract(updated);
            toast({ title: "Signed", description: "You have signed the contract successfully." });
            if(onUpdate) onUpdate();
        } catch (error) {
            console.error("Sign failed", error);
            toast({ 
                title: "Échec de signature", 
                description: "La signature n'a pas pu être enregistrée. Réessayez.",
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const isSignedByMe = isProvider ? !!contract?.provider_signed_at : !!contract?.client_signed_at;
    const canEdit = !isSignedByMe && contract?.status !== 'signed';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                    <FileSignature className="w-4 h-4 mr-2" /> 
                    {booking.status === 'contract_pending' ? 'Manage Contract' : 'View Contract'}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Service Contract {contract ? `- ${contract.contract_number}` : '(New)'}</span>
                        {contract?.status === 'signed' && (
                             <span className="text-green-600 flex items-center text-sm bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                 <CheckCircle2 className="w-4 h-4 mr-2" /> Fully Signed
                             </span>
                        )}
                        {contract?.status === 'pending_signatures' && (
                             <span className="text-amber-600 flex items-center text-sm bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                 <PenLine className="w-4 h-4 mr-2" /> Pending Signatures
                             </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-grow p-4 border rounded-md bg-stone-50">
                    <div className="space-y-6 max-w-3xl mx-auto bg-white p-8 shadow-sm min-h-full">
                        {/* Header Section */}
                        <div className="text-center border-b pb-6 mb-6">
                            <h2 className="text-2xl font-bold text-stone-900 uppercase">Contract for Services</h2>
                            <p className="text-stone-500 mt-2">Between <strong>{providerName}</strong> (Provider) and <strong>{clientName}</strong> (Client)</p>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Contract Number</Label>
                                <Input disabled value={formData.contract_number || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label>Focal Point Name</Label>
                                <Input 
                                    value={formData.focal_point_name || ''} 
                                    onChange={e => setFormData({...formData, focal_point_name: e.target.value})}
                                    disabled={!isEditing}
                                    placeholder="Name of contact person"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Focal Point Contact</Label>
                                <Input 
                                    value={formData.focal_point_contact || ''} 
                                    onChange={e => setFormData({...formData, focal_point_contact: e.target.value})}
                                    disabled={!isEditing}
                                    placeholder="Phone or Email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Execution Delay</Label>
                                <Input 
                                    value={formData.execution_delay || ''} 
                                    onChange={e => setFormData({...formData, execution_delay: e.target.value})}
                                    disabled={!isEditing}
                                    placeholder="e.g. 3 Days"
                                />
                            </div>
                        </div>

                        <div className="my-6 border-t pt-6">
                            <h3 className="font-semibold text-lg mb-4">Delivery Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Delivery Date</Label>
                                    <Input 
                                        type="date"
                                        value={formData.delivery_date || ''} 
                                        onChange={e => setFormData({...formData, delivery_date: e.target.value})}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Neighborhood Code</Label>
                                    <Input 
                                        value={formData.delivery_neighborhood_code || ''} 
                                        onChange={e => setFormData({...formData, delivery_neighborhood_code: e.target.value})}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="col-span-full space-y-2">
                                    <Label>Delivery Address</Label>
                                    <Input 
                                        value={formData.delivery_address || ''} 
                                        onChange={e => setFormData({...formData, delivery_address: e.target.value})}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="my-6 border-t pt-6">
                            <h3 className="font-semibold text-lg mb-4">Financials & Terms</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Unit Price</Label>
                                    <Input 
                                        type="number"
                                        value={formData.negotiated_unit_price || ''} 
                                        onChange={e => setFormData({...formData, negotiated_unit_price: parseFloat(e.target.value)})}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input 
                                        type="number"
                                        value={formData.quantity || ''} 
                                        onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit Measure</Label>
                                    <Input 
                                        value={formData.negotiated_unit_measure || ''} 
                                        onChange={e => setFormData({...formData, negotiated_unit_measure: e.target.value})}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Total Contract Amount</Label>
                                    <Input 
                                        type="number"
                                        className="font-bold bg-stone-50"
                                        value={formData.contract_amount || ''} 
                                        onChange={e => setFormData({...formData, contract_amount: parseFloat(e.target.value)})}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Payment Terms</Label>
                                    <Input 
                                        value={formData.payment_terms || ''} 
                                        onChange={e => setFormData({...formData, payment_terms: e.target.value})}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                            
                            {/* Legal Clauses Section */}
                            <div className="my-6 border-t pt-6 bg-stone-50 p-4 rounded-md">
                                <h3 className="font-semibold text-lg mb-4 text-stone-900">Legal Terms & Conditions</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Jurisdiction Clause (Juridiction Compétente)</Label>
                                        <Textarea 
                                            value={formData.jurisdiction_clause || ''} 
                                            onChange={e => setFormData({...formData, jurisdiction_clause: e.target.value})}
                                            disabled={!isEditing}
                                            className="h-20 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cancellation & Dispute Terms</Label>
                                        <Textarea 
                                            value={formData.cancellation_terms || ''} 
                                            onChange={e => setFormData({...formData, cancellation_terms: e.target.value})}
                                            disabled={!isEditing}
                                            className="h-32 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Platform Commission Clause</Label>
                                        <Textarea 
                                            value={formData.commission_clause || ''} 
                                            onChange={e => setFormData({...formData, commission_clause: e.target.value})}
                                            disabled={true} // Always fixed
                                            className="h-20 text-xs bg-stone-100"
                                        />
                                    </div>
                                </div>
                            </div>

                             {/* Accounts - Simpler input for now */}
                             <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Client Account ID (Debit)</Label>
                                    <Input 
                                        value={formData.client_account_id || ''} 
                                        onChange={e => setFormData({...formData, client_account_id: e.target.value})}
                                        disabled={!isEditing}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Provider Account ID (Credit)</Label>
                                    <Input 
                                        value={formData.provider_account_id || ''} 
                                        onChange={e => setFormData({...formData, provider_account_id: e.target.value})}
                                        disabled={!isEditing}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Signatures Section */}
                        {/* Legal View Mode */}
                        {!isEditing && (
                            <div className="my-8 border-t pt-8 space-y-6">
                                <h3 className="font-serif font-bold text-center border-b pb-2">MENTIONS LÉGALES ET CONDITIONS</h3>
                                <div className="grid gap-6 text-sm text-justify">
                                    <div>
                                        <strong className="block mb-1">1. COMMISSION PLATEFORME</strong>
                                        <p className="whitespace-pre-wrap text-stone-600">{formData.commission_clause}</p>
                                    </div>
                                    <div>
                                        <strong className="block mb-1">2. RESPONSABILITÉS ET ANNULATION</strong>
                                        <p className="whitespace-pre-wrap text-stone-600">{formData.cancellation_terms}</p>
                                    </div>
                                    <div>
                                        <strong className="block mb-1">3. JURIDICTION COMPÉTENTE</strong>
                                        <p className="whitespace-pre-wrap text-stone-600">{formData.jurisdiction_clause}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="my-8 border-t pt-8 grid grid-cols-2 gap-12">
                            <div className="border-t-2 border-stone-300 pt-2">
                                <p className="font-bold text-sm uppercase mb-1">Provider Signature</p>
                                {contract?.provider_signed_at ? (
                                    <div className="text-green-600 text-sm">
                                        Signed on {format(new Date(contract.provider_signed_at), 'PPP p')}
                                    </div>
                                ) : (
                                    <div className="text-stone-400 text-sm italic">Pending signature...</div>
                                )}
                            </div>
                            <div className="border-t-2 border-stone-300 pt-2">
                                <p className="font-bold text-sm uppercase mb-1">Client Signature</p>
                                {contract?.client_signed_at ? (
                                    <div className="text-green-600 text-sm">
                                        Signed on {format(new Date(contract.client_signed_at), 'PPP p')}
                                    </div>
                                ) : (
                                    <div className="text-stone-400 text-sm italic">Pending signature...</div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="py-4 border-t px-6 bg-stone-50">
                    <div className="flex w-full justify-between items-center">
                        <div>
                             {contract?.status === 'signed' && (
                                <Button variant="outline" className="text-stone-600">
                                    <Download className="w-4 h-4 mr-2" /> Télécharger PDF
                                </Button>
                             )}
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                             {/* Mode Edition */}
                             {canEdit && isEditing && (
                                <>
                                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                                        Annuler
                                    </Button>
                                    <Button onClick={handleSave} disabled={loading} className="bg-rose-600 hover:bg-rose-700">
                                        {loading ? "Sauvegarde..." : "Enregistrer Draft"}
                                    </Button>
                                </>
                             )}
                             
                             {/* Mode Visualisation */}
                             {!isEditing && (
                                <>
                                    {/* Bouton Edit (si pas encore signé par moi) */}
                                    {canEdit && contract?.status !== 'signed' && (
                                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                                            Modifier Contrat
                                        </Button>
                                    )}

                                    {/* Bouton Soumettre pour Signature (si draft) */}
                                    {canEdit && contract?.status === 'draft' && (
                                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmitForSignature} disabled={loading}>
                                            <FileSignature className="w-4 h-4 mr-2" />
                                            {loading ? "Soumission..." : "Soumettre pour Signature"}
                                        </Button>
                                    )}

                                    {/* Bouton Signer (si pending_signatures et pas encore signé par moi) */}
                                    {!isSignedByMe && contract?.status === 'pending_signatures' && (
                                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSign} disabled={loading}>
                                            <PenLine className="w-4 h-4 mr-2" /> 
                                            {loading ? "Signature..." : `Approuver et Signer (${isProvider ? 'Prestataire' : 'Client'})`}
                                        </Button>
                                    )}

                                    {/* Message si déjà signé par moi */}
                                    {isSignedByMe && contract?.status === 'pending_signatures' && (
                                        <div className="text-sm text-green-600 font-medium flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Vous avez signé - En attente de l'autre partie
                                        </div>
                                    )}
                                </>
                             )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}