import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Image as ImageIcon, Loader2, Bell, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PaymentProofValidation() {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [notifyingUser, setNotifyingUser] = useState(false);
  const [reexamining, setReexamining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      const allProofs = await base44.entities.PaymentProof.list('-created_date');
      setProofs(allProofs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (proofId, status) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      const proof = proofs.find(p => p.id === proofId);
      
      await base44.entities.PaymentProof.update(proofId, {
        status,
        admin_notes: adminNotes,
        validated_by: currentUser.id,
        validated_date: new Date().toISOString()
      });

      if (status === 'approved') {
        // Process the payment
        let payment_method = proof.payment_method;
        
        // Create Transaction Record (Escrow)
        const transaction = await base44.entities.Transaction.create({
          user_id: proof.user_id,
          amount: proof.amount,
          type: 'booking_payment',
          payment_method: payment_method,
          description: `Payment validated for booking #${proof.booking_id}`,
          status: 'escrow_held',
          reference_id: proof.booking_id
        });

        // Generate Receipt
        if (proof.booking_id) {
          const booking = await base44.entities.Booking.list().then(b => b.find(bk => bk.id === proof.booking_id));
          if (booking) {
            await base44.entities.Receipt.create({
              receipt_number: `RCPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
              transaction_id: transaction.id,
              invoice_id: proof.invoice_id || null,
              booking_id: proof.booking_id,
              payer_id: proof.user_id,
              amount: proof.amount,
              payment_method: payment_method,
              payment_date: new Date().toISOString(),
              details: `Payment validated from proof ${proof.proof_code}`
            });

            // Update Invoice Status
            if (proof.invoice_id) {
              await base44.entities.Invoice.update(proof.invoice_id, { status: 'paid' });
            }

            // Update Booking Status
            await base44.entities.Booking.update(proof.booking_id, {
              status: 'confirmed',
              payment_status: 'paid',
              paid_amount: (booking.paid_amount || 0) + proof.amount
            });

            // Notify Vendor
            await base44.entities.Notification.create({
              user_id: booking.planner_id,
              title: "Paiement Validé - Prêt à démarrer",
              message: `Paiement de ${proof.amount?.toLocaleString()} FCFA reçu et validé (Escrow). Vous pouvez commencer le service.`,
              type: "payment",
              link: "/Dashboard",
              is_read: false
            });
          }
        }

        // Handle membership subscription
        if (proof.membership_id) {
          const membership = await base44.entities.Membership.list().then(m => m.find(mb => mb.id === proof.membership_id));
          if (membership) {
            await base44.entities.Membership.update(proof.membership_id, {
              status: 'active',
              payment_status: 'paid'
            });

            // ?? SÉCURITÉ CRITIQUE: SEUL l'admin peut changer le plan après validation
            const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: proof.user_id });
            if (vendorProfiles.length > 0) {
              await base44.entities.VendorProfile.update(vendorProfiles[0].id, {
                plan: membership.membership_type_code.toLowerCase(),
                subscription_status: 'active',
                subscription_end_date: membership.end_date
              });
            }
          }
        }

        // Notify user
        await base44.entities.Notification.create({
          user_id: proof.user_id,
          title: "Paiement Validé ?",
          message: `Votre paiement de ${proof.amount?.toLocaleString()} FCFA a été validé. Merci!`,
          type: "payment",
          link: "/Dashboard",
          is_read: false
        });

        toast({ 
          title: "Validé", 
          description: "Paiement approuvé et traité",
          duration: 4000
        });
      } else {
        // Notify user of rejection (cloche + email)
        await base44.entities.Notification.create({
          user_id: proof.user_id,
          title: "Paiement Rejeté ?",
          message: `Votre preuve de paiement a été rejetée. Raison: ${adminNotes || 'Non spécifiée'}`,
          type: "payment",
          link: "/Dashboard",
          is_read: false
        });

        // Get user info for email
        const userList = await base44.entities.User.list();
        const rejectedUser = userList.find(u => u.id === proof.user_id);
        
        if (rejectedUser) {
          await SendEmail({
            to: rejectedUser.email,
            subject: "? Preuve de paiement rejetée",
            body: `Bonjour ${rejectedUser.full_name},\n\nVotre preuve de paiement de ${proof.amount?.toLocaleString()} FCFA a été rejetée par notre équipe.\n\nRaison du rejet: ${adminNotes || 'Non spécifiée'}\n\nVeuillez soumettre une nouvelle preuve de paiement valide.\n\nCordialement,\nL'équipe EventCrafter`
          });
        }

        toast({ 
          title: "Rejeté", 
          description: "Paiement rejeté et utilisateur notifié",
          duration: 4000
        });
      }

      fetchProofs();
      setSelectedProof(null);
      setAdminNotes("");
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Erreur", 
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleNotifyRejection = async (proof) => {
    setNotifyingUser(true);
    try {
      // Notification via cloche
      await base44.entities.Notification.create({
        user_id: proof.user_id,
        title: "Paiement Rejeté ?",
        message: `Votre preuve de paiement de ${proof.amount?.toLocaleString()} FCFA a été rejetée. Raison: ${proof.admin_notes || 'Non spécifiée'}. Veuillez soumettre une nouvelle preuve valide.`,
        type: "payment",
        link: "/ClientDashboard",
        is_read: false
      });

      // Email
      const userList = await base44.entities.User.list();
      const rejectedUser = userList.find(u => u.id === proof.user_id);
      
      if (rejectedUser) {
        await SendEmail({
          to: rejectedUser.email,
          subject: "? Preuve de paiement rejetée - Action requise",
          body: `Bonjour ${rejectedUser.full_name},

Votre preuve de paiement de ${proof.amount?.toLocaleString()} FCFA a été rejetée par notre équipe.

?? Référence: ${proof.proof_code}
? Raison du rejet: ${proof.admin_notes || 'Non spécifiée'}

?? Action requise: Veuillez soumettre une nouvelle preuve de paiement valide via votre tableau de bord.

Cordialement,
L'équipe EventCrafter`
        });
      }

      toast({ 
        title: "? Notification envoyée", 
        description: "L'utilisateur a été notifié du rejet (cloche + email)",
        duration: 4000
      });
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Erreur d'envoi", 
        description: "Impossible d'envoyer la notification",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setNotifyingUser(false);
    }
  };

  const handleReexamine = async (proofId) => {
    setReexamining(true);
    try {
      await base44.entities.PaymentProof.update(proofId, {
        status: 'pending',
        admin_notes: '',
        validated_by: null,
        validated_date: null
      });

      toast({ 
        title: "? Réouvert pour réexamen", 
        description: "La preuve de paiement est de nouveau en attente",
        duration: 4000
      });

      fetchProofs();
      setSelectedProof(null);
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Erreur", 
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setReexamining(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: { bg: "bg-amber-100 text-amber-800", icon: Clock },
      approved: { bg: "bg-green-100 text-green-800", icon: CheckCircle2 },
      rejected: { bg: "bg-red-100 text-red-800", icon: XCircle }
    };
    const config = styles[status];
    const Icon = config.icon;
    return (
      <Badge className={config.bg}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'pending' ? 'En attente' : status === 'approved' ? 'Approuvé' : 'Rejeté'}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Validation des preuves de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proofs.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              Aucune preuve de paiement en attente
            </div>
          ) : (
            <div className="space-y-4">
              {proofs.map((proof) => (
                <div key={proof.id} className="border rounded-lg p-4 hover:bg-stone-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{proof.proof_code}</h4>
                        <StatusBadge status={proof.status} />
                      </div>
                      <div className="text-sm text-stone-600 space-y-1">
                        <p>Montant: <strong>{proof.amount?.toLocaleString()} FCFA</strong></p>
                        <p>Méthode: {proof.payment_method}</p>
                        <p>Téléphone: {proof.phone_number}</p>
                        <p>Date: {new Date(proof.created_date).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProof(proof)}
                      >
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProof && (
        <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Validation de preuve - {selectedProof.proof_code}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-stone-50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><strong>Montant:</strong> {selectedProof.amount?.toLocaleString()} FCFA</div>
                  <div><strong>Méthode:</strong> {selectedProof.payment_method}</div>
                  <div><strong>Téléphone:</strong> {selectedProof.phone_number}</div>
                  <div><strong>Date:</strong> {new Date(selectedProof.created_date).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Preuve de paiement:</h4>
                {selectedProof.proof_image_url ? (
                  <img 
                    src={selectedProof.proof_image_url} 
                    alt="Payment proof" 
                    className="w-full rounded-lg border max-h-[500px] object-contain bg-stone-50"
                    onError={(e) => {
                      console.error("Failed to load image:", selectedProof.proof_image_url);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML += '<div class="p-8 text-center text-red-500 border border-red-200 rounded-lg bg-red-50"><p>? Impossible de charger l\'image</p><p class="text-sm mt-2">' + selectedProof.proof_image_url + '</p></div>';
                    }}
                  />
                ) : (
                  <div className="p-8 text-center text-stone-400 border rounded-lg bg-stone-50">
                    Aucune image disponible
                  </div>
                )}
              </div>

              {selectedProof.status === 'pending' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Notes admin (optionnel)</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Commentaires ou raison du rejet..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rejeter
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmer le rejet</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm text-stone-600">
                            Expliquez la raison du rejet. Ce message sera envoyé à l'utilisateur.
                          </p>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Exemple: L'image est floue, le montant ne correspond pas, etc..."
                            rows={4}
                          />
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={() => handleValidate(selectedProof.id, 'rejected')}
                            disabled={processing || !adminNotes.trim()}
                          >
                            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Confirmer le rejet et notifier
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleValidate(selectedProof.id, 'approved')}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Approuver
                    </Button>
                  </div>
                </>
              )}

              {selectedProof.status !== 'pending' && (
                <div>
                  <div className={`p-4 rounded-lg ${selectedProof.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="font-semibold mb-1">
                      {selectedProof.status === 'approved' ? '? Approuvé' : '? Rejeté'}
                    </p>
                    <p className="text-sm">Validé le: {new Date(selectedProof.validated_date).toLocaleString()}</p>
                    {selectedProof.admin_notes && (
                      <p className="text-sm mt-2"><strong>Notes:</strong> {selectedProof.admin_notes}</p>
                    )}
                  </div>

                  {selectedProof.status === 'rejected' && (
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-orange-500 text-orange-700 hover:bg-orange-50"
                        onClick={() => handleNotifyRejection(selectedProof)}
                        disabled={notifyingUser}
                      >
                        {notifyingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                        Notifier l'utilisateur
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-blue-500 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleReexamine(selectedProof.id)}
                        disabled={reexamining}
                      >
                        {reexamining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                        Réexaminer (Approbation)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}