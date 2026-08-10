import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { FileText, Plus, Download, Send, CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function generateInvoiceFile(invoiceData, booking) {
    const invoiceHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Facture ${invoiceData.invoice_number}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
  .header { background: #FF6B35; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { margin: 0; font-size: 28px; }
  .invoice-meta { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
  td { padding: 10px; border-bottom: 1px solid #eee; }
  .total-section { text-align: right; margin: 20px 0; }
  .total-amount { font-size: 20px; font-weight: bold; color: #FF6B35; }
  .footer { background: #f5f5f5; padding: 15px; text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div><h1>EventCrafter</h1><p style="margin:0">Marketplace</p></div>
    <div class="invoice-meta">
      <h2 style="margin:0;color:white">FACTURE</h2>
      <p style="margin:0">N. ${invoiceData.invoice_number}</p>
      <p style="margin:0">Emise le: ${new Date(invoiceData.issued_date).toLocaleDateString('fr-FR')}</p>
      <p style="margin:0">Echeance: ${new Date(invoiceData.due_date).toLocaleDateString('fr-FR')}</p>
    </div>
  </div>
  <div style="margin: 20px 0;">
    <p><strong>Facture a :</strong> ${invoiceData.billing_address || ''}</p>
    ${invoiceData.focal_point_name ? `<p><strong>A l'attention de :</strong> ${invoiceData.focal_point_name}</p>` : ''}
    ${invoiceData.focal_point_contact ? `<p><strong>Contact :</strong> ${invoiceData.focal_point_contact}</p>` : ''}
  </div>
  <table>
    <thead><tr><th>Description</th><th>Quantite</th><th>Prix Unitaire</th><th>Total</th></tr></thead>
    <tbody>
      ${invoiceData.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${item.unit_price.toLocaleString()} FCFA</td>
        <td>${item.total.toLocaleString()} FCFA</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="total-section">
    <p class="total-amount">TOTAL: ${invoiceData.amount.toLocaleString()} FCFA</p>
  </div>
  <div class="footer">
    <p>EventCrafter Marketplace - Plateforme de services evenementiels</p>
    <p>Contact: support@eventcraftercm.com | +237 670 93 43 78 | Merci de votre confiance !</p>
  </div>
</body>
</html>`;

    const htmlBlob = new Blob([invoiceHtml], { type: 'text/html' });
    const invoiceFile = new File([htmlBlob], `Facture_${invoiceData.invoice_number}.html`, { type: 'text/html' });
    const { file_url } = await UploadFile({ file: invoiceFile });
    return file_url;
}

export default function InvoiceManager({ booking, currentUser, onPaymentClick }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState("list");
    const [contract, setContract] = useState(null);

    const isProvider = currentUser.id === booking.planner_id;

    const [newInvoice, setNewInvoice] = useState({
        type: "global",
        percentage: 100,
        amount: 0,
        due_date: "",
        billing_address: "",
        focal_point_name: "",
        focal_point_contact: ""
    });

    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open, booking.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const invs = await base44.entities.Invoice.filter({ booking_id: booking.id });
            setInvoices(invs);

            const contracts = await base44.entities.Contract.filter({ booking_id: booking.id, status: 'signed' });
            if (contracts.length > 0) {
                const c = contracts[0];
                setContract(c);
                setNewInvoice(prev => ({ 
                    ...prev, 
                    amount: c.contract_amount,
                    billing_address: c.delivery_address || "",
                    focal_point_name: c.focal_point_name || "",
                    focal_point_contact: c.focal_point_contact || ""
                }));
            } else {
                setNewInvoice(prev => ({ ...prev, amount: booking.total_amount }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvoice = async () => {
        setLoading(true);
        try {
            const totalAmount = contract ? contract.contract_amount : booking.total_amount;
            let finalAmount = newInvoice.amount;
            
            if (newInvoice.type === 'partial_deposit') {
                finalAmount = (totalAmount * newInvoice.percentage) / 100;
            } else if (newInvoice.type === 'global') {
                finalAmount = totalAmount;
            }

            const invoiceData = {
                invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                booking_id: booking.id,
                contract_id: contract ? contract.id : null,
                emitter_id: booking.planner_id,
                recipient_id: currentUser.id === booking.planner_id ? booking.client_id : currentUser.id,
                type: newInvoice.type,
                percentage: newInvoice.type === 'partial_deposit' ? parseFloat(newInvoice.percentage) : 100,
                amount: parseFloat(finalAmount),
                billing_address: newInvoice.billing_address,
                focal_point_name: newInvoice.focal_point_name,
                focal_point_contact: newInvoice.focal_point_contact,
                issued_date: new Date().toISOString(),
                due_date: newInvoice.due_date || new Date().toISOString(),
                status: 'issued',
                items: [
                    {
                        description: `${newInvoice.type === 'global' ? 'Service Complet' : 'Paiement Partiel'} - ${booking.event_type}`,
                        quantity: 1,
                        unit_price: parseFloat(finalAmount),
                        total: parseFloat(finalAmount)
                    }
                ]
            };

            const invoiceUrl = await generateInvoiceFile(invoiceData, booking);
            invoiceData.invoice_url = invoiceUrl;

            await base44.entities.Invoice.create(invoiceData);
            toast({ title: "Facture Générée", description: "La facture a été créée avec succès." });
            setView("list");
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Échec de la création de la facture.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (inv) => {
        if (!inv.invoice_url) {
            toast({ title: "Facture indisponible", description: "Le fichier de cette facture n'a pas pu etre genere. Contactez le support.", variant: "destructive" });
            return;
        }
        window.open(inv.invoice_url, '_blank', 'noopener,noreferrer');
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'paid': 
                return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Payée', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> };
            case 'issued': 
                return { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'En Attente de Paiement', icon: <Clock className="w-3 h-3 mr-1" /> };
            case 'overdue': 
                return { color: 'bg-red-50 text-red-700 border-red-200', label: 'En Retard', icon: <AlertCircle className="w-3 h-3 mr-1" /> };
            case 'draft':
                return { color: 'bg-stone-100 text-stone-600 border-stone-200', label: 'Brouillon', icon: <FileText className="w-3 h-3 mr-1" /> };
            default: 
                return { color: 'bg-gray-100 text-gray-800', label: status, icon: null };
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    <FileText className="w-4 h-4 mr-2" />
                    Factures
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Gestion des Factures</span>
                        {isProvider && view === 'list' && (
                            <Button size="sm" onClick={() => setView('create')}>
                                <Plus className="w-4 h-4 mr-2" /> Générer une Facture
                            </Button>
                        )}
                         {view === 'create' && (
                            <Button size="sm" variant="ghost" onClick={() => setView('list')}>
                                Annuler
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {view === 'list' ? (
                    <ScrollArea className="h-[400px] pr-4">
                        {invoices.length === 0 ? (
                            <div className="text-center py-12 text-stone-500">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>Aucune facture générée pour le moment.</p>
                                {isProvider && <p className="text-sm">Créez une facture pour demander un paiement.</p>}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {invoices.map(inv => (
                                    <Card key={inv.id}>
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">{inv.invoice_number}</span>
                                                    {(() => {
                                                        const config = getStatusConfig(inv.status);
                                                        return (
                                                            <Badge variant="outline" className={`${config.color} flex items-center`}>
                                                                {config.icon}
                                                                {config.label}
                                                            </Badge>
                                                        );
                                                    })()}
                                                    <Badge variant="secondary" className="text-stone-600 bg-stone-100">
                                                        {inv.type === 'global' ? 'Globale' : inv.type === 'partial_deposit' ? 'Acompte' : 'Solde'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-stone-500 mt-1">
                                                    Émise le : {format(new Date(inv.issued_date), 'd MMM yyyy')} • Échéance : {format(new Date(inv.due_date), 'd MMM yyyy')}
                                                </p>
                                                {(inv.focal_point_name || inv.billing_address) && (
                                                    <p className="text-xs text-stone-400 mt-1">
                                                        Facturé à : {inv.billing_address} {inv.focal_point_name ? `(À l'attention de : ${inv.focal_point_name})` : ''}
                                                    </p>
                                                )}
                                                <p className="font-bold text-lg mt-1">{inv.amount?.toLocaleString()} FCFA</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" title="Télécharger la facture" onClick={() => handleDownload(inv)}>
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                {!isProvider && inv.status !== 'paid' && (
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                                                        if(onPaymentClick) onPaymentClick(inv);
                                                        setOpen(false);
                                                    }}>
                                                        <CreditCard className="w-4 h-4 mr-2" /> Payer Maintenant
                                                    </Button>
                                                )}
                                                {inv.status === 'paid' && (
                                                    <Button size="sm" variant="outline" className="text-stone-600" onClick={() => handleDownload(inv)}>
                                                        <FileText className="w-4 h-4 mr-2" /> Reçu
                                                    </Button>
                                                )}
                                                {isProvider && inv.status === 'issued' && (
                                                    <Button size="sm" variant="ghost" className="text-blue-600">
                                                        <Send className="w-4 h-4 mr-2" /> Renvoyer
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type de Facture</Label>
                                <Select 
                                    value={newInvoice.type} 
                                    onValueChange={(val) => setNewInvoice({...newInvoice, type: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">Globale (Montant Total)</SelectItem>
                                        <SelectItem value="partial_deposit">Partielle (Acompte)</SelectItem>
                                        <SelectItem value="partial_balance">Solde Restant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Date d'Échéance</Label>
                                <Input 
                                    type="date" 
                                    value={newInvoice.due_date}
                                    onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Adresse de Facturation</Label>
                            <Input 
                                placeholder="Adresse de facturation"
                                value={newInvoice.billing_address}
                                onChange={(e) => setNewInvoice({...newInvoice, billing_address: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nom du Point Focal</Label>
                                <Input 
                                    placeholder="Nom de la personne de contact"
                                    value={newInvoice.focal_point_name}
                                    onChange={(e) => setNewInvoice({...newInvoice, focal_point_name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contact du Point Focal</Label>
                                <Input 
                                    placeholder="Téléphone / Email"
                                    value={newInvoice.focal_point_contact}
                                    onChange={(e) => setNewInvoice({...newInvoice, focal_point_contact: e.target.value})}
                                />
                            </div>
                        </div>

                        {newInvoice.type === 'partial_deposit' && (
                            <div className="space-y-2">
                                <Label>Pourcentage (%)</Label>
                                <div className="flex items-center gap-4">
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        max="100"
                                        value={newInvoice.percentage}
                                        onChange={(e) => setNewInvoice({...newInvoice, percentage: e.target.value})}
                                    />
                                    <span className="text-sm font-bold text-stone-500 whitespace-nowrap">
                                        = {((contract?.contract_amount || booking.total_amount) * newInvoice.percentage / 100).toLocaleString()} FCFA
                                    </span>
                                </div>
                            </div>
                        )}

                        {newInvoice.type === 'global' && (
                             <div className="p-4 bg-stone-50 rounded text-center">
                                 <p className="text-sm text-stone-500">Montant Total à Facturer</p>
                                 <p className="text-2xl font-bold text-stone-900">{(contract?.contract_amount || booking.total_amount).toLocaleString()} FCFA</p>
                             </div>
                        )}

                        <DialogFooter className="mt-6">
                            <Button onClick={handleCreateInvoice} disabled={loading} className="w-full">
                                {loading ? "Génération..." : "Générer la Facture"}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
