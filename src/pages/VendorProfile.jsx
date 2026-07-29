import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, FileSignature, CheckCircle2, Send, Clock, XCircle } from "lucide-react";
import VendorProfileForm from "@/components/dashboard/VendorProfileForm";
import VendorBankAccountManager from "@/components/dashboard/VendorBankAccountManager";
import VendorReviewsDisplay from "@/components/dashboard/VendorReviewsDisplay";
import { NotificationService } from '@/components/NotificationService';

export default function VendorProfile() {
  const [user, setUser] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const profiles = await base44.entities.VendorProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0) {
          setVendorProfile(profiles[0]);
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refetchProfile = async () => {
    if (!user) return;
    const profiles = await base44.entities.VendorProfile.filter({ user_id: user.id });
    if (profiles.length > 0) {
      setVendorProfile(profiles[0]);
    }
  };

  const getStatusInfo = (status) => {
    const info = {
      unverified: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-100", text: "NON VÉRIFIÉ" },
      pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", text: "EN ATTENTE" },
      verified: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", text: "VÉRIFIÉ" },
      rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", text: "REJETÉ" }
    };
    return info[status] || info.unverified;
  };

  const handleSendRequest = async () => {
    if (!message.trim()) {
      toast({ title: "Message requis", description: "Veuillez expliquer votre demande.", variant: "destructive" });
      return;
    }
    if (!vendorProfile?.verification_docs?.length) {
      toast({ title: "Documents requis", description: "Veuillez télécharger au moins un document.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const requestCode = `VER-VENDOR-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;

      await base44.entities.VerificationRequest.create({
        request_code: requestCode,
        client_id: user.id,
        profile_id: vendorProfile.id,
        request_type: 'business',
        status: 'pending',
        client_message: message
      });

      await base44.entities.VendorProfile.update(vendorProfile.id, {
        verification_status: 'pending'
      });

      await NotificationService.sendToAdmins({
        title: "Nouvelle demande de vérification",
        message: `${vendorProfile.business_name || user.full_name} a demandé la vérification de son compte prestataire avec ${vendorProfile.verification_docs.length} document(s)`,
        type: "system",
        link: "/AdminDashboard"
      });

      toast({ title: "Demande envoyée", description: "Un administrateur vous contactera sous peu." });
      setMessage("");
      refetchProfile();
    } catch (error) {
      console.error("Error sending verification request:", error);
      toast({ title: "Erreur", description: "Impossible d'envoyer la demande.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading || !user) {
    return <div className="p-20 text-center">Chargement...</div>;
  }

  const statusInfo = getStatusInfo(vendorProfile?.verification_status || 'unverified');
  const StatusIcon = statusInfo.icon;
  const canRequest = !vendorProfile?.verification_status ||
                    vendorProfile.verification_status === 'unverified' ||
                    vendorProfile.verification_status === 'rejected';

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Mon Profil Business</h1>
        <p className="text-stone-500">Gérez votre identité commerciale et vérification</p>
      </div>

      <VendorProfileForm
        user={user}
        initialProfile={vendorProfile}
        onSave={refetchProfile}
      />

      {vendorProfile && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  Documents de Vérification
                </CardTitle>
                <CardDescription>Soumettez votre demande de vérification de compte</CardDescription>
              </div>
              <Badge className={`${statusInfo.bg} ${statusInfo.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusInfo.text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {canRequest ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 text-sm">Documents requis :</h4>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>• CNI (Carte Nationale d'Identité)</li>
                    <li>• NUI (Numéro Unique d'Identification)</li>
                    <li>• Numéro de registre de commerce</li>
                    <li>• ACF valide (Attestation de Conformité Fiscale)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Expliquez votre demande</label>
                  <Textarea
                    placeholder="Bonjour, je souhaite faire vérifier mon entreprise..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <p className="text-sm text-stone-600">
                  Téléchargez l'enregistrement commercial, pièce d'identité ou portfolio (PDF, Word, Audio, Vidéo acceptés).
                </p>

                <input
                  type="file"
                  id="verification-docs"
                  multiple
                  accept=".pdf,.doc,.docx,audio/*,video/*,image/*"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    try {
                      toast({ title: "Téléchargement des documents..." });
                      const uploadPromises = files.map(file => UploadFile({ file }));
                      const results = await Promise.all(uploadPromises);
                      const urls = results.map(r => r.file_url);

                      const currentDocs = vendorProfile.verification_docs || [];
                      await base44.entities.VendorProfile.update(vendorProfile.id, {
                        verification_docs: [...currentDocs, ...urls]
                      });

                      toast({ title: "Documents téléchargés avec succès" });
                      refetchProfile();
                    } catch (error) {
                      toast({
                        title: "Échec du téléchargement",
                        description: "Les documents n'ont pas pu être téléchargés.",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="hidden"
                />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('verification-docs').click()}
                >
                  <FileSignature className="w-4 h-4 mr-2" />
                  Télécharger Document
                </Button>

                {vendorProfile?.verification_docs?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-stone-500">Documents Téléchargés :</p>
                    {vendorProfile.verification_docs.map((doc, i) => (
                      <a
                        key={i}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-stone-50 rounded hover:bg-stone-100 text-sm"
                      >
                        <FileSignature className="w-4 h-4 text-rose-600" />
                        Document {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full bg-rose-600 hover:bg-rose-700"
                  disabled={sending}
                  onClick={handleSendRequest}
                >
                  {sending ? "Envoi en cours..." : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer la demande
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusInfo.bg} mb-4`}>
                  <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
                </div>
                <p className="text-sm text-stone-600">
                  {vendorProfile?.verification_status === 'pending' &&
                    "Votre demande est en cours de traitement. Consultez vos notifications."}
                  {vendorProfile?.verification_status === 'verified' &&
                    "Félicitations ! Votre entreprise est vérifiée."}
                </p>

                {vendorProfile?.verification_docs?.length > 0 && (
                  <div className="space-y-2 mt-4 text-left">
                    <p className="text-xs font-medium text-stone-500">Documents soumis :</p>
                    {vendorProfile.verification_docs.map((doc, i) => (
                      <a
                        key={i}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-stone-50 rounded hover:bg-stone-100 text-sm"
                      >
                        <FileSignature className="w-4 h-4 text-rose-600" />
                        Document {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <VendorBankAccountManager user={user} />

      <div className="mt-6">
        <VendorReviewsDisplay vendorUserId={user.id} />
      </div>
    </div>
  );
}
