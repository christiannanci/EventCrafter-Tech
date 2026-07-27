import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from "@/api/apiClient";
import { SendEmail, UploadFile } from "@/api/integrations";
import { CreditCard, Loader2, CheckCircle2, Smartphone, Globe, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { paymentSchema, validateData } from '@/components/ValidationSchemas';
import { NotificationService } from '@/components/NotificationService';

export default function PaymentModal({ booking, invoice, onPaymentComplete, label = "Proceed to Payment", open, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: "", description: "" });
  const [method, setMethod] = useState("momo"); // momo, card, international
  const [subMethod, setSubMethod] = useState("mtn"); // mtn, orange, paystack, flutterwave, stripe, taptap
  const { toast } = useToast();

  // Form states
  const [phone, setPhone] = useState("");
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [proofImage, setProofImage] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const amountToPay = invoice ? invoice.amount : booking.total_amount;

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

      let payment_method = "card";
      if (method === "momo") payment_method = subMethod === "mtn" ? "mtn_momo" : "orange_momo";
      else if (method === "international") payment_method = subMethod === "stripe" ? "stripe" : "taptap";
      else payment_method = subMethod === "paystack" ? "paystack" : "flutterwave";

      // Validation des données de paiement
      const validation = validateData(paymentSchema, {
        phone: phone || "",
        amount: Number(amountToPay),
        payment_method
      });

      if (!validation.success && method === "momo" && phone) {
        const firstError = Object.values(validation.errors)[0];
        toast({ 
          title: "Validation échouée", 
          description: firstError,
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // For subscription payments, proof is REQUIRED
      const isSubscription = invoice?.type === 'subscription' || (!booking && invoice);
      if (isSubscription && !proofImage) {
        toast({ 
          title: "Preuve requise", 
          description: "Veuillez télécharger une preuve de paiement", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      if (isSubscription && !phone) {
        toast({ 
          title: "Numéro requis", 
          description: "Veuillez entrer votre numéro de téléphone", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // If proof image uploaded, create proof record for admin validation
      if (proofImage) {
        try {
          const proofCode = `PROOF-${Date.now()}`;
          
          const proofData = {
            proof_code: proofCode,
            user_id: currentUser.id,
            amount: Number(amountToPay),
            payment_method: payment_method,
            proof_image_url: proofImage,
            phone_number: phone || "",
            status: 'pending'
          };

          // Add optional fields only if they exist
          if (booking?.id) proofData.booking_id = booking.id;
          if (invoice?.id) proofData.invoice_id = invoice.id;
          if (invoice?.membership_id) proofData.membership_id = invoice.membership_id;
          
          console.log("Creating payment proof with data:", proofData);
          
          await base44.entities.PaymentProof.create(proofData);

          // Notify all admin users
          const allUsers = await base44.entities.User.list();
          const adminUsers = allUsers.filter(u => u.role === 'admin');
          
          const notificationMessage = booking 
            ? `Nouvelle preuve de paiement de ${amountToPay?.toLocaleString()} FCFA pour une réservation. Téléphone: ${phone}. Cliquez pour valider.`
            : `Nouvelle preuve de paiement de ${amountToPay?.toLocaleString()} FCFA pour un abonnement. Téléphone: ${phone}. Cliquez pour valider.`;
          
          // Notify admins via centralized service (notification bell)
          await NotificationService.sendToAdmins({
            title: "?? Nouvelle preuve de paiement",
            message: notificationMessage,
            type: "payment",
            link: "/AdminDashboard"
          });

          // Send email to all admins
          for (const admin of adminUsers) {
            await SendEmail({
              to: admin.email,
              subject: "?? Nouvelle preuve de paiement à valider",
              body: `Bonjour ${admin.full_name},\n\nUne nouvelle preuve de paiement nécessite votre validation:\n\nMontant: ${amountToPay?.toLocaleString()} FCFA\nTéléphone: ${phone}\nType: ${booking ? 'Réservation' : 'Abonnement'}\nCode: ${proofCode}\n\nAccéder au back office: ${window.location.origin}/AdminDashboard\n\nCordialement,\nL'équipe EventCrafter`
            });
          }

          toast({ 
            title: "Preuve envoyée", 
            description: "Votre paiement sera validé sous 24h par notre équipe" 
          });

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
            setPhone("");
          }, 3500);
          return;
        } catch (proofError) {
          console.error("Error creating payment proof:", proofError);
          console.error("Full error details:", JSON.stringify(proofError, null, 2));
          setLoading(false);
          const errorMessage = proofError?.message || proofError?.error || "Erreur inconnue lors de la soumission";
          toast({ 
            title: "Erreur de soumission", 
            description: errorMessage, 
            variant: "destructive" 
          });
          return;
        }
      }

      // Simulate payment processing delay (API call would happen here)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 1. Create Transaction Record (Escrow)
      const transaction = await base44.entities.Transaction.create({
        user_id: currentUser.id,
        amount: amountToPay,
        type: 'booking_payment',
        payment_method: payment_method,
        description: invoice ? `Payment for Invoice #${invoice.invoice_number}` : `Payment for booking #${booking.id}`,
        status: 'escrow_held', // Funds locked
        reference_id: booking.id
      });

      // 2. Generate Receipt
      await base44.entities.Receipt.create({
          receipt_number: `RCPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`,
          transaction_id: transaction.id,
          invoice_id: invoice ? invoice.id : null,
          booking_id: booking.id,
          payer_id: currentUser.id,
          amount: amountToPay,
          payment_method: payment_method,
          payment_date: new Date().toISOString(),
          details: invoice ? `Payment for Invoice ${invoice.invoice_number} (${invoice.type})` : `Full Booking Payment`
      });

      // 3. Update Invoice Status
      if (invoice) {
          await base44.entities.Invoice.update(invoice.id, { status: 'paid' });
      }

      // 4. Update Booking Status Logic
      let shouldNotifyProviderToStart = false;

      // Start execution if it's a global payment (full) or a deposit (partial start)
      // Or if it's a legacy booking payment (no invoice = full payment implied)
      if (!invoice || invoice.type === 'global' || invoice.type === 'partial_deposit') {
          await base44.entities.Booking.update(booking.id, {
              status: 'confirmed', // Confirmed means ready for execution/in progress
              payment_status: invoice && invoice.type === 'partial_deposit' ? 'partial' : 'paid',
              paid_amount: (booking.paid_amount || 0) + amountToPay
          });
          shouldNotifyProviderToStart = true;
      } else {
           // Just update amount paid if it's a balance or other partial
           await base44.entities.Booking.update(booking.id, {
              paid_amount: (booking.paid_amount || 0) + amountToPay,
              payment_status: 'paid' // Assuming balance pays it off (simplified)
          });
      }

      // 5. Notify Vendor
      if (shouldNotifyProviderToStart) {
          await NotificationService.sendToVendor({
              vendorId: booking.planner_id,
              title: "Paiement Reçu - Prêt à Démarrer",
              message: `Paiement de ${amountToPay?.toLocaleString()} FCFA reçu (Séquestre). Les conditions pour commencer l'exécution sont remplies. Procédez avec le service.`,
              type: "payment",
              link: "/VendorDashboard?tab=bookings_received"
          });
      } else {
          await NotificationService.sendToVendor({
              vendorId: booking.planner_id,
              title: "Paiement Reçu",
              message: `Paiement de ${amountToPay?.toLocaleString()} FCFA reçu (Séquestre).`,
              type: "payment",
              link: "/VendorDashboard?tab=bookings_received"
          });
      }

      toast({ title: "Paiement Réussi", description: "Reçu généré. Fonds sécurisés en escrow." });

      setSuccessMessage({
        title: "Paiement Sécurisé!",
        description: "Votre transaction a été effectuée avec succès. Reçu généré et fonds conservés en sécurité."
      });
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        if (onPaymentComplete) onPaymentComplete();
        setSuccess(false); 
      }, 3500);

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

            <Tabs defaultValue="momo" onValueChange={setMethod} className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-4">
                <TabsTrigger value="momo">Mobile Money</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handlePayment}>
                {/* Mobile Money Content */}
                <TabsContent value="momo" className="space-y-4">
                    {invoice?.type === 'subscription' || (!booking && invoice) ? (
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
                              ?? Après avoir composé ce code, suivez les instructions sur votre téléphone pour confirmer le paiement.
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
                              ?? Copier le code
                            </Button>
                            
                            <div className="pt-2 border-t border-orange-200">
                              <p className="text-xs text-stone-700">
                                <strong>Amount to send:</strong> {amountToPay?.toLocaleString()} FCFA
                              </p>
                              <p className="text-xs text-stone-600 mt-1">
                                After transfer, click "Confirm Payment" below. Our team will verify and activate your subscription within 24 hours.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Your Phone Number (for verification)</Label>
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-2">
                            <p className="text-xs text-blue-800">
                              <strong>Format attendu :</strong> 
                              <br />• MTN : 670 12 34 56 ou 675 XX XX XX
                              <br />• Orange : 690 12 34 56 ou 655 XX XX XX
                            </p>
                          </div>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                            <Input 
                              placeholder="Ex: 670 12 34 56" 
                              className="pl-9" 
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              required
                            />
                          </div>
                          <p className="text-xs text-stone-500">Entrez le numéro utilisé pour le transfert (9 chiffres)</p>
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
                                  <p className="text-sm text-green-700 font-semibold">? Preuve téléchargée avec succès</p>
                                  <p className="text-xs text-stone-500">Cette image sera envoyée à notre équipe de validation</p>
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    variant="outline"
                                    className="border-rose-300 text-rose-600 hover:bg-rose-50"
                                    onClick={() => setProofImage(null)}
                                  >
                                    ?? Changer l'image
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
                                        <span className="text-3xl">??</span>
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
                                    <span>?? JPG</span>
                                    <span>•</span>
                                    <span>??? PNG</span>
                                    <span>•</span>
                                    <span>?? HEIC</span>
                                  </div>
                                </div>
                              </label>
                            )}
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800">
                              <strong>?? Notification automatique :</strong> Notre équipe recevra une alerte immédiate et validera votre paiement sous 24 heures.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <RadioGroup defaultValue="mtn" onValueChange={setSubMethod} className="grid grid-cols-2 gap-4">
                          <div>
                            <RadioGroupItem value="mtn" id="mtn" className="peer sr-only" />
                            <Label
                              htmlFor="mtn"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-rose-50 cursor-pointer"
                            >
                              <span className="font-bold text-[#FFCC00]">MTN</span>
                              <span className="text-xs">MoMo</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="orange" id="orange" className="peer sr-only" />
                            <Label
                              htmlFor="orange"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50 cursor-pointer"
                            >
                              <span className="font-bold text-[#FF7900]">Orange</span>
                              <span className="text-xs">Money</span>
                            </Label>
                          </div>
                        </RadioGroup>
                        
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <div className="relative">
                                <Smartphone className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                                <Input 
                                    placeholder="670 00 00 00" 
                                    className="pl-9" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required={method === "momo"}
                                />
                            </div>
                            <p className="text-xs text-stone-500">You will receive a prompt on your phone to approve.</p>
                        </div>
                      </>
                    )}
                </TabsContent>

                <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 h-11 mt-6" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                    </>
                  ) : invoice?.type === 'subscription' || (!booking && invoice) ? (
                    `Confirm Payment of ${amountToPay?.toLocaleString()} FCFA`
                  ) : (
                    `Pay ${amountToPay?.toLocaleString()} FCFA`
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