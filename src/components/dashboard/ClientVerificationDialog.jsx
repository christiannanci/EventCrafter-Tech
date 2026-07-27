import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { Shield, Send, CheckCircle2, Clock, XCircle } from "lucide-react";

export default function ClientVerificationDialog({ profile, user, onUpdate }) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
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
            const requestCode = `VER-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;
            
            // Create verification request
            await base44.entities.VerificationRequest.create({
                request_code: requestCode,
                client_id: user.id,
                profile_id: profile.id,
                request_type: 'identity',
                status: 'pending',
                client_message: message
            });

            // Notify all admins
            const allUsers = await base44.entities.User.list();
            const admins = allUsers.filter(u => u.role === 'admin');
            
            for (const admin of admins) {
                await base44.entities.Notification.create({
                    user_id: admin.id,
                    title: "Nouvelle demande de vérification client",
                    message: `${user.full_name} (${user.email}) demande une vérification d'identité. Code: ${requestCode}`,
                    type: "verification_request",
                    link: "/AdminDashboard",
                    is_read: false
                });
            }

            toast({ 
                title: "Demande envoyée", 
                description: "Un administrateur vous contactera sous peu avec les instructions." 
            });

            setOpen(false);
            setMessage("");
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
                description: "Votre compte n'est pas encore vérifié"
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
                description: "Votre identité est vérifiée"
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
                        Vérification Client
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
                                    <li>✓ Badge vérifié visible sur votre profil</li>
                                    <li>✓ Confiance accrue des prestataires</li>
                                    <li>✓ Priorité dans le traitement des réservations</li>
                                    <li>✓ Accès à des services premium</li>
                                </ul>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-900 mb-2">📋 Documents requis pour la vérification :</h4>
                                <ul className="text-xs text-amber-800 space-y-1">
                                    <li>• CNI (Carte Nationale d'Identité)</li>
                                    <li>• NUI (Numéro Unique d'Identification)</li>
                                    <li>• Numéro de téléphone</li>
                                    <li>• Deux photos 4*4</li>
                                    <li>• Plans de localisation domicile</li>
                                    <li>• Engagement sur l'honneur</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expliquez votre demande</label>
                                <Textarea 
                                    placeholder="Bonjour, je souhaite faire vérifier mon compte pour profiter des avantages..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                />
                                <p className="text-xs text-amber-600 font-medium">
                                    ⚠️ Préparez tous les documents listés ci-dessus avant de soumettre votre demande.
                                </p>
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
                                    "Félicitations ! Votre compte est vérifié."}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}