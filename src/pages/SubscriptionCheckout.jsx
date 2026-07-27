import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle2, FileSignature, CreditCard, Loader2, Download, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import PaymentModal from '@/components/PaymentModal';

export default function SubscriptionCheckout() {
    // We'll use a query param ?membership_id=...
    const queryParams = new URLSearchParams(window.location.search);
    const membershipId = queryParams.get('membership_id');
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const [membership, setMembership] = useState(null);
    const [contract, setContract] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Steps state
    const [signing, setSigning] = useState(false);
    const [showContract, setShowContract] = useState(false);
    const [showPayment, setShowPayment] = useState(false);

    useEffect(() => {
        if (!membershipId) {
            navigate('/Pricing');
            return;
        }
        
        const init = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
                await fetchData(membershipId);
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Could not load subscription details", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [membershipId]);

    const fetchData = async (id) => {
        const mems = await base44.entities.Membership.filter({ id });
        if (mems.length === 0) return;
        setMembership(mems[0]);

        if (mems[0].contract_id) {
            const contracts = await base44.entities.Contract.filter({ id: mems[0].contract_id });
            if (contracts.length > 0) setContract(contracts[0]);
        }

        if (mems[0].invoice_id) {
            const invoices = await base44.entities.Invoice.filter({ id: mems[0].invoice_id });
            if (invoices.length > 0) setInvoice(invoices[0]);
        }
    };

    const handleSignContract = async () => {
        setSigning(true);
        try {
            await base44.entities.Contract.update(contract.id, {
                status: 'signed',
                client_signed_at: new Date().toISOString(),
                // Auto-sign by platform as provider? In this context, User is the "Client" of the platform.
                // Platform is the "Provider". Let's assume platform auto-signs upon generation or now.
                provider_signed_at: new Date().toISOString(), 
                signed_date: new Date().toISOString()
            });
            
            await base44.entities.Membership.update(membership.id, {
                status: 'pending_payment'
            });

            await fetchData(membership.id);
            toast({ title: "Contract Signed", description: "You can now proceed to payment." });
            setShowContract(false);
        } catch (error) {
            toast({ title: "Error signing", variant: "destructive" });
        } finally {
            setSigning(false);
        }
    };

    const handlePaymentComplete = async () => {
        try {
            // La preuve de paiement a été soumise - attendre validation admin
            await base44.entities.Membership.update(membership.id, {
                status: 'pending_validation'
            });

            toast({ 
                title: "Preuve envoyée", 
                description: "Votre paiement sera validé sous 24h par notre équipe" 
            });
            
            navigate('/VendorDashboard');
        } catch (error) {
            console.error(error);
            toast({ 
                title: "Erreur", 
                description: "Impossible de soumettre la preuve", 
                variant: "destructive" 
            });
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;
    
    if (!membership) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-rose-600">
                            <AlertCircle className="w-5 h-5" />
                            Subscription Not Found
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-stone-500 mb-4">Unable to load subscription details. Please try again.</p>
                        <Button onClick={() => navigate('/Pricing')} className="w-full">Back to Pricing</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isContractSigned = contract?.status === 'signed';
    const isPaid = invoice?.status === 'paid';

    return (
        <div className="min-h-screen bg-stone-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-stone-900 mb-2">Complete Your Subscription</h1>
                <p className="text-stone-500 mb-8">Please review and sign the contract, then pay the invoice to activate your {membership?.membership_type_code} plan.</p>

                <div className="grid gap-6">
                    {/* Step 1: Contract */}
                    <Card className={isContractSigned ? "border-green-200 bg-green-50" : "border-stone-200"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isContractSigned ? "bg-green-600 text-white" : "bg-stone-900 text-white"}`}>
                                    {isContractSigned ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                                </div>
                                Sign Subscription Contract
                            </CardTitle>
                            <CardDescription>
                                Review terms and conditions for your {membership?.membership_type_code} membership.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between bg-white p-4 rounded border">
                                <div className="flex items-center gap-3">
                                    <FileSignature className="w-5 h-5 text-stone-400" />
                                    <div>
                                        <p className="font-medium text-sm">Contract #{contract?.contract_number}</p>
                                        <p className="text-xs text-stone-500">Generated on {contract ? format(new Date(contract.created_date), 'PPP') : ''}</p>
                                    </div>
                                </div>
                                {isContractSigned ? (
                                    <Button variant="ghost" disabled className="text-green-600">Signed</Button>
                                ) : (
                                    <Dialog open={showContract} onOpenChange={setShowContract}>
                                        <DialogTrigger asChild>
                                            <Button>Review & Sign</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>Subscription Contract</DialogTitle>
                                            </DialogHeader>
                                            <ScrollArea className="flex-grow p-4 border rounded bg-stone-50 text-sm">
                                                <h3 className="font-bold mb-2">TERMS OF SERVICE</h3>
                                                <p className="whitespace-pre-wrap mb-4">
                                                    {contract?.jurisdiction_clause}
                                                </p>
                                                <h3 className="font-bold mb-2">CANCELLATION POLICY</h3>
                                                <p className="whitespace-pre-wrap mb-4">
                                                    {contract?.cancellation_terms}
                                                </p>
                                                <h3 className="font-bold mb-2">FEES & PAYMENT</h3>
                                                <p className="whitespace-pre-wrap">
                                                    {contract?.commission_clause}
                                                </p>
                                                <div className="mt-8 pt-4 border-t">
                                                    <p className="font-bold">Plan: {membership?.membership_type_code?.toUpperCase()}</p>
                                                    <p>Amount: {membership?.amount?.toLocaleString()} {membership?.currency}</p>
                                                    <p>Duration: {membership?.duration_days} Days</p>
                                                </div>
                                            </ScrollArea>
                                            <div className="pt-4 flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => setShowContract(false)}>Cancel</Button>
                                                <Button onClick={handleSignContract} disabled={signing}>
                                                    {signing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Accept & Sign
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 2: Invoice */}
                    <Card className={`${!isContractSigned ? "opacity-50" : ""} ${isPaid ? "border-green-200 bg-green-50" : "border-stone-200"}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isPaid ? "bg-green-600 text-white" : !isContractSigned ? "bg-stone-300 text-stone-500" : "bg-stone-900 text-white"}`}>
                                    {isPaid ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                                </div>
                                Pay Invoice
                            </CardTitle>
                             <CardDescription>
                                Secure payment for your subscription.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between bg-white p-4 rounded border">
                                 <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-stone-400" />
                                    <div>
                                        <p className="font-medium text-sm">Invoice #{invoice?.invoice_number}</p>
                                        <p className="text-xs text-stone-500">Amount: {invoice?.amount?.toLocaleString()} {invoice?.currency}</p>
                                    </div>
                                </div>
                                {isPaid ? (
                                     <Button variant="ghost" disabled className="text-green-600">Paid</Button>
                                ) : (
                                    <>
                                        <Button 
                                            disabled={!isContractSigned} 
                                            onClick={() => setShowPayment(true)}
                                        >
                                            Pay Now
                                        </Button>
                                        <PaymentModal 
                                            booking={null} // Not a booking payment
                                            invoice={invoice}
                                            open={showPayment}
                                            onOpenChange={setShowPayment}
                                            onPaymentComplete={() => {
                                                setShowPayment(false);
                                                handlePaymentComplete();
                                            }}
                                            label={`Pay ${invoice?.amount?.toLocaleString()} ${invoice?.currency}`}
                                        />
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}