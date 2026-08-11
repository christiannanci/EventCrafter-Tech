import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/apiClient";
import { SendEmail, UploadFile } from "@/api/integrations";
import { CreditCard, Loader2, CheckCircle2, Smartphone, ShieldCheck, Landmark, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { NotificationService } from '@/components/NotificationService';

const BANK_DETAILS = {
  accountName: "IMMOBILIERE SONAN",
  bankName: "RIB SONAN",
  iban: "CM21 10003 04000 06401341228 80",
  swift: "SGCMCMCX",
};

export default function PaymentModal({ booking, invoice, onPaymentComplete, label = "Proceder au Paiement", open, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", description: "" });
  const { toast } = useToast();

  const [proofImage, setProofImage] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("orange_momo");

  const amountToPay = invoice ? invoice.amount : booking.total_amount;

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingProof(true);
    try {
      const { file_url } = await UploadFile({ file });
      setProofImage(file_url);
      toast({ title: "Image telechargee", description: "Preuve de paiement enregistree" });
    } catch (error) {
      toast({
        title: "Erreur de telechargement",
        description: "L'image n'a pas pu etre telechargee. Reessayez.",
        variant: "destructive"
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copie !", description: `${label} copie dans le presse-papier` });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentUser = await base44.auth.me();

      if (!proofImage) {
        toast({
          title: "Preuve requise",
          description: "Veuillez telecharger une preuve de paiement",
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
          payment_method: paymentMethod,
          proof_image_url: proofImage,
          phone_number: "",
          status: 'pending',
          created_date: new Date().toISOString()
        };

        if (booking?.id) proofData.booking_id = booking.id;
        if (invoice?.id) proofData.invoice_id = invoice.id;
        if (invoice?.membership_id) proofData.membership_id = invoice.membership_id;

        await base44.entities.PaymentProof.create(proofData);

        const methodLabel = paymentMethod === 'bank_transfer' ? 'virement bancaire' : 'Mobile Money';
        const notificationMessage = booking
          ? `Nouvelle preuve de paiement (${methodLabel}) de ${amountToPay?.toLocaleString()} FCFA pour une reservation. Cliquez pour valider.`
          : `Nouvelle preuve de paiement (${methodLabel}) de ${amountToPay?.toLocaleString()} FCFA pour un abonnement. Cliquez pour valider.`;

        await NotificationService.sendToAdmins({
          title: "Nouvelle preuve de paiement",
          message: notificationMessage,
          type: "payment",
          link: "/AdminDashboard"
        });

        const allUsers = await base44.entities.User.list();
        const adminUsers = allUsers.filter(u => u.role === 'admin');

        for (const admin of adminUsers) {
          await SendEmail({
            to: admin.email,
            subject: "Nouvelle preuve de paiement a valider",
            body: `Bonjour ${admin.full_name},\n\nUne nouvelle preuve de paiement (${methodLabel}) necessite votre validation:\n\nMontant: ${amountToPay?.toLocaleString()} FCFA\nType: ${booking ? 'Reservation' : 'Abonnement'}\nCode: ${proofCode}\n\nAcceder au back office: ${window.location.origin}/AdminDashboard\n\nCordialement,\nL'equipe EventCrafter`
          });
        }

        setSuccessMessage({
          title: "Preuve de Paiement Envoyee!",
          description: "Votre preuve a ete transmise a notre equipe. Nous validerons votre paiement dans les 24 heures."
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
      const errorMessage = error?.message || "Erreur inconnue. Veuillez reessayer.";
      toast({
        title: "Echec du Paiement",
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
            Payer {amountToPay?.toLocaleString()} FCFA
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paiement Securise (Escrow)</DialogTitle>
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
                <span className="font-medium text-stone-900">{booking?.service_title || invoice?.type === 'subscription' ? 'Paiement Abonnement' : 'Service Evenementiel'}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>{invoice ? `Facture ${invoice.invoice_number}` : 'Total'}</span>
                <span>{amountToPay?.toLocaleString()} FCFA</span>
              </div>
              {booking && (
                <div className="mt-2 text-xs text-stone-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-600" /> Fonds detenus en sequestre jusqu'a la fin de l'evenement
                </div>
              )}
            </div>

            <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="orange_momo">
                  <Smartphone className="w-4 h-4 mr-2" /> Mobile Money
                </TabsTrigger>
                <TabsTrigger value="bank_transfer">
                  <Landmark className="w-4 h-4 mr-2" /> Paiement Bancaire
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handlePayment}>
                <TabsContent value="orange_momo" className="space-y-4">
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-orange-700 font-semibold">
                          <Smartphone className="w-4 h-4" />
                          Code de paiement USSD Orange Money
                        </div>

                        <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                          <p className="text-xs text-stone-600 mb-2">Composez ce code sur votre telephone:</p>
                          <code className="text-2xl font-bold text-orange-600 block select-all">
                            #150*47*974936*{amountToPay}#
                          </code>
                        </div>

                        <p className="text-xs text-stone-600">
                          Apres avoir compose ce code, suivez les instructions sur votre telephone pour confirmer le paiement.
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const code = `#150*47*974936*${amountToPay}#`;
                            navigator.clipboard.writeText(code);
                            toast({ title: "Code copie!", description: "Collez-le dans votre application telephone" });
                          }}
                        >
                          Copier le code
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bank_transfer" className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-blue-700 font-semibold">
                      <Landmark className="w-4 h-4" />
                      Coordonnees bancaires pour virement
                    </div>

                    <div className="bg-white rounded-lg border-2 border-blue-300 divide-y divide-blue-100">
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-stone-500">Titulaire du compte</p>
                          <p className="text-sm font-bold text-stone-900">{BANK_DETAILS.accountName}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(BANK_DETAILS.accountName, "Titulaire")}>
                          <Copy className="w-4 h-4 text-stone-400" />
                        </Button>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-stone-500">Banque</p>
                          <p className="text-sm font-bold text-stone-900">{BANK_DETAILS.bankName}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(BANK_DETAILS.bankName, "Banque")}>
                          <Copy className="w-4 h-4 text-stone-400" />
                        </Button>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-stone-500">IBAN / RIB</p>
                          <p className="text-sm font-bold text-stone-900 font-mono">{BANK_DETAILS.iban}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(BANK_DETAILS.iban, "IBAN")}>
                          <Copy className="w-4 h-4 text-stone-400" />
                        </Button>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-stone-500">Code SWIFT / BIC</p>
                          <p className="text-sm font-bold text-stone-900 font-mono">{BANK_DETAILS.swift}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => copyToClipboard(BANK_DETAILS.swift, "Code SWIFT")}>
                          <Copy className="w-4 h-4 text-stone-400" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600">
                      Effectuez le virement du montant exact ({amountToPay?.toLocaleString()} FCFA) vers ce compte, puis telechargez la preuve de virement ci-dessous.
                    </p>
                  </div>
                </TabsContent>

                <div className="space-y-3 bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Etape Finale : Preuve de Paiement</span>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-rose-100">
                    <p className="text-xs text-stone-700 mb-2">
                      <strong>Instructions :</strong>
                    </p>
                    <ol className="text-xs text-stone-600 space-y-1 list-decimal ml-4">
                      <li>Effectuez le {paymentMethod === 'bank_transfer' ? 'virement bancaire' : 'transfert Mobile Money'} ci-dessus</li>
                      <li>Prenez une capture d'ecran du message de confirmation</li>
                      <li>Telechargez la preuve ci-dessous</li>
                      <li>Validez pour soumettre a l'equipe</li>
                    </ol>
                  </div>

                  <div className="border-2 border-dashed border-rose-300 bg-white rounded-lg p-4 text-center hover:border-rose-400 transition-colors">
                    {proofImage ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={proofImage}
                            alt="Preuve"
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
                          <p className="text-sm text-green-700 font-semibold">Preuve telechargee avec succes</p>
                          <p className="text-xs text-stone-500">Cette image sera envoyee a notre equipe de validation</p>
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
                                <span className="text-3xl">+</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-base text-stone-800 font-semibold mb-1">
                              {uploadingProof ? "Telechargement en cours..." : "Telecharger la preuve de paiement"}
                            </p>
                            <p className="text-sm text-stone-600">
                              Cliquez pour selectionner votre capture d'ecran
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
                            <span>JPG</span>
                            <span>-</span>
                            <span>PNG</span>
                            <span>-</span>
                            <span>HEIC</span>
                          </div>
                        </div>
                      </label>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Notification automatique :</strong> Notre equipe recevra une alerte immediate et validera votre paiement sous 24 heures.
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 h-11 mt-6" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traitement en cours...
                    </>
                  ) : (
                    `Confirmer le Paiement de ${amountToPay?.toLocaleString()} FCFA`
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
