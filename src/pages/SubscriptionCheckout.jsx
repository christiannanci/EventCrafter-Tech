import { Service, VendorProfile, ClientProfile, Booking, Event, Conversation, Message, Review, Notification, Membership, Invoice, Region, Departement, Ville, Quartier, Fonction, PlatformFeedback, Contract, Dispute, Lead, Transaction, Payout, Refund, AppUser, Country, ServiceType } from '@/api/entities';
import { base44 } from '@/api/apiClient';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle2, FileSignature, CreditCard, Loader2, Download, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import PaymentModal from '@/components/PaymentModal';
import { useLanguage } from '@/components/LanguageContext';

export default function SubscriptionCheckout() {
    // We'll use a query param ?membership_id=...
    const queryParams = new URLSearchParams(window.location.search);
    const membershipId = queryParams.get('membership_id');
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useLanguage();
    
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
                toast({ title: t('subscriptionCheckout.errorLoad'), description: t('subscriptionCheckout.errorLoadDesc'), variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [membershipId]);

    const fetchData = async (id) => {
        const mems = await Membership.filter({ id });
        if (mems.length === 0) return;
        setMembership(mems[0]);

        if (mems[0].contract_id) {
            const contracts = await Contract.filter({ id: mems[0].contract_id });
            if (contracts.length > 0) setContract(contracts[0]);
        }

        if (mems[0].invoice_id) {
            const invoices = await Invoice.filter({ id: mems[0].invoice_id });
            if (invoices.length > 0) setInvoice(invoices[0]);
        }
    };

    const handleSignContract = async () => {
        setSigning(true);
        try {
            await Contract.update(contract.id, {
                status: 'signed',
                client_signed_at: new Date().toISOString(),
                // Auto-sign by platform as provider? In this context, User is the "Client" of the platform.
                // Platform is the "Provider". Let's assume platform auto-signs upon generation or now.
                provider_signed_at: new Date().toISOString(), 
                signed_date: new Date().toISOString()
            });
            
            await Membership.update(membership.id, {
                status: 'pending_payment'
            });

            await fetchData(membership.id);
            toast({ title: t('subscriptionCheckout.contractSignedTitle'), description: t('subscriptionCheckout.contractSignedDesc') });
            setShowContract(false);
        } catch (error) {
            toast({ title: t('subscriptionCheckout.errorSigning'), variant: "destructive" });
        } finally {
            setSigning(false);
        }
    };

    const handlePaymentComplete = async () => {
        try {
            // La preuve de paiement a été soumise - attendre validation admin
            await Membership.update(membership.id, {
                status: 'pending_validation'
            });

            toast({ 
                title: t('subscriptionCheckout.proofSentTitle'), 
                description: t('subscriptionCheckout.proofSentDesc') 
            });
            
            navigate('/VendorDashboard');
        } catch (error) {
            console.error(error);
            toast({ 
                title: t('subscriptionCheckout.errorSubmit'), 
                description: t('subscriptionCheckout.errorSubmitDesc'), 
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
                            {t('subscriptionCheckout.notFoundTitle')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-stone-500 mb-4">{t('subscriptionCheckout.notFoundDesc')}</p>
                        <Button onClick={() => navigate('/Pricing')} className="w-full">{t('subscriptionCheckout.backToPricing')}</Button>
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
                <h1 className="text-3xl font-bold text-stone-900 mb-2">{t('subscriptionCheckout.title')}</h1>
                <p className="text-stone-500 mb-8">{t('subscriptionCheckout.subtitlePrefix')} {membership?.membership_type_code} {t('subscriptionCheckout.subtitleSuffix')}</p>

                <div className="grid gap-6">
                    {/* Step 1: Contract */}
                    <Card className={isContractSigned ? "border-green-200 bg-green-50" : "border-stone-200"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isContractSigned ? "bg-green-600 text-white" : "bg-stone-900 text-white"}`}>
                                    {isContractSigned ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                                </div>
                                {t('subscriptionCheckout.step1Title')}
                            </CardTitle>
                            <CardDescription>
                                {t('subscriptionCheckout.step1DescPrefix')} {membership?.membership_type_code} {t('subscriptionCheckout.step1DescSuffix')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between bg-white p-4 rounded border">
                                <div className="flex items-center gap-3">
                                    <FileSignature className="w-5 h-5 text-stone-400" />
                                    <div>
                                        <p className="font-medium text-sm">{t('subscriptionCheckout.contractNumber')}{contract?.contract_number}</p>
                                        <p className="text-xs text-stone-500">{t('subscriptionCheckout.generatedOn')} {contract ? format(new Date(contract.created_date), 'PPP') : ''}</p>
                                    </div>
                                </div>
                                {isContractSigned ? (
                                    <Button variant="ghost" disabled className="text-green-600">{t('subscriptionCheckout.signed')}</Button>
                                ) : (
                                    <Dialog open={showContract} onOpenChange={setShowContract}>
                                        <DialogTrigger asChild>
                                            <Button>{t('subscriptionCheckout.reviewSign')}</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>{t('subscriptionCheckout.contractDialogTitle')}</DialogTitle>
                                            </DialogHeader>
                                            <ScrollArea className="flex-grow p-4 border rounded bg-stone-50 text-sm">
                                                <h3 className="font-bold mb-2">{t('subscriptionCheckout.termsOfService')}</h3>
                                                <p className="whitespace-pre-wrap mb-4">
                                                    {contract?.jurisdiction_clause}
                                                </p>
                                                <h3 className="font-bold mb-2">{t('subscriptionCheckout.cancellationPolicy')}</h3>
                                                <p className="whitespace-pre-wrap mb-4">
                                                    {contract?.cancellation_terms}
                                                </p>
                                                <h3 className="font-bold mb-2">{t('subscriptionCheckout.feesPayment')}</h3>
                                                <p className="whitespace-pre-wrap">
                                                    {contract?.commission_clause}
                                                </p>
                                                <div className="mt-8 pt-4 border-t">
                                                    <p className="font-bold">{t('subscriptionCheckout.plan')} {membership?.membership_type_code?.toUpperCase()}</p>
                                                    <p>{t('subscriptionCheckout.amount')} {membership?.amount?.toLocaleString()} {membership?.currency}</p>
                                                    <p>{t('subscriptionCheckout.duration')} {membership?.duration_days} {t('subscriptionCheckout.days')}</p>
                                                </div>
                                            </ScrollArea>
                                            <div className="pt-4 flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => setShowContract(false)}>{t('subscriptionCheckout.cancel')}</Button>
                                                <Button onClick={handleSignContract} disabled={signing}>
                                                    {signing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    {t('subscriptionCheckout.acceptSign')}
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
                                {t('subscriptionCheckout.step2Title')}
                            </CardTitle>
                             <CardDescription>
                                {t('subscriptionCheckout.step2Desc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between bg-white p-4 rounded border">
                                 <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5 text-stone-400" />
                                    <div>
                                        <p className="font-medium text-sm">{t('subscriptionCheckout.invoiceNumber')}{invoice?.invoice_number}</p>
                                        <p className="text-xs text-stone-500">{t('subscriptionCheckout.amountLabel')} {invoice?.amount?.toLocaleString()} {invoice?.currency}</p>
                                    </div>
                                </div>
                                {isPaid ? (
                                     <Button variant="ghost" disabled className="text-green-600">{t('subscriptionCheckout.paid')}</Button>
                                ) : (
                                    <>
                                        <Button 
                                            disabled={!isContractSigned} 
                                            onClick={() => setShowPayment(true)}
                                        >
                                            {t('subscriptionCheckout.payNow')}
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
                                            label={`${t('subscriptionCheckout.payLabel')} ${invoice?.amount?.toLocaleString()} ${invoice?.currency}`}
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
