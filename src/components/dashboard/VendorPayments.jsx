import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Wallet, ArrowDownToLine, TrendingUp, Clock, CheckCircle2, Loader2, Landmark, Smartphone, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { NotificationService } from '@/components/NotificationService';

export default function VendorPayments({ user, vendorProfile, onUpdate }) {
    const { toast } = useToast();
    const [history, setHistory] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [justCredited, setJustCredited] = useState(false);

    const balance = vendorProfile?.account_balance || 0;

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [payouts, accounts] = await Promise.all([
                base44.entities.ProviderPayout.filter({ provider_id: user.id }),
                base44.entities.VendorBankAccount.filter({ user_id: user.id })
            ]);
            payouts.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
            accounts.sort((a, b) => (a.priority || 99) - (b.priority || 99));
            setHistory(payouts);
            setBankAccounts(accounts);

            // Detecter un credit recent (moins de 5 minutes) pour l'animation
            const recentCredit = payouts.find(p =>
                p.transaction_status === 'approved' &&
                p.payment_nature !== 'withdrawal' &&
                p.payment_date &&
                (Date.now() - new Date(p.payment_date).getTime()) < 5 * 60 * 1000
            );
            if (recentCredit) {
                setJustCredited(true);
                setTimeout(() => setJustCredited(false), 6000);
            }
        } catch (e) {
            console.error("Erreur chargement paiements:", e);
        } finally {
            setLoading(false);
        }
    };

    const getAccountIcon = (type) => {
        switch (type) {
            case 'mobile_money': return <Smartphone className="w-4 h-4 text-orange-500" />;
            case 'bank_account': return <Landmark className="w-4 h-4 text-blue-500" />;
            default: return <CreditCard className="w-4 h-4 text-gray-500" />;
        }
    };

    const handleWithdrawRequest = async () => {
        const amount = Number(withdrawAmount);
        if (!amount || amount <= 0) {
            toast({ title: "Montant invalide", variant: "destructive" });
            return;
        }
        if (amount > balance) {
            toast({ title: "Solde insuffisant", description: `Votre solde disponible est de ${balance.toLocaleString()} FCFA.`, variant: "destructive" });
            return;
        }
        if (!selectedAccountId) {
            toast({ title: "Compte requis", description: "Veuillez choisir un compte de reception.", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const account = bankAccounts.find(a => a.id === selectedAccountId);
            const paymentCode = `WDR-${Date.now()}`;

            await base44.entities.ProviderPayout.create({
                payment_code: paymentCode,
                provider_id: user.id,
                payment_nature: 'withdrawal',
                amount_paid: amount,
                admin_fee: 0,
                transaction_status: 'pending_approval',
                bank_account_id: account?.id,
                bank_account_label: `${account?.account_label} (${account?.account_type})`
            });

            await NotificationService.sendToAdmins({
                title: "Demande de retrait vendeur",
                message: `${vendorProfile?.business_name || user.email} demande un retrait de ${amount.toLocaleString()} FCFA vers ${account?.account_label}.`,
                type: "payment",
                link: "/AdminDashboard?tab=payouts"
            });

            toast({ title: "Demande envoyee", description: "Votre demande de retrait sera traitee sous peu." });
            setIsWithdrawOpen(false);
            setWithdrawAmount("");
            setSelectedAccountId("");
            loadData();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Impossible d'envoyer la demande de retrait.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const statusBadge = (status) => {
        if (status === 'approved') {
            return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Approuve</Badge>;
        }
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    };

    if (loading) {
        return <div className="p-10 text-center text-stone-500">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Solde disponible */}
            <Card className={`overflow-hidden transition-all duration-700 ${justCredited ? 'ring-4 ring-green-400 shadow-lg shadow-green-100' : ''}`}>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full ${justCredited ? 'bg-green-100 animate-pulse' : 'bg-rose-50'}`}>
                                <Wallet className={`w-8 h-8 ${justCredited ? 'text-green-600' : 'text-rose-600'}`} />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500 flex items-center gap-2">
                                    Solde disponible
                                    {justCredited && (
                                        <span className="text-green-600 font-medium flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> Nouveau credit !
                                        </span>
                                    )}
                                </p>
                                <p className="text-4xl font-bold text-stone-900">{balance.toLocaleString()} FCFA</p>
                            </div>
                        </div>
                        <Button
                            size="lg"
                            className="bg-rose-600 hover:bg-rose-700"
                            onClick={() => setIsWithdrawOpen(true)}
                            disabled={balance <= 0}
                        >
                            <ArrowDownToLine className="w-4 h-4 mr-2" />
                            Effectuer un retrait
                        </Button>
                    </div>
                    {bankAccounts.length === 0 && (
                        <p className="text-xs text-amber-600 mt-4 bg-amber-50 p-2 rounded">
                            Aucun compte de reception enregistre. Ajoutez-en un dans Parametres pour pouvoir retirer vos fonds.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Historique */}
            <Card>
                <CardHeader>
                    <CardTitle>Historique des paiements</CardTitle>
                    <CardDescription>Credits recus et retraits demandes</CardDescription>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <p className="text-center py-8 text-stone-400">Aucune transaction pour le moment.</p>
                    ) : (
                        <div className="space-y-3">
                            {history.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-medium text-stone-900">
                                            {item.payment_nature === 'withdrawal' ? 'Retrait vers ' + (item.bank_account_label || 'compte') : 'Credit recu'}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {item.created_date ? format(new Date(item.created_date), 'dd/MM/yyyy') : ''} - {item.payment_code}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${item.payment_nature === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                                            {item.payment_nature === 'withdrawal' ? '-' : '+'}{item.amount_paid?.toLocaleString()} FCFA
                                        </p>
                                        {statusBadge(item.transaction_status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog retrait */}
            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Effectuer un retrait</DialogTitle>
                        <DialogDescription>
                            Solde disponible: {balance.toLocaleString()} FCFA
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Montant a retirer (FCFA)</Label>
                            <Input
                                type="number"
                                placeholder="ex: 10000"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                max={balance}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Compte de reception</Label>
                            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un compte" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            <span className="flex items-center gap-2">
                                                {acc.account_label} - {acc.account_number}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            className="w-full bg-rose-600 hover:bg-rose-700"
                            disabled={submitting}
                            onClick={handleWithdrawRequest}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
                            Confirmer la demande
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
