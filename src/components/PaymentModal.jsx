import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/apiClient";
import { SendEmail, UploadFile } from "@/api/integrations";
import { CreditCard, Loader2, CheckCircle2, Smartphone, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { NotificationService } from '@/components/NotificationService';

export default function PaymentModal({ booking, invoice, onPaymentComplete, label = "Proceed to Payment", open, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", description: "" });
  const { toast } = useToast();

  const [proofImage, setProofImage] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const amountToPay = invoice ? invoice.amount : booking.total_amount;
  const payment_method = "orange_momo";

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingProof(true);
    try {
      const { file_url } = await UploadFile({ file });
      setProofImage(file_url);
      toast({ title: "Image téléchargée", description: "Preuve de paiement enregistrée" });
    } catch (error) {
      toast({
        title: "Erreur de téléchargement",
        description: "L'image n'a pas pu être téléchargée. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentUser = await base44.auth.me();

      if (!proofImage) {
        toast({
          title: "Preuve requise",
          description: "Veuillez télécharger une preuve de paiement",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      try {
        const proofCode = `PROOF-${Date.now()}`;

        const proofData = {
          proof_code: proofCode,
          user_id: currentUser.id,
          amount: Number(amountToPay),
          payment_method: payment_method,
          proof_image_url: proofImage,
          phone_number: "",
          status: 'pending'
        };

        if (booking?.id) proofData.booking_id = booking.id;
        if (invoice?.id) proofData.invoice_id = invoice.id;
        if (invoice?.membership_id) proofData.membership_id = invoice.membership_id;

        await base44.entities.PaymentProof.create(proofData);

        const allUsers = await base44.entities.User.list();
        const adminUsers = allUsers.filter(u => u.role === 'admin');

        const notificationMessage = booking
          ? `Nouvelle preuve de paiement de ${amountToPay?.toLocaleString()} FCFA pour une réservation. Cliquez pour valider.`
          : `Nouvelle preuve de paiement de ${amountToPay?.toLocaleString()} FCFA pour un abonnement. Cliquez pour valider.`;

        await NotificationService.sendToAdmins({
          title: "💰 Nouvelle preuve de paiement",
          message: notificationMessage,
          type: "payment",
          link: "/AdminDashboard"
        });

        for (const admin of adminUsers) {
          await SendEmail({
            to: admin.email,
            subject: "💰 Nouvelle preuve de paiement à valider",
            body: `Bonjour ${admin.full_name},\n\nUne nouvelle preuve de paiement nécessite votre validation:\n\nMontant: ${amountToPay?.toLocaleString()} FCFA\nType: ${booking ? 'Réservation' : 'Abonnement'}\nCode: ${proofCode}\n\nAccéder au back office: ${window.location.origin}/AdminDashboard\n\nCordialement,\nL'équipe EventCrafter`
          });
        }

        setSuccessMessage({
          title: "Preuve de Paiement Envoyée!",
          description: "Votre preuve a été transmise à notre équipe. Nous validerons votre paiement dans les 24 heures."
        });
        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
          setIsOpen(false);
          if (onPaymentComplete) onPaymentComplete();
          setSuccess(false);
          setProofImage(null);
        }, 3500);
        return;
      } catch (proofError) {
        console.error("Error creating payment proof:", proofError);
        setLoading(false);
        const errorMessage = proofError?.message || proofError?.error || "Erreur inconnue lors de la soumission";
        toast({
          title: "Erreur de soumission",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error("Payment failed", error);
      const errorMessage = error?.message || "Erreur inconnue. Veuillez réessayer.";
      toast({
        title: "Échec du Paiement",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!onOpenChange && (
        <DialogTrigger asChild>
          <Button className="bg-[#2C2C2C] hover:bg-black text-white">
            <CreditCard className="w-4 h-4 mr-2" />
            Pay {amountToPay?.toLocaleString()} FCFA
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Secure Payment (Escrow)</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-10 text-center animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">{successMessage.title}</h3>
            <p className="text-stone-500 mt-2">{successMessage.description}</p>
          </div>
        ) : (
          <div className="py-2">
            <div className="bg-stone-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-stone-500">Service</span>
                <span className="font-medium text-stone-900">{booking?.service_title || invoice?.type === 'subscription' ? 'Subscription Payment' : 'Event Service'}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>{invoice ? `Invoice ${invoice.invoice_number}` : 'Total'}</span>
                <span>{amountToPay?.toLocaleString()} FCFA</span>
              </div>
              {booking && (
                <div className="mt-2 text-xs text-stone-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-600" /> Funds held in escrow until event completion
                </div>
              )}
            </div>

            <Tabs defaultValue="momo" className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-4">
                <TabsTrigger value="momo">Mobile Money</TabsTrigger>
              </TabsList>

              <form onSubmit={handlePayment}>
                <TabsContent value="momo" className="space-y-4">
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-orange-700 font-semibold">
                          <Smartphone className="w-4 h-4" />
                          Code de paiement USSD Orange Money
                        </div>

                        <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                          <p className="text-xs text-stone-600 mb-2">Composez ce code sur votre téléphone:</p>
                          <code className="text-2xl font-bold text-orange-600 block select-all">
                            #150*47*974936*{amountToPay}#
                          </code>
                        </div>

                        <p className="text-xs text-stone-600">
                          Après avoir composé ce code, suivez les instructions sur votre téléphone pour confirmer le paiement.
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const code = `#150*47*974936*${amountToPay}#`;
                            navigator.clipboard.writeText(code);
                            toast({ title: "Code copié!", description: "Collez-le dans votre application téléphone" });
                          }}
                        >
                          Copier le code
                        </Button>

                        <div className="pt-2 border-t border-orange-200">
                          <p className="text-xs text-stone-700">
                            <strong>Amount to send:</strong> {amountToPay?.toLocaleString()} FCFA
                          </p>
                          <p className="text-xs text-stone-600 mt-1">
                            After transfer, click "Confirm Payment" below. Our team will verify and activate your payment within 24 hours.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-rose-700 font-semibold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Étape Finale : Preuve de Paiement</span>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-rose-100">
                        <p className="text-xs text-stone-700 mb-2">
                          <strong>Instructions :</strong>
                        </p>
                        <ol className="text-xs text-stone-600 space-y-1 list-decimal ml-4">
                          <li>Effectuez le transfert avec le code USSD ci-dessus</li>
                          <li>Prenez une capture d'écran du message de confirmation</li>
                          <li>Téléchargez la preuve ci-dessous</li>
                          <li>Validez pour soumettre à l'équipe</li>
                        </ol>
                      </div>

                      <div className="border-2 border-dashed border-rose-300 bg-white rounded-lg p-4 text-center hover:border-rose-400 transition-colors">
                        {proofImage ? (
                          <div className="space-y-3">
                            <div className="relative inline-block">
                              <img
                                src={proofImage}
                                alt="Proof"
                                className="max-h-64 mx-auto rounded-lg border-2 border-green-200 shadow-md"
                                onError={(e) => {
                                  console.error("Image failed to load:", proofImage);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-green-700 font-semibold">Preuve téléchargée avec succès</p>
                              <p className="text-xs text-stone-500">Cette image sera envoyée à notre équipe de validation</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-rose-300 text-rose-600 hover:bg-rose-50"
                                onClick={() => setProofImage(null)}
                              >
                                Changer l'image
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleProofUpload}
                              disabled={uploadingProof}
                            />
                            <div className="space-y-3 py-4">
                              <div className="text-5xl">
                                {uploadingProof ? (
                                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-rose-400" />
                                ) : (
                                  <div className="w-16 h-16 mx-auto bg-rose-100 rounded-full flex items-center justify-center">
                                    <span className="text-3xl">📤</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-base text-stone-800 font-semibold mb-1">
                                  {uploadingProof ? "Téléchargement en cours..." : "Télécharger la preuve de paiement"}
                                </p>
                                <p className="text-sm text-stone-600">
                                  Cliquez pour sélectionner votre capture d'écran
                                </p>
                              </div>
                              <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
                                <span>JPG</span>
                                <span>•</span>
                                <span>PNG</span>
                                <span>•</span>
                                <span>HEIC</span>
                              </div>
                            </div>
                          </label>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          <strong>Notification automatique :</strong> Notre équipe recevra une alerte immédiate et validera votre paiement sous 24 heures.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 h-11 mt-6" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                    </>
                  ) : (
                    `Confirm Payment of ${amountToPay?.toLocaleString()} FCFA`
                  )}
                </Button>
              </form>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 