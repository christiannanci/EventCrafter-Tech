import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/apiClient";
import { SendEmail, UploadFile } from "@/api/integrations";
import { useToast } from "@/components/ui/use-toast";
import { Shield, Send, CheckCircle2, Clock, XCircle, FileSignature } from "lucide-react";

export default function VendorVerificationDialog({ profile, user, onUpdate }) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleRequestVerification = async () => {
        if (!message.trim()) {
            toast({ 
                title: "Message requis", 
                description: "Veuillez expliquer votre demande.", 
                variant: "destructive" 
            });
            return;
        }

        setLoading(true);
        try {
            if (!profile?.id) {
                toast({ 
                    title: "Erreur", 
                    description: "Veuillez d'abord créer votre profil prestataire.", 
                    variant: "destructive" 
                });
                setLoading(false);
                return;
            }

            const requestCode = `VER-VENDOR-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;
            
            // Create verification request
            await base44.entities.VerificationRequest.create({
                request_code: requestCode,
                client_id: user.id,
                profile_id: profile.id,
                request_type: 'business',
                status: 'pending',
                client_message: message
            });

            // Save uploaded docs to profile
            const currentDocs = profile.verification_docs || [];
            await base44.entities.VendorProfile.update(profile.id, {
                verification_status: 'pending',
                verification_docs: [...currentDocs, ...uploadedDocs]
            });

            // Notify all admins via notification bell AND email
            const allUsers = await base44.entities.User.list();
            const admins = allUsers.filter(u => u.role === 'admin');
            
            for (const admin of admins) {
                // Notification dans la cloche
                await base44.entities.Notification.create({
                    user_id: admin.id,
                    title: "Nouvelle demande de vérification",
                    message: `${profile.business_name || user.full_name} a demandé la vérification de son compte prestataire avec ${uploadedDocs.length} document(s)`,
                    type: "system",
                    link: "/AdminDashboard",
                    is_read: false
                });

                // Email à l'admin
                await SendEmail({
                    to: admin.email,
                    subject: "?? Nouvelle demande de vérification prestataire",
                    body: `Bonjour ${admin.full_name},\n\nUne nouvelle demande de vérification a été soumise:\n\nPrestataire: ${profile.business_name || user.full_name}\nDocuments fournis: ${uploadedDocs.length}\nMessage: ${message}\n\nCliquez ici pour valider: ${window.location.origin}/AdminDashboard\n\nCordialement,\nL'équipe EventCrafter`
                });
            }

            toast({ 
                title: "Demande envoyée", 
                description: "Un administrateur vous contactera sous peu avec les instructions." 
            });

            setOpen(false);
            setMessage("");
            setUploadedDocs([]);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error requesting verification:", error);
            toast({ 
                title: "Erreur", 
                description: "Impossible d'envoyer la demande.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status) => {
        const info = {
            unverified: {
                icon: XCircle,
                color: "text-gray-500",
                bg: "bg-gray-100",
                text: "NON VÉRIFIÉ",
                description: "Votre entreprise n'est pas encore vérifiée"
            },
            pending: {
                icon: Clock,
                color: "text-yellow-600",
                bg: "bg-yellow-100",
                text: "EN ATTENTE",
                description: "Vérification en cours de traitement"
            },
            verified: {
                icon: CheckCircle2,
                color: "text-green-600",
                bg: "bg-green-100",
                text: "VÉRIFIÉ",
                description: "Votre entreprise est vérifiée"
            },
            rejected: {
                icon: XCircle,
                color: "text-red-600",
                bg: "bg-red-100",
                text: "REJETÉ",
                description: "Vérification refusée"
            }
        };
        return info[status] || info.unverified;
    };

    const statusInfo = getStatusInfo(profile?.verification_status || 'unverified');
    const StatusIcon = statusInfo.icon;
    const canRequest = !profile?.verification_status || 
                      profile.verification_status === 'unverified' || 
                      profile.verification_status === 'rejected';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Badge className={`${statusInfo.bg} ${statusInfo.color} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.text}
                </Badge>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-rose-600" />
                        Vérification Prestataire
                    </DialogTitle>
                    <DialogDescription>
                        {statusInfo.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {canRequest ? (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <h4 className="font-semibold text-blue-900 mb-2">Avantages de la vérification :</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>? Badge vérifié visible sur vos services</li>
                                    <li>? Confiance accrue des clients</li>
                                    <li>? Meilleur positionnement dans les recherches</li>
                                    <li>? Accès à des opportunités premium</li>
                                    <li>? Taux de conversion plus élevé</li>
                                </ul>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-900 mb-2">?? Documents requis pour la vérification :</h4>
                                <ul className="text-xs text-amber-800 space-y-1">
                                    <li>• CNI (Carte Nationale d'Identité)</li>
                                    <li>• NUI (Numéro Unique d'Identification)</li>
                                    <li>• Numéro de registre de commerce</li>
                                    <li>• ACF valide (Attestation de Conformité Fiscale)</li>
                                    <li>• Numéro de téléphone</li>
                                    <li>• Deux photos 4*4</li>
                                    <li>• Plans de localisation (domicile et bureau)</li>
                                    <li>• Engagement sur l'honneur</li>
                                    <li>• Dépôt de garantie dans compte bancaire</li>
                                    <li>• Désignation de 03 personnes de référence</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expliquez votre demande</label>
                                <Textarea 
                                    placeholder="Bonjour, je souhaite faire vérifier mon entreprise pour gagner en crédibilité..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                />
                                <p className="text-xs text-amber-600 font-medium">
                                    ?? Préparez tous les documents listés ci-dessus avant de soumettre votre demande.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Documents de vérification</label>
                                <input 
                                    type="file" 
                                    id="dialog-verification-docs"
                                    multiple
                                    accept=".pdf,.doc,.docx,audio/*,video/*,image/*"
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        
                                        try {
                                            setUploading(true);
                                            toast({ title: "Upload en cours..." });
                                            const uploadPromises = files.map(file => 
                                                UploadFile({ file })
                                            );
                                            const results = await Promise.all(uploadPromises);
                                            const urls = results.map(r => r.file_url);
                                            
                                            setUploadedDocs([...uploadedDocs, ...urls]);
                                            toast({ title: "Documents uploadés" });
                                        } catch (error) {
                                            toast({ title: "Erreur d'upload", variant: "destructive" });
                                        } finally {
                                            setUploading(false);
                                        }
                                    }}
                                    className="hidden"
                                />
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    className="w-full"
                                    onClick={() => document.getElementById('dialog-verification-docs').click()}
                                    disabled={uploading}
                                >
                                    <FileSignature className="w-4 h-4 mr-2" />
                                    {uploading ? "Upload en cours..." : "Ajouter des documents"}
                                </Button>
                                
                                {uploadedDocs.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-green-600 font-medium">
                                            {uploadedDocs.length} document(s) prêt(s) à envoyer
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button 
                                onClick={handleRequestVerification} 
                                className="w-full bg-rose-600 hover:bg-rose-700"
                                disabled={loading}
                            >
                                {loading ? "Envoi en cours..." : (
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
                                {profile?.verification_status === 'pending' && 
                                    "Votre demande est en cours de traitement. Consultez vos notifications."}
                                {profile?.verification_status === 'verified' && 
                                    "Félicitations ! Votre entreprise est vérifiée."}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}