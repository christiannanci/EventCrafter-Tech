import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { Wallet, Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { NotificationService } from '@/components/NotificationService';

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

export default function WalletRechargeDialog({ vendorProfile, currentUser, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(2000);
  const [customAmount, setCustomAmount] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const handleUploadProof = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setProofImage(file_url);
      toast({ title: "Preuve téléchargée" });
    } catch (error) {
      toast({ title: "Échec du téléchargement", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!finalAmount || finalAmount < 500) {
      toast({ title: "Montant invalide", description: "Le montant minimum est de 500 FCFA.", variant: "destructive" });
      return;
    }
    if (!proofImage) {
      toast({ title: "Preuve requise", description: "Veuillez télécharger une preuve de paiement.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const proofCode = `WALLET-${Date.now()}`;

      await base44.entities.PaymentProof.create({
        proof_code: proofCode,
        user_id: currentUser.id,
        amount: finalAmount,
        payment_method: "wallet_recharge_orange",
        proof_image_url: proofImage,
        phone_number: "",
        status: "pending"
      });

      await NotificationService.sendToAdmins({
        title: "💰 Recharge portefeuille en attente",
        message: `${vendorProfile?.business_name || currentUser.email} demande une recharge de ${finalAmount.toLocaleString()} FCFA (${proofCode}).`,
        type: "payment",
        link: "/AdminDashboard?tab=payment_proofs"
      });

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setProofImage(null);
        setCustomAmount("");
        if (onSuccess) onSuccess();
      }, 2500);
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible d'envoyer la demande de recharge.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const ussdCode = `#150*47*974936*${finalAmount}#`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button onClick={() => setIsOpen(true)} className="bg-green-600 hover:bg-green-700">
        <Wallet className="w-4 h-4 mr-2" />
        Recharger mon portefeuille
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            Recharger mon portefeuille
          </DialogTitle>
          <DialogDescription>
            Rechargez votre solde via Orange Money pour acheter des crédits, boosts ou badges.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-10 text-center animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Demande envoyée</h3>
            <p className="text-stone-500 mt-2 text-sm">
              Un administrateur validera votre recharge sous 24h.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Montant à recharger (FCFA)</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={amount === amt && !customAmount ? "default" : "outline"}
                    className={amount === amt && !customAmount ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => { setAmount(amt); setCustomAmount(""); }}
                  >
                    {amt.toLocaleString()}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Ou montant personnalisé"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min={500}
              />
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-orange-700 font-semibold">
                <Smartphone className="w-4 h-4" />
                Code de paiement USSD Orange Money
              </div>
              <div className="bg-white rounded-lg p-3 border-2 border-orange-300">
                <code className="text-xl font-bold text-orange-600 block select-all">
                  {ussdCode}
                </code>
              </div>
              <p className="text-xs text-stone-600">
                Composez ce code, confirmez le paiement, puis téléchargez la preuve ci-dessous.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Preuve de paiement</Label>
              {proofImage ? (
                <div className="text-center space-y-2">
                  <img src={proofImage} alt="Preuve" className="max-h-40 mx-auto rounded-lg border" />
                  <Button type="button" size="sm" variant="outline" onClick={() => setProofImage(null)}>
                    Changer l'image
                  </Button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center block cursor-pointer hover:border-green-400">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadProof} disabled={uploading} />
                  {uploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-green-500" />
                  ) : (
                    <span className="text-sm text-stone-500">Cliquez pour télécharger une capture d'écran</span>
                  )}
                </label>
              )}
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={sending}
              onClick={handleSubmit}
            >
              {sending ? "Envoi en cours..." : `Confirmer la recharge de ${finalAmount.toLocaleString()} FCFA`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
