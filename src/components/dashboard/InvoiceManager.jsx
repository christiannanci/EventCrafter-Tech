import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/apiClient";
import { FileText, Plus, Download, Send, CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InvoiceManager({ booking, currentUser, onPaymentClick }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState("list"); // list, create
    const [contract, setContract] = useState(null);

    const isProvider = currentUser.id === booking.planner_id;

    // New Invoice Form State
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
                // Default amount and details to contract data
                setNewInvoice(prev => ({ 
                    ...prev, 
                    amount: c.contract_amount,
                    billing_address: c.delivery_address || "", // Default billing to delivery if available
                    focal_point_name: c.focal_point_name || "",
                    focal_point_contact: c.focal_point_contact || ""
                }));
            } else {
                // Fallback to booking amount
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
                recipient_id: currentUser.id === booking.planner_id ? booking.client_id : currentUser.id, // Recipient is Client
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
                        description: `${newInvoice.type === 'global' ? 'Full Service' : 'Partial Payment'} - ${booking.event_type}`,
                        quantity: 1,
                        unit_price: parseFloat(finalAmount),
                        total: parseFloat(finalAmount)
                    }
                ]
            };

            await base44.entities.Invoice.create(invoiceData);
            toast({ title: "Invoice Generated", description: "The invoice has been created successfully." });
            setView("list");
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'paid': 
                return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Paid', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> };
            case 'issued': 
                return { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Awaiting Payment', icon: <Clock className="w-3 h-3 mr-1" /> };
            case 'overdue': 
                return { color: 'bg-red-50 text-red-700 border-red-200', label: 'Overdue', icon: <AlertCircle className="w-3 h-3 mr-1" /> };
            case 'draft':
                return { color: 'bg-stone-100 text-stone-600 border-stone-200', label: 'Draft', icon: <FileText className="w-3 h-3 mr-1" /> };
            default: 
                return { color: 'bg-gray-100 text-gray-800', label: status, icon: null };
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    <FileText className="w-4 h-4 mr-2" />
                    Invoices
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Invoice Management</span>
                        {isProvider && view === 'list' && (
                            <Button size="sm" onClick={() => setView('create')}>
                                <Plus className="w-4 h-4 mr-2" /> Generate Invoice
                            </Button>
                        )}
                         {view === 'create' && (
                            <Button size="sm" variant="ghost" onClick={() => setView('list')}>
                                Cancel
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {view === 'list' ? (
                    <ScrollArea className="h-[400px] pr-4">
                        {invoices.length === 0 ? (
                            <div className="text-center py-12 text-stone-500">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No invoices generated yet.</p>
                                {isProvider && <p className="text-sm">Create an invoice to request payment.</p>}
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
                                                        {inv.type === 'global' ? 'Global' : inv.type === 'partial_deposit' ? 'Deposit' : 'Balance'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-stone-500 mt-1">
                                                    Issued: {format(new Date(inv.issued_date), 'MMM d, yyyy')} • Due: {format(new Date(inv.due_date), 'MMM d, yyyy')}
                                                </p>
                                                {(inv.focal_point_name || inv.billing_address) && (
                                                    <p className="text-xs text-stone-400 mt-1">
                                                        Billed to: {inv.billing_address} {inv.focal_point_name ? `(Attn: ${inv.focal_point_name})` : ''}
                                                    </p>
                                                )}
                                                <p className="font-bold text-lg mt-1">{inv.amount?.toLocaleString()} FCFA</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" title="Download PDF">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                {!isProvider && inv.status !== 'paid' && (
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                                                        if(onPaymentClick) onPaymentClick(inv);
                                                        setOpen(false); // Close invoice manager to show payment modal
                                                    }}>
                                                        <CreditCard className="w-4 h-4 mr-2" /> Pay Now
                                                    </Button>
                                                )}
                                                {inv.status === 'paid' && (
                                                    <Button size="sm" variant="outline" className="text-stone-600" onClick={() => {
                                                        toast({ description: "Receipt downloading... (Simulated)" });
                                                    }}>
                                                        <FileText className="w-4 h-4 mr-2" /> Receipt
                                                    </Button>
                                                )}
                                                {isProvider && inv.status === 'issued' && (
                                                    <Button size="sm" variant="ghost" className="text-blue-600">
                                                        <Send className="w-4 h-4 mr-2" /> Resend
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
                                <Label>Invoice Type</Label>
                                <Select 
                                    value={newInvoice.type} 
                                    onValueChange={(val) => setNewInvoice({...newInvoice, type: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">Global (Full Amount)</SelectItem>
                                        <SelectItem value="partial_deposit">Partial (Deposit)</SelectItem>
                                        <SelectItem value="partial_balance">Remaining Balance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input 
                                    type="date" 
                                    value={newInvoice.due_date}
                                    onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Billing Address</Label>
                            <Input 
                                placeholder="Billing Address"
                                value={newInvoice.billing_address}
                                onChange={(e) => setNewInvoice({...newInvoice, billing_address: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Focal Point Name</Label>
                                <Input 
                                    placeholder="Contact Person Name"
                                    value={newInvoice.focal_point_name}
                                    onChange={(e) => setNewInvoice({...newInvoice, focal_point_name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Focal Point Contact</Label>
                                <Input 
                                    placeholder="Phone / Email"
                                    value={newInvoice.focal_point_contact}
                                    onChange={(e) => setNewInvoice({...newInvoice, focal_point_contact: e.target.value})}
                                />
                            </div>
                        </div>

                        {newInvoice.type === 'partial_deposit' && (
                            <div className="space-y-2">
                                <Label>Percentage (%)</Label>
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
                                 <p className="text-sm text-stone-500">Total Amount to Invoice</p>
                                 <p className="text-2xl font-bold text-stone-900">{(contract?.contract_amount || booking.total_amount).toLocaleString()} FCFA</p>
                             </div>
                        )}

                        <DialogFooter className="mt-6">
                            <Button onClick={handleCreateInvoice} disabled={loading} className="w-full">
                                {loading ? "Generating..." : "Generate Invoice"}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}