import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, DollarSign, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPayouts() {
  const [user, setUser] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState("payouts");

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.role !== 'admin') {
             toast.error("Unauthorized access");
             window.location.href = "/";
             return;
        }
        fetchData();
      } catch (e) {
        window.location.href = "/";
      }
    };
    init();
  }, []);

  // Strategy of Relaunch / Reminder Check
  useEffect(() => {
     if (payouts.length > 0 || refunds.length > 0) {
         const now = new Date();
         const stalePayouts = payouts.filter(p => 
             p.transaction_status === 'pending_approval' && 
             (now - new Date(p.created_date)) > (48 * 60 * 60 * 1000) // 48h
         );
         
         if (stalePayouts.length > 0) {
             toast("Attention Needed", {
                 description: `${stalePayouts.length} payouts have been pending for over 48h!`,
                 action: {
                     label: "Send Reminders",
                     onClick: () => sendStaleReminders(stalePayouts)
                 },
                 duration: 10000,
             });
         }
     }
  }, [payouts, refunds]);

  const sendStaleReminders = async (items) => {
      // Logic to re-send emails or internal alerts
      toast.success("Reminder emails sent to admin team.");
      // In real implementation, this would trigger email integration again
      try {
           await SendEmail({
               to: "admin@eventcraftercm.com",
               subject: "URGENT: Stale Payouts Pending",
               body: `There are ${items.length} payouts pending for more than 48 hours. Please login to process them immediately.`
           });
      } catch(e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch ProviderPayouts
      const payoutsList = await base44.entities.ProviderPayout.list();
      setPayouts(payoutsList.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));

      // Fetch ClientRefunds
      const refundsList = await base44.entities.ClientRefund.list();
      setRefunds(refundsList.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payout) => {
    const voucherNumber = prompt("Enter Cash Voucher Number (NUMERO_PIECE_CAISSE) to approve:");
    if (!voucherNumber) return;
    
    setProcessingId(payout.id);
    try {
        // 1. Update Payout Record
        await base44.entities.ProviderPayout.update(payout.id, {
            transaction_status: 'approved',
            cash_voucher_number: voucherNumber,
            payment_date: new Date().toISOString()
        });

        // 2. Update Vendor Balance
        const profiles = await base44.entities.VendorProfile.filter({ user_id: payout.provider_id });
        if (profiles.length > 0) {
            const profile = profiles[0];
            await base44.entities.VendorProfile.update(profile.id, {
                account_balance: (profile.account_balance || 0) + (payout.amount_paid || 0)
            });
        }
        
        // 3. Notify Vendor
        await base44.entities.Notification.create({
            user_id: payout.provider_id,
            title: "Payout Approved",
            message: `Your payout of ${payout.amount_paid?.toLocaleString()} FCFA (Ref: ${payout.payment_code}) has been approved and added to your balance. Voucher: ${voucherNumber}`,
            type: "payment",
            link: "/Dashboard",
            is_read: false
        });

        // Email au vendeur (confirmation financière importante)
        const allUsers = await base44.entities.User.list();
        const vendorUser = allUsers.find(u => u.id === payout.provider_id);
        if (vendorUser) {
            await SendEmail({
                to: vendorUser.email,
                subject: "✅ Paiement approuvé",
                body: `Bonjour ${vendorUser.full_name},\n\nVotre paiement de ${payout.amount_paid?.toLocaleString()} FCFA (référence ${payout.payment_code}) a été approuvé et ajouté à votre solde.\n\nNuméro de pièce de caisse : ${voucherNumber}\n\nCordialement,\nL'équipe EventCrafter`
            });
        }

        toast.success("Payout approved and balance updated");
        fetchData();
    } catch (e) {
        console.error(e);
        toast.error("Failed to process payout");
    } finally {
        setProcessingId(null);
    }
  };

  const handleProcessRefund = async (refund) => {
      if(!confirm("Are you sure you want to approve this refund? This will mark the transaction as refunded.")) return;

      setProcessingId(refund.id);
      try {
          // 1. Update Refund Record
          await base44.entities.ClientRefund.update(refund.id, {
              status: 'processed',
              processed_date: new Date().toISOString()
          });

          // 2. Update Original Transaction
          if (refund.transaction_reference) {
               await base44.entities.Transaction.update(refund.transaction_reference, {
                   status: 'refunded',
                   description: `Refunded ${refund.amount_refunded} (Code: ${refund.refund_code})`
               });
          }

          // 3. Notify Client (if we have client_id, which we should)
          if (refund.client_id && refund.client_id !== 'unknown') {
               await base44.entities.Notification.create({
                  user_id: refund.client_id,
                  title: "Refund Approved",
                  message: `Your refund of ${refund.amount_refunded?.toLocaleString()} FCFA has been processed.`,
                  type: "payment",
                  link: "/Dashboard",
                  is_read: false
              });

              // Email au client (confirmation financière importante)
              const allUsers = await base44.entities.User.list();
              const clientUser = allUsers.find(u => u.id === refund.client_id);
              if (clientUser) {
                  await SendEmail({
                      to: clientUser.email,
                      subject: "✅ Remboursement traité",
                      body: `Bonjour ${clientUser.full_name},\n\nVotre remboursement de ${refund.amount_refunded?.toLocaleString()} FCFA (référence ${refund.refund_code}) a été traité.\n\nCordialement,\nL'équipe EventCrafter`
                  });
              }
          }

          toast.success("Refund processed successfully");
          fetchData();
      } catch (e) {
          console.error(e);
          toast.error("Failed to process refund");
      } finally {
          setProcessingId(null);
      }
  };

  if (loading) return <div className="p-20 text-center">Loading admin panel...</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Financial Approvals</h1>
          <p className="text-stone-500">Manage vendor payouts and client refunds.</p>
        </div>
      </div>

      <Tabs defaultValue="payouts" className="w-full">
          <TabsList className="mb-8 w-full justify-start bg-stone-100 p-1">
            <TabsTrigger value="payouts" className="px-6">Provider Payouts</TabsTrigger>
            <TabsTrigger value="refunds" className="px-6">Client Refunds</TabsTrigger>
          </TabsList>

          <TabsContent value="payouts">
            <Card>
                <CardHeader>
                    <CardTitle>Payout Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {payouts.length > 0 ? (
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-stone-50 text-stone-500 font-medium">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Code</th>
                                        <th className="p-4">Vendor ID</th>
                                        <th className="p-4">Nature</th>
                                        <th className="p-4">Paid</th>
                                        <th className="p-4">Fee</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {payouts.map((payout) => (
                                        <tr key={payout.id} className="hover:bg-stone-50/50">
                                            <td className="p-4">{format(new Date(payout.created_date), 'MMM d, yyyy')}</td>
                                            <td className="p-4 font-mono text-xs">{payout.payment_code}</td>
                                            <td className="p-4 font-mono text-xs">{payout.provider_id}</td>
                                            <td className="p-4 text-xs uppercase">{payout.payment_nature}</td>
                                            <td className="p-4 font-bold text-emerald-700">{payout.amount_paid?.toLocaleString()} FCFA</td>
                                            <td className="p-4 text-xs text-rose-600 font-medium">-{payout.admin_fee?.toLocaleString()}</td>
                                            <td className="p-4">
                                                <Badge variant={payout.transaction_status === 'approved' ? 'secondary' : 'default'} 
                                                    className={payout.transaction_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                                                    {payout.transaction_status === 'approved' ? 'Approved' : 'Pending'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                {payout.transaction_status === 'pending_approval' && (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleProcessPayout(payout)}
                                                        disabled={processingId === payout.id}
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                    >
                                                        {processingId === payout.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 mr-1" />}
                                                        Approve
                                                    </Button>
                                                )}
                                                {payout.transaction_status === 'approved' && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-green-600 flex items-center justify-end gap-1 text-xs font-medium">
                                                            <CheckCircle2 className="w-3 h-3" /> Approved
                                                        </span>
                                                        <span className="text-[10px] text-stone-400">
                                                            Voucher: {payout.cash_voucher_number}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-stone-500">
                            No payouts found.
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds">
            <Card>
                <CardHeader>
                    <CardTitle>Refund Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {refunds.length > 0 ? (
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-stone-50 text-stone-500 font-medium">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Code</th>
                                        <th className="p-4">Client ID</th>
                                        <th className="p-4">Reason</th>
                                        <th className="p-4">Refund Amount</th>
                                        <th className="p-4">Retained</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {refunds.map((refund) => (
                                        <tr key={refund.id} className="hover:bg-stone-50/50">
                                            <td className="p-4">{format(new Date(refund.created_date), 'MMM d, yyyy')}</td>
                                            <td className="p-4 font-mono text-xs">{refund.refund_code}</td>
                                            <td className="p-4 font-mono text-xs">{refund.client_id}</td>
                                            <td className="p-4 text-xs">{refund.reason}</td>
                                            <td className="p-4 font-bold text-amber-700">{refund.amount_refunded?.toLocaleString()} FCFA</td>
                                            <td className="p-4 text-xs text-stone-500 font-medium">{refund.commission_retained?.toLocaleString()}</td>
                                            <td className="p-4">
                                                <Badge variant={['processed', 'approved'].includes(refund.status) ? 'secondary' : 'default'} 
                                                    className={['processed', 'approved'].includes(refund.status) ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                                                    {refund.status === 'pending_approval' ? 'Pending' : refund.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                {refund.status === 'pending_approval' && (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleProcessRefund(refund)}
                                                        disabled={processingId === refund.id}
                                                        className="bg-amber-600 hover:bg-amber-700"
                                                    >
                                                        {processingId === refund.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                                                        Approve Refund
                                                    </Button>
                                                )}
                                                {['processed', 'approved'].includes(refund.status) && (
                                                    <span className="text-green-600 flex items-center justify-end gap-1 text-xs font-medium">
                                                        <CheckCircle2 className="w-3 h-3" /> Processed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-stone-500">
                            No refund requests found.
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}
