import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Image as ImageIcon, Loader2, Bell, RotateCcw, Store, User as UserIcon, Crown, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PaymentProofValidation() {
  const [proofs, setProofs] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vendorProfiles, setVendorProfiles] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [notifyingUser, setNotifyingUser] = useState(false);
  const [reexamining, setReexamining] = useState(false);
  const [settingPlan, setSettingPlan] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      const [allProofs, allUsers, allBookings, allVendorProfiles, allMemberships] = await Promise.all([
        base44.entities.PaymentProof.list('-created_date'),
        base44.entities.User.list(),
        base44.entities.Booking.list(),
        base44.entities.VendorProfile.list(),
        base44.entities.Membership.list()
      ]);
      setProofs(allProofs);
      setUsers(allUsers);
      setBookings(allBookings);
      setVendorProfiles(allVendorProfiles);
      setMemberships(allMemberships);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getSubmitterName = (proof) => {
    const u = users.find(usr => usr.id === proof.user_id);
    return u ? (u.full_name || u.email) : 'Utilisateur inconnu';
  };

  const getChosenPlan = (proof) => {
    if (!proof.membership_id) return null;
    const membership = memberships.find(m => m.id === proof.membership_id);
    if (!membership) return null;
    const code = (membership.membership_type_code || '').toLowerCase();
    if (code.includes('premium')) return 'premium';
    if (code.includes('gold')) return 'gold';
    return null;
  };

  const getVendorProfile = (proof) => {
    if (proof.payment_method === 'wallet_recharge_orange' || proof.membership_id) {
      return vendorProfiles.find(v => v.user_id === proof.user_id) || null;
    }
    if (proof.booking_id) {
      const booking = bookings.find(b => b.id === proof.booking_id);
      if (booking) {
        return vendorProfiles.find(v => v.user_id === booking.planner_id) || null;
      }
    }
    return null;
  };

  const getVendorName = (proof) => {
    if (proof.payment_method === 'wallet_recharge_orange' || proof.membership_id) {
      const vp = vendorProfiles.find(v => v.user_id === proof.user_id);
      return vp?.business_name || null;
    }
    if (proof.booking_id) {
      const booking = bookings.find(b => b.id === proof.booking_id);
      if (booking) {
        const vp = vendorProfiles.find(v => v.user_id === booking.planner_id);
        return vp?.business_name || null;
      }
    }
    return null;
  };

  const handleValidate = async (proofId, status) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      const proof = proofs.find(p => p.id === proofId);

      const userList = await base44.entities.User.list();
      const proofUser = userList.find(u => u.id === proof.user_id);

      await base44.entities.PaymentProof.update(proofId, {
        status,
        admin_notes: adminNotes,
        validated_by: currentUser.id,
        validated_date: new Date().toISOString()
      });

      if (status === 'approved' && proof.payment_method === 'wallet_recharge_orange') {
        const vendorProfilesFiltered = await base44.entities.VendorProfile.filter({ user_id: proof.user_id });
        if (vendorProfilesFiltered.length > 0) {
          const vp = vendorProfilesFiltered[0];
          await base44.entities.VendorProfile.update(vp.id, {
            account_balance: (vp.account_balance || 0) + proof.amount
          });

          await base44.entities.Transaction.create({
            user_id: proof.user_id,
            amount: proof.amount,
            type: 'ad_fee',
            payment_method: proof.payment_method,
            description: `Recharge portefeuille via ${proof.proof_code}`,
            status: 'completed'
          });

          await base44.entities.Notification.create({
            user_id: proof.user_id,
            title: "Portefeuille rechargé",
            message: `Votre portefeuille a été crédité de ${proof.amount?.toLocaleString()} FCFA.`,
            type: "payment",
            link: "/VendorDashboard?tab=growth",
            is_read: false
          });

          if (proofUser) {
            await SendEmail({
              to: proofUser.email,
              subject: "✅ Portefeuille rechargé",
              body: `Bonjour ${proofUser.full_name},\n\nVotre portefeuille a été crédité de ${proof.amount?.toLocaleString()} FCFA suite à votre recharge (référence ${proof.proof_code}).\n\nVous pouvez consulter votre solde depuis votre tableau de bord.\n\nCordialement,\nL'équipe EventCrafter`
            });
          }
        }

        toast({
          title: "Recharge validée",
          description: "Le portefeuille du vendeur a été crédité.",
          duration: 4000
        });

        fetchProofs();
        setSelectedProof(null);
        setAdminNotes("");
        setProcessing(false);
        return;
      }

      if (status === 'approved') {
        let payment_method = proof.payment_method;

        const transaction = await base44.entities.Transaction.create({
          user_id: proof.user_id,
          amount: proof.amount,
          type: 'booking_payment',
          payment_method: payment_method,
          description: `Payment validated for booking #${proof.booking_id}`,
          status: 'escrow_held',
          reference_id: proof.booking_id
        });

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

            if (proof.invoice_id) {
              await base44.entities.Invoice.update(proof.invoice_id, { status: 'paid' });
            }

            await base44.entities.Booking.update(proof.booking_id, {
              status: 'confirmed',
              payment_status: 'paid',
              paid_amount: (booking.paid_amount || 0) + proof.amount
            });

            await base44.entities.Notification.create({
              user_id: booking.planner_id,
              title: "Paiement Validé - Prêt à démarrer",
              message: `Paiement de ${proof.amount?.toLocaleString()} FCFA reçu et validé (Escrow). Vous pouvez commencer le service.`,
              type: "payment",
              link: "/Dashboard",
              is_read: false
            });

            const vendorUser = userList.find(u => u.id === booking.planner_id);
            if (vendorUser) {
              await SendEmail({
                to: vendorUser.email,
                subject: "✅ Paiement validé - Prêt à démarrer",
                body: `Bonjour ${vendorUser.full_name},\n\nLe paiement de ${proof.amount?.toLocaleString()} FCFA pour la réservation #${proof.booking_id} a été reçu et validé (fonds en séquestre).\n\nVous pouvez commencer le service dès maintenant.\n\nCordialement,\nL'équipe EventCrafter`
              });
            }
          }
        }

        if (proof.membership_id) {
          const membership = await base44.entities.Membership.list().then(m => m.find(mb => mb.id === proof.membership_id));
          if (membership) {
            await base44.entities.Membership.update(proof.membership_id, {
              status: 'active',
              payment_status: 'paid'
            });

            const vendorProfilesFiltered = await base44.entities.VendorProfile.filter({ user_id: proof.user_id });
            if (vendorProfilesFiltered.length > 0) {
              await base44.entities.VendorProfile.update(vendorProfilesFiltered[0].id, {
                plan: membership.membership_type_code.toLowerCase(),
                subscription_status: 'active',
                subscription_end_date: membership.end_date
              });
            }
          }
        }

        await base44.entities.Notification.create({
          user_id: proof.user_id,
          title: "Paiement Validé ✅",
          message: `Votre paiement de ${proof.amount?.toLocaleString()} FCFA a été validé. Merci !`,
          type: "payment",
          link: "/Dashboard",
          is_read: false
        });

        if (proofUser) {
          await SendEmail({
            to: proofUser.email,
            subject: "✅ Paiement validé",
            body: `Bonjour ${proofUser.full_name},\n\nVotre paiement de ${proof.amount?.toLocaleString()} FCFA (référence ${proof.proof_code}) a été validé avec succès.\n\nMerci pour votre confiance.\n\nCordialement,\nL'équipe EventCrafter`
          });
        }

        toast({
          title: "Validé",
          description: "Paiement approuvé et traité",
          duration: 4000
        });
      } else {
        await base44.entities.Notification.create({
          user_id: proof.user_id,
          title: "Paiement Rejeté ❌",
          message: `Votre preuve de paiement a été rejetée. Raison: ${adminNotes || 'Non spécifiée'}`,
          type: "payment",
          link: "/Dashboard",
          is_read: false
        });

        if (proofUser) {
          await SendEmail({
            to: proofUser.email,
            subject: "❌ Preuve de paiement rejetée",
            body: `Bonjour ${proofUser.full_name},\n\nVotre preuve de paiement de ${proof.amount?.toLocaleString()} FCFA a été rejetée par notre équipe.\n\nRaison du rejet: ${adminNotes || 'Non spécifiée'}\n\nVeuillez soumettre une nouvelle preuve de paiement valide.\n\nCordialement,\nL'équipe EventCrafter`
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
      await base44.entities.Notification.create({
        user_id: proof.user_id,
        title: "Paiement Rejeté ❌",
        message: `Votre preuve de paiement de ${proof.amount?.toLocaleString()} FCFA a été rejetée. Raison: ${proof.admin_notes || 'Non spécifiée'}. Veuillez soumettre une nouvelle preuve valide.`,
        type: "payment",
        link: "/ClientDashboard",
        is_read: false
      });

      const userList = await base44.entities.User.list();
      const rejectedUser = userList.find(u => u.id === proof.user_id);

      if (rejectedUser) {
        await SendEmail({
          to: rejectedUser.email,
          subject: "❌ Preuve de paiement rejetée - Action requise",
          body: `Bonjour ${rejectedUser.full_name},

Votre preuve de paiement de ${proof.amount?.toLocaleString()} FCFA a été rejetée par notre équipe.

📌 Référence: ${proof.proof_code}
❌ Raison du rejet: ${proof.admin_notes || 'Non spécifiée'}

⚠️ Action requise: Veuillez soumettre une nouvelle preuve de paiement valide via votre tableau de bord.

Cordialement,
L'équipe EventCrafter`
        });
      }

      toast({
        title: "✅ Notification envoyée",
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

  const handleSetVendorPlan = async (proof, newPlan) => {
    const vendorProfile = getVendorProfile(proof);
    if (!vendorProfile) {
      toast({ title: "Erreur", description: "Aucun profil vendeur trouve pour ce paiement.", variant: "destructive" });
      return;
    }
    setSettingPlan(true);
    try {
      const payload = {
        plan: newPlan,
        subscription_status: newPlan === 'free' ? 'inactive' : 'active'
      };

      if (newPlan !== 'free') {
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        payload.subscription_end_date = oneMonthFromNow.toISOString();
      }

      await base44.entities.VendorProfile.update(vendorProfile.id, payload);

      await base44.entities.Notification.create({
        user_id: vendorProfile.user_id,
        title: "Statut d'abonnement mis a jour",
        message: `Votre statut a ete mis a jour vers ${newPlan.toUpperCase()} par l'administration.`,
        type: "payment",
        link: "/VendorDashboard",
        is_read: false
      });

      toast({
        title: "Statut mis a jour",
        description: `Le compte est maintenant en statut ${newPlan.toUpperCase()}.`,
        duration: 4000
      });

      fetchProofs();
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible de mettre a jour le statut du vendeur.", variant: "destructive" });
    } finally {
      setSettingPlan(false);
    }
  };

  const handleApproveWithPlan = async (proof, plan) => {
    await handleValidate(proof.id, 'approved');
    await handleSetVendorPlan(proof, plan);
  };

  const handleDeleteAll = async () => {
    if (proofs.length === 0) return;
    const confirmed = confirm(`Etes-vous sur de vouloir supprimer definitivement les ${proofs.length} preuve(s) de paiement de cette liste ? Cette action est irreversible.`);
    if (!confirmed) return;

    setDeletingAll(true);
    try {
      for (const proof of proofs) {
        await base44.entities.PaymentProof.delete(proof.id);
      }
      toast({ title: "Liste supprimee", description: `${proofs.length} preuve(s) supprimee(s).`, duration: 4000 });
      setSelectedProof(null);
      fetchProofs();
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Certaines preuves n'ont pas pu etre supprimees.", variant: "destructive" });
      fetchProofs();
    } finally {
      setDeletingAll(false);
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
        title: "✅ Réouvert pour réexamen",
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Validation des preuves de paiement
            </CardTitle>
            {proofs.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={handleDeleteAll}
                disabled={deletingAll}
              >
                {deletingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Supprimer toute la liste
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {proofs.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              Aucune preuve de paiement en attente
            </div>
          ) : (
            <div className="space-y-4">
              {proofs.map((proof) => {
                const submitterName = getSubmitterName(proof);
                const vendorName = getVendorName(proof);
                return (
                  <div key={proof.id} className="border rounded-lg p-4 hover:bg-stone-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-grow space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="font-semibold">{proof.proof_code}</h4>
                          <StatusBadge status={proof.status} />
                        </div>
                        <div className="flex items-center gap-4 flex-wrap text-sm">
                          <span className="flex items-center gap-1 font-medium text-stone-800">
                            <UserIcon className="w-3.5 h-3.5 text-stone-400" /> {submitterName}
                          </span>
                          {vendorName && (
                            <span className="flex items-center gap-1 font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                              <Store className="w-3.5 h-3.5" /> Vendeur : {vendorName}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-stone-600 space-y-1">
                          <p>Montant: <strong>{proof.amount?.toLocaleString()} FCFA</strong></p>
                          <p>Méthode: {proof.payment_method}</p>
                          <p>Téléphone: {proof.phone_number || 'Non renseigné'}</p>
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
                );
              })}
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
                  <div className="col-span-2 flex items-center gap-2 pb-2 border-b border-stone-200">
                    <UserIcon className="w-4 h-4 text-stone-500" />
                    <strong>Soumis par :</strong> {getSubmitterName(selectedProof)}
                  </div>
                  {getVendorName(selectedProof) && (
                    <div className="col-span-2 flex items-center gap-2 pb-2 border-b border-stone-200">
                      <Store className="w-4 h-4 text-rose-600" />
                      <strong>Vendeur concerné :</strong> {getVendorName(selectedProof)}
                    </div>
                  )}
                  <div><strong>Montant:</strong> {selectedProof.amount?.toLocaleString()} FCFA</div>
                  <div><strong>Méthode:</strong> {selectedProof.payment_method}</div>
                  <div><strong>Téléphone:</strong> {selectedProof.phone_number || 'Non renseigné'}</div>
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
                      e.target.parentElement.innerHTML += '<div class="p-8 text-center text-red-500 border border-red-200 rounded-lg bg-red-50"><p>⚠️ Impossible de charger l\'image</p><p class="text-sm mt-2">' + selectedProof.proof_image_url + '</p></div>';
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

                    {selectedProof.membership_id ? (
                      <>
                        <Button
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleApproveWithPlan(selectedProof, 'premium')}
                          disabled={processing || settingPlan}
                        >
                          {(processing || settingPlan) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
                          Premium
                        </Button>
                        <Button
                          className="flex-1 bg-amber-500 hover:bg-amber-600"
                          onClick={() => handleApproveWithPlan(selectedProof, 'gold')}
                          disabled={processing || settingPlan}
                        >
                          {(processing || settingPlan) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
                          Gold
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleValidate(selectedProof.id, 'approved')}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Approuver
                      </Button>
                    )}
                  </div>

                  {selectedProof.membership_id && getChosenPlan(selectedProof) && (
                    <p className="text-xs text-stone-500 text-center">
                      Le vendeur avait demande le plan <strong className="uppercase">{getChosenPlan(selectedProof)}</strong> — cliquez sur le bouton correspondant pour confirmer, ou choisissez l'autre pour l'attribuer a la place.
                    </p>
                  )}
                </>
              )}

              {selectedProof.status !== 'pending' && (
                <div>
                  <div className={`p-4 rounded-lg ${selectedProof.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="font-semibold mb-1">
                      {selectedProof.status === 'approved' ? '✅ Approuvé' : '❌ Rejeté'}
                    </p>
                    <p className="text-sm">Validé le: {new Date(selectedProof.validated_date).toLocaleString()}</p>
                    {selectedProof.admin_notes && (
                      <p className="text-sm mt-2"><strong>Notes:</strong> {selectedProof.admin_notes}</p>
                    )}
                  </div>

                  {selectedProof.membership_id && getVendorProfile(selectedProof) && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-stone-500 mb-2 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-500" /> Redefinir manuellement le statut du vendeur :
                      </p>
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                          disabled={settingPlan}
                          onClick={() => handleSetVendorPlan(selectedProof, 'premium')}
                        >
                          {settingPlan ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Crown className="w-3.5 h-3.5 mr-2" />}
                          Premium
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                          disabled={settingPlan}
                          onClick={() => handleSetVendorPlan(selectedProof, 'gold')}
                        >
                          {settingPlan ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Crown className="w-3.5 h-3.5 mr-2" />}
                          Gold
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-stone-300 text-stone-600 hover:bg-stone-50"
                          disabled={settingPlan}
                          onClick={() => handleSetVendorPlan(selectedProof, 'free')}
                        >
                          {settingPlan ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : null}
                          Redevenir Free
                        </Button>
                      </div>
                    </div>
                  )}

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
