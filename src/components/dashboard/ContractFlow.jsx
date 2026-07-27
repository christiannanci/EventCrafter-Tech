import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/apiClient";
import { FileSignature, CheckCircle2, ArrowRight, ArrowLeft, Edit3, FileCheck, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { generateAndSendInvoice } from '@/components/InvoiceGenerator';
import { NotificationService } from '@/components/NotificationService';

export default function ContractFlow({ booking, currentUser, open, onOpenChange, onComplete }) {
    const { toast } = useToast();
    const [step, setStep] = useState(1); // 1: Edit/Create, 2: Review, 3: Sign
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(false);
    const [providerName, setProviderName] = useState('Provider');
    const [clientName, setClientName] = useState('Client');
    const [providerSignatureName, setProviderSignatureName] = useState('');
    const [clientSignatureName, setClientSignatureName] = useState('');

    const isProvider = currentUser.id === booking.planner_id;
    const isClient = !isProvider;

    const [formData, setFormData] = useState({});

    useEffect(() => {
        if (open && booking) {
            loadContract();
            loadPartyNames();
        }
    }, [open, booking?.id]);

    const loadPartyNames = async () => {
        try {
            const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: booking.planner_id });
            if (vendorProfiles.length > 0) {
                const name = vendorProfiles[0].business_name || 'Provider';
                setProviderName(name);
                setProviderSignatureName(name);
            }

            const allUsers = await base44.entities.User.list();
            const clientUser = allUsers.find(u => u.email === booking.created_by);
            if (clientUser) {
                const clientProfiles = await base44.entities.ClientProfile.filter({ user_id: clientUser.id });
                if (clientProfiles.length > 0) {
                    const profile = clientProfiles[0];
                    const fullName = profile.first_name && profile.last_name 
                        ? `${profile.first_name} ${profile.last_name}`.trim()
                        : null;
                    const name = fullName || profile.pseudo || clientUser.full_name || clientUser.email;
                    setClientName(name);
                    setClientSignatureName(name);
                } else {
                    const name = clientUser.full_name || clientUser.email;
                    setClientName(name);
                    setClientSignatureName(name);
                }
            } else {
                const name = booking.client_name || 'Client';
                setClientName(name);
                setClientSignatureName(name);
            }
        } catch (error) {
            console.error("Error loading party names:", error);
        }
    };

    const loadContract = async () => {
        setLoading(true);
        try {
            const contracts = await base44.entities.Contract.filter({ booking_id: booking.id });
            if (contracts.length > 0) {
                const existing = contracts[0];
                setContract(existing);
                setFormData(existing);
                
                // DÃ©terminer l'Ã©tape en fonction du statut
                if (existing.status === 'draft') {
                    setStep(1);
                } else if (existing.status === 'pending_signatures') {
                    setStep(3); // Aller directement Ã  la signature
                } else if (existing.status === 'signed') {
                    setStep(3);
                }
            } else {
                // Initialiser nouveau contrat
                setFormData({
                    contract_number: `CTR-${new Date().getFullYear()}-${booking.id.slice(0, 8).toUpperCase()}`,
                    booking_id: booking.id,
                    client_account_id: booking.created_by_id,
                    provider_account_id: booking.planner_id,
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
                    jurisdiction_clause: "En cas d'impasse dans les nÃ©gociations ou de litige persistant, les tribunaux compÃ©tents seront ceux du ressort du siÃ¨ge social de la plateforme EventCrafter.",
                    cancellation_terms: "RESPONSABILITES ET ANNULATION :\n- Si l'Ã©chec du contrat est imputable au Client : Le Prestataire conserve les montants dÃ©jÃ  versÃ©s Ã  titre d'indemnitÃ©.\n- Si l'Ã©chec est imputable au Prestataire : Le Client sera remboursÃ© des sommes versÃ©es (hors frais de service).\n- ConsÃ©quences financiÃ¨res : Toute annulation entraÃ®ne l'application des pÃ©nalitÃ©s prÃ©vues aux CGU.",
                    commission_clause: "COMMISSION PLATEFORME :\nLa commission de service prÃ©levÃ©e par EventCrafter rÃ©munÃ¨re l'intermÃ©diation et la sÃ©curisation de la transaction. Elle reste acquise Ã  la plateforme en toute circonstance, quel que soit le motif de l'annulation ou l'issue du litige."
                });
                setStep(1);
            }
        } catch (error) {
            console.error("Error loading contract", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndContinue = async () => {
        setLoading(true);
        try {
            let savedContract;
            if (contract) {
                savedContract = await base44.entities.Contract.update(contract.id, formData);
            } else {
                savedContract = await base44.entities.Contract.create(formData);
            }
            setContract(savedContract);
            setStep(2); // Aller Ã  la rÃ©vision
            toast({ title: "Contrat enregistrÃ©", description: "Passez Ã  l'Ã©tape suivante" });
        } catch (error) {
            console.error("Save failed", error);
            toast({ title: "Erreur", description: "Impossible de sauvegarder le contrat", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitForSignature = async () => {
        setLoading(true);
        try {
            const updated = await base44.entities.Contract.update(contract.id, {
                status: 'pending_signatures'
            });
            setContract(updated);
            setStep(3);
            toast({ title: "Soumis", description: "Le contrat attend les signatures" });
        } catch (error) {
            toast({ title: "Erreur", description: "Ã‰chec de la soumission", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        // Valider uniquement le nom de la partie qui signe
        if (isProvider && !providerSignatureName) {
            toast({ title: "Erreur", description: "Veuillez remplir votre nom pour la signature", variant: "destructive" });
            return;
        }
        if (isClient && !clientSignatureName) {
            toast({ title: "Erreur", description: "Veuillez remplir votre nom pour la signature", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const updateData = {};
            if (isProvider) {
                updateData.provider_signed_at = new Date().toISOString();
                updateData.provider_signature_name = providerSignatureName;
            } else {
                updateData.client_signed_at = new Date().toISOString();
                updateData.client_signature_name = clientSignatureName;
            }

            const providerSigned = isProvider || contract.provider_signed_at;
            const clientSigned = isClient || contract.client_signed_at;

            if (providerSigned && clientSigned) {
                updateData.status = 'signed';
                updateData.signed_date = new Date().toISOString();
                
                // Changer statut booking vers "awaiting_payment"
                await base44.entities.Booking.update(booking.id, {
                    status: 'awaiting_payment'
                });
                
                // GÃ©nÃ©rer et envoyer la facture automatiquement
                try {
                    const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: booking.planner_id });
                    const allUsers = await base44.entities.User.list();
                    const clientUser = allUsers.find(u => u.email === booking.created_by);
                    const clientProfiles = clientUser ? await base44.entities.ClientProfile.filter({ user_id: clientUser.id }) : [];
                    
                    const { invoice } = await generateAndSendInvoice(
                        contract,
                        booking,
                        vendorProfiles[0],
                        clientProfiles[0]
                    );
                    
                    // Notifications
                    await NotificationService.sendToVendor({
                        vendorId: booking.planner_id,
                        title: "âœ… Contrat SignÃ© & Facture GÃ©nÃ©rÃ©e",
                        message: `Le contrat ${contract.contract_number} a Ã©tÃ© signÃ© par les deux parties. La facture a Ã©tÃ© envoyÃ©e par email.`,
                        type: "contract",
                        link: "/VendorDashboard?tab=dossiers"
                    });
                    
                    if (clientUser) {
                        await base44.entities.Notification.create({
                            user_id: clientUser.id,
                            title: "âœ… Contrat SignÃ© - Paiement Requis",
                            message: `Le contrat ${contract.contract_number} est finalisÃ©. Veuillez procÃ©der au paiement pour confirmer votre rÃ©servation.`,
                            type: "contract",
                            link: "/ClientDashboard",
                            is_read: false
                        });
                    }
                    
                    toast({ 
                        title: "Contrat SignÃ© & Facture EnvoyÃ©e!", 
                        description: "La facture a Ã©tÃ© gÃ©nÃ©rÃ©e et envoyÃ©e par email aux deux parties"
                    });
                } catch (invoiceError) {
                    console.error('Invoice generation failed:', invoiceError);
                    toast({ 
                        title: "Contrat SignÃ©", 
                        description: "âš ï¸ Facture non gÃ©nÃ©rÃ©e automatiquement", 
                        variant: "destructive" 
                    });
                }
            }

            const updated = await base44.entities.Contract.update(contract.id, updateData);
            setContract(updated);
            
            if (!updateData.status) {
                toast({ title: "SignÃ©!", description: "Vous avez approuvÃ© et signÃ© le contrat" });
            }
            
            if (updateData.status === 'signed') {
                setTimeout(() => {
                    onOpenChange(false);
                    if (onComplete) onComplete();
                }, 2000);
            }
        } catch (error) {
            console.error("Sign failed", error);
            toast({ title: "Erreur", description: "Ã‰chec de la signature", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const isSignedByMe = isProvider ? !!contract?.provider_signed_at : !!contract?.client_signed_at;

    const handleDownloadPDF = () => {
        const contractHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Contrat ${formData.contract_number || 'EC'}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #333; }
  h1 { text-align: center; text-transform: uppercase; font-size: 22px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
  .section { margin: 20px 0; }
  .section h2 { font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .row { display: flex; justify-content: space-between; margin: 8px 0; }
  .label { color: #666; font-size: 13px; }
  .value { font-weight: bold; font-size: 13px; }
  .financial { background: #f9f9f9; padding: 15px; border-radius: 5px; }
  .total { font-size: 18px; color: #FF6B35; font-weight: bold; }
  .legal { font-size: 11px; color: #555; background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-block { border-top: 2px solid #333; padding-top: 10px; width: 45%; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Contrat pour Services</h1>
  <p class="subtitle">Entre <strong>${providerName}</strong> (Prestataire) et <strong>${clientName}</strong> (Client)</p>
  <div class="section">
    <h2>Informations GÃ©nÃ©rales</h2>
    <div class="row"><span class="label">NumÃ©ro de contrat:</span><span class="value">${formData.contract_number || 'N/A'}</span></div>
    <div class="row"><span class="label">Point focal:</span><span class="value">${formData.focal_point_name || 'N/A'}</span></div>
    <div class="row"><span class="label">Contact:</span><span class="value">${formData.focal_point_contact || 'N/A'}</span></div>
    <div class="row"><span class="label">Date de livraison:</span><span class="value">${formData.delivery_date || 'N/A'}</span></div>
    <div class="row"><span class="label">Adresse:</span><span class="value">${formData.delivery_address || 'N/A'}</span></div>
    <div class="row"><span class="label">DÃ©lai d'exÃ©cution:</span><span class="value">${formData.execution_delay || 'N/A'}</span></div>
  </div>
  <div class="section">
    <h2>DÃ©tails Financiers</h2>
    <div class="financial">
      <div class="row"><span class="label">Prix unitaire:</span><span class="value">${formData.negotiated_unit_price || 0} FCFA</span></div>
      <div class="row"><span class="label">QuantitÃ©:</span><span class="value">${formData.quantity || 1} ${formData.negotiated_unit_measure || ''}</span></div>
      <div class="row"><span class="label">Conditions de paiement:</span><span class="value">${formData.payment_terms || 'N/A'}</span></div>
      <div class="row" style="border-top:1px solid #ddd;padding-top:10px;margin-top:10px"><span class="label">MONTANT TOTAL:</span><span class="total">${formData.contract_amount || 0} FCFA</span></div>
    </div>
  </div>
  <div class="section">
    <h2>Conditions LÃ©gales</h2>
    <p class="legal">${formData.cancellation_terms || ''}</p>
    <p class="legal" style="margin-top:10px">${formData.commission_clause || ''}</p>
  </div>
  <div class="signatures">
    <div class="sig-block">
      <strong>Prestataire</strong>
      ${contract?.provider_signed_at ? `<p>SignÃ©: ${contract.provider_signature_name || providerName}</p><p style="font-size:11px;color:#666">${new Date(contract.provider_signed_at).toLocaleDateString('fr-FR')}</p>` : '<p style="color:#999;font-style:italic">Non signÃ©</p>'}
    </div>
    <div class="sig-block">
      <strong>Client</strong>
      ${contract?.client_signed_at ? `<p>SignÃ©: ${contract.client_signature_name || clientName}</p><p style="font-size:11px;color:#666">${new Date(contract.client_signed_at).toLocaleDateString('fr-FR')}</p>` : '<p style="color:#999;font-style:italic">Non signÃ©</p>'}
    </div>
  </div>
  <div class="footer">Document gÃ©nÃ©rÃ© par EventCrafter Marketplace - Valeur lÃ©gale selon CGU</div>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(contractHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <FileSignature className="w-5 h-5 text-amber-600" />
                            Contrat de Service {contract?.contract_number}
                        </span>
                        {contract?.status === 'signed' && (
                            <span className="text-green-600 flex items-center text-sm bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                <CheckCircle2 className="w-4 h-4 mr-2" /> SignÃ©
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* Steps Indicator */}
                <div className="flex items-center justify-center gap-2 py-4 border-b">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-rose-600' : 'text-stone-300'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-rose-600 text-white' : 'bg-stone-200'}`}>
                            {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                        </div>
                        <span className="text-sm font-medium">Ã‰diter</span>
                    </div>
                    <div className="w-12 h-0.5 bg-stone-200" />
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-rose-600' : 'text-stone-300'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-rose-600 text-white' : 'bg-stone-200'}`}>
                            {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                        </div>
                        <span className="text-sm font-medium">RÃ©viser</span>
                    </div>
                    <div className="w-12 h-0.5 bg-stone-200" />
                    <div className={`flex items-center gap-2 ${step >= 3 ? 'text-rose-600' : 'text-stone-300'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-rose-600 text-white' : 'bg-stone-200'}`}>
                            3
                        </div>
                        <span className="text-sm font-medium">Signer</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-6 bg-stone-50">
                    {step === 1 && (
                        <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 rounded-lg shadow-sm">
                            <div className="text-center border-b pb-4">
                                <h2 className="text-2xl font-bold text-stone-900">CONTRAT POUR SERVICES</h2>
                                <p className="text-stone-500 mt-2">Entre <strong>{providerName}</strong> (Prestataire) et <strong>{clientName}</strong> (Client)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>NumÃ©ro de contrat</Label>
                                    <Input disabled value={formData.contract_number || ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nom du point focal</Label>
                                    <Input 
                                        value={formData.focal_point_name || ''} 
                                        onChange={e => setFormData({...formData, focal_point_name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact de point focal</Label>
                                    <Input 
                                        value={formData.focal_point_contact || ''} 
                                        onChange={e => setFormData({...formData, focal_point_contact: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Retard d'exÃ©cution</Label>
                                    <Input 
                                        value={formData.execution_delay || ''} 
                                        onChange={e => setFormData({...formData, execution_delay: e.target.value})}
                                        placeholder="par ex 3 jours"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-lg mb-4">DÃ©tails de livraison</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Date de livraison</Label>
                                        <Input 
                                            type="date"
                                            value={formData.delivery_date || ''} 
                                            onChange={e => setFormData({...formData, delivery_date: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Code de voisinage</Label>
                                        <Input 
                                            value={formData.delivery_neighborhood_code || ''} 
                                            onChange={e => setFormData({...formData, delivery_neighborhood_code: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Adresse de livraison</Label>
                                        <Input 
                                            value={formData.delivery_address || ''} 
                                            onChange={e => setFormData({...formData, delivery_address: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-lg mb-4">Finances & Conditions</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Prix unitaire</Label>
                                        <Input 
                                            type="number"
                                            value={formData.negotiated_unit_price || ''} 
                                            onChange={e => setFormData({...formData, negotiated_unit_price: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>QuantitÃ©</Label>
                                        <Input 
                                            type="number"
                                            value={formData.quantity || ''} 
                                            onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>UnitÃ© de mesure</Label>
                                        <Input 
                                            value={formData.negotiated_unit_measure || ''} 
                                            onChange={e => setFormData({...formData, negotiated_unit_measure: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>Montant total du contrat</Label>
                                        <Input 
                                            type="number"
                                            className="font-bold text-lg"
                                            value={formData.contract_amount || ''} 
                                            onChange={e => setFormData({...formData, contract_amount: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Conditions de paiement</Label>
                                        <Input 
                                            value={formData.payment_terms || ''} 
                                            onChange={e => setFormData({...formData, payment_terms: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 rounded-lg shadow-sm">
                            <div className="text-center border-b pb-4">
                                <h2 className="text-2xl font-bold text-stone-900">RÃ‰VISION DU CONTRAT</h2>
                                <p className="text-stone-500 mt-2">VÃ©rifiez tous les dÃ©tails avant de soumettre</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-stone-500 font-medium">NumÃ©ro de contrat</p>
                                        <p className="font-semibold">{formData.contract_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 font-medium">Point focal</p>
                                        <p className="font-semibold">{formData.focal_point_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 font-medium">Date de livraison</p>
                                        <p className="font-semibold">{formData.delivery_date}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500 font-medium">DÃ©lai d'exÃ©cution</p>
                                        <p className="font-semibold">{formData.execution_delay || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-bold mb-3">DÃ©tails financiers</h3>
                                    <div className="bg-stone-50 p-4 rounded-lg space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-stone-600">Prix unitaire:</span>
                                            <span className="font-semibold">{formData.negotiated_unit_price} FCFA</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-stone-600">QuantitÃ©:</span>
                                            <span className="font-semibold">{formData.quantity} {formData.negotiated_unit_measure}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                            <span className="text-stone-900 font-bold">Montant total:</span>
                                            <span className="font-bold text-lg text-rose-600">{formData.contract_amount} FCFA</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-bold mb-3">Conditions lÃ©gales</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="font-semibold text-stone-700">1. Commission Plateforme</p>
                                            <p className="text-stone-600 text-xs">{formData.commission_clause}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-stone-700">2. ResponsabilitÃ©s et Annulation</p>
                                            <p className="text-stone-600 text-xs whitespace-pre-line">{formData.cancellation_terms}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-stone-700">3. Juridiction CompÃ©tente</p>
                                            <p className="text-stone-600 text-xs">{formData.jurisdiction_clause}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="max-w-3xl mx-auto space-y-6 bg-white p-8 rounded-lg shadow-sm">
                            <div className="text-center border-b pb-4">
                                <h2 className="text-2xl font-bold text-stone-900">SIGNATURE DU CONTRAT</h2>
                                <p className="text-stone-500 mt-2">Les deux parties doivent signer pour valider</p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 py-8">
                                {/* Prestataire */}
                                <div className="border-2 rounded-lg p-6">
                                    <p className="font-bold text-sm uppercase text-stone-500 mb-4 text-center">Prestataire</p>
                                    <p className="text-sm text-stone-600 mb-3 text-center">{providerName}</p>
                                    
                                    {!contract?.provider_signed_at && isProvider ? (
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-xs mb-1">Nom/Compagnie (Signature)</Label>
                                                <Input 
                                                    value={providerSignatureName} 
                                                    onChange={(e) => setProviderSignatureName(e.target.value)}
                                                    placeholder="Votre nom ou nom de compagnie"
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    ) : contract?.provider_signed_at ? (
                                        <div className="space-y-2 text-center">
                                            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                                            <p className="text-green-600 font-medium">SignÃ©</p>
                                            <p className="text-xs text-stone-600 font-medium">{contract?.provider_signature_name}</p>
                                            <p className="text-xs text-stone-500">
                                                {format(new Date(contract.provider_signed_at), 'dd/MM/yyyy HH:mm')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-center">
                                            <FileCheck className="w-12 h-12 text-stone-300 mx-auto" />
                                            <p className="text-stone-400 italic text-sm">En attente de signature...</p>
                                        </div>
                                    )}
                                </div>

                                {/* Client */}
                                <div className="border-2 rounded-lg p-6">
                                    <p className="font-bold text-sm uppercase text-stone-500 mb-4 text-center">Client</p>
                                    <p className="text-sm text-stone-600 mb-3 text-center">{clientName}</p>
                                    
                                    {!contract?.client_signed_at && isClient ? (
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-xs mb-1">Nom/Compagnie (Signature)</Label>
                                                <Input 
                                                    value={clientSignatureName} 
                                                    onChange={(e) => setClientSignatureName(e.target.value)}
                                                    placeholder="Votre nom ou nom de compagnie"
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    ) : contract?.client_signed_at ? (
                                        <div className="space-y-2 text-center">
                                            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                                            <p className="text-green-600 font-medium">SignÃ©</p>
                                            <p className="text-xs text-stone-600 font-medium">{contract?.client_signature_name}</p>
                                            <p className="text-xs text-stone-500">
                                                {format(new Date(contract.client_signed_at), 'dd/MM/yyyy HH:mm')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-center">
                                            <FileCheck className="w-12 h-12 text-stone-300 mx-auto" />
                                            <p className="text-stone-400 italic text-sm">En attente de signature...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {contract?.status === 'signed' && (
                                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                                    <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
                                    <h3 className="text-xl font-bold text-green-900 mb-2">Contrat ValidÃ© !</h3>
                                    <p className="text-green-700">Les deux parties ont signÃ©. Le contrat est maintenant actif.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="border-t p-4 bg-white flex justify-between items-center">
                    <div>
                        {step > 1 && step < 3 && contract?.status === 'draft' && (
                            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Retour
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {step === 1 && (
                            <Button onClick={handleSaveAndContinue} disabled={loading} className="bg-rose-600 hover:bg-rose-700">
                                {loading ? "Sauvegarde..." : "Enregistrer et Continuer"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                        
                        {step === 2 && contract?.status === 'draft' && (
                            <>
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Modifier
                                </Button>
                                <Button onClick={handleSubmitForSignature} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    {loading ? "Soumission..." : "Soumettre pour Signature"}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </>
                        )}

                        {step === 3 && !isSignedByMe && contract?.status === 'pending_signatures' && (
                            <Button onClick={handleSign} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                                <FileSignature className="w-4 h-4 mr-2" />
                                {loading ? "Signature..." : `Approuver et Signer (${isProvider ? 'Prestataire' : 'Client'})`}
                            </Button>
                        )}

                        {step === 3 && isSignedByMe && contract?.status === 'pending_signatures' && (
                            <div className="text-sm text-green-600 font-medium flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                                <CheckCircle2 className="w-4 h-4" />
                                Vous avez signÃ© - En attente de l'autre partie
                            </div>
                        )}

                        {contract?.status === 'signed' && (
                            <>
                                <Button variant="outline" onClick={handleDownloadPDF}>
                                    <Download className="w-4 h-4 mr-2" /> TÃ©lÃ©charger PDF
                                </Button>
                                <Button onClick={() => onOpenChange(false)} className="bg-rose-600 hover:bg-rose-700">
                                    Fermer
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
