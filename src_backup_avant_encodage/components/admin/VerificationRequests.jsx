import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, MessageSquare, CheckCircle2, XCircle, Send, FileText, Eye } from "lucide-react";
import { format } from "date-fns";

export default function VerificationRequests() {
    const [requests, setRequests] = useState([]);
    const [clientProfiles, setClientProfiles] = useState({});
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [adminResponse, setAdminResponse] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [reqs, clientProfs, vendorProfs, allUsers] = await Promise.all([
                base44.entities.VerificationRequest.list('-created_date'),
                base44.entities.ClientProfile.list(),
                base44.entities.VendorProfile.list(),
                base44.entities.User.list()
            ]);

            setRequests(reqs);
            
            const profilesMap = {};
            clientProfs.forEach(p => profilesMap[p.id] = p);
            vendorProfs.forEach(p => profilesMap[p.id] = p);
            setClientProfiles(profilesMap);

            const usersMap = {};
            allUsers.forEach(u => usersMap[u.id] = u);
            setUsers(usersMap);
        } catch (error) {
            console.error("Failed to fetch verification requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequirements = async () => {
        if (!adminResponse.trim()) {
            toast({ title: "Message requis", variant: "destructive" });
            return;
        }

        setActionLoading(true);
        try {
            const currentUser = await base44.auth.me();

            await base44.entities.VerificationRequest.update(selectedRequest.id, {
                status: 'documents_sent',
                admin_response: adminResponse,
                admin_id: currentUser.id,
                documents_required: [
                    "Copie de la pièce d'identité (CNI, passeport)",
                    "Preuve de résidence (facture électricité/eau)",
                    "Photo selfie avec pièce d'identité"
                ]
            });

            // Notify client
            await base44.entities.Notification.create({
                user_id: selectedRequest.client_id,
                title: "Documents requis pour vérification",
                message: adminResponse,
                type: "verification_response",
                link: "/ClientDashboard",
                is_read: false
            });

            // Email notification
            const client = users[selectedRequest.client_id];
            if (client) {
                await SendEmail({
                    to: client.email,
                    subject: "?? Documents requis pour vérification",
                    body: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #FF6B35;">Documents requis pour vérification</h2>
                            <p>Bonjour ${client.full_name},</p>
                            <p>${adminResponse}</p>
                            <a href="${window.location.origin}/ClientDashboard" 
                               style="display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 6px; margin-top: 15px;">
                                Soumettre les documents
                            </a>
                        </div>
                    `
                });
            }

            toast({ title: "Exigences envoyées au client" });
            setSelectedRequest(null);
            setAdminResponse("");
            fetchData();
        } catch (error) {
            console.error("Error sending requirements:", error);
            toast({ title: "Erreur", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async (request) => {
        setActionLoading(true);
        try {
            const currentUser = await base44.auth.me();
            
            // Update request
            await base44.entities.VerificationRequest.update(request.id, {
                status: 'approved',
                approved_date: new Date().toISOString(),
                admin_id: currentUser.id
            });

            // Update profile (client or vendor)
            const profile = clientProfiles[request.profile_id];
            if (profile) {
                if (profile.user_id) {
                    // It's a VendorProfile
                    await base44.entities.VendorProfile.update(request.profile_id, {
                        verification_status: 'verified'
                    });
                } else {
                    // It's a ClientProfile
                    await base44.entities.ClientProfile.update(request.profile_id, {
                        verification_status: 'verified'
                    });
                }
            }

            // Notify client
            await base44.entities.Notification.create({
                user_id: request.client_id,
                title: "? Compte vérifié avec succès",
                message: "Félicitations ! Votre identité a été vérifiée. Vous bénéficiez maintenant de tous les avantages.",
                type: "verification_approved",
                link: "/ClientDashboard",
                is_read: false
            });

            // Email notification
            const approvedUser = users[request.client_id];
            if (approvedUser) {
                await SendEmail({
                    to: approvedUser.email,
                    subject: "? Compte vérifié avec succès",
                    body: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #22C55E;">Félicitations ! Votre compte est vérifié</h2>
                            <p>Bonjour ${approvedUser.full_name},</p>
                            <p>Votre identité a été vérifiée avec succès. Vous bénéficiez maintenant de tous les avantages de notre plateforme.</p>
                            <a href="${window.location.origin}/ClientDashboard" 
                               style="display: inline-block; background: #22C55E; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 6px; margin-top: 15px;">
                                Accéder à mon compte
                            </a>
                        </div>
                    `
                });
            }

            toast({ title: "Client vérifié avec succès", description: "Badge vérifié attribué." });
            fetchData();
        } catch (error) {
            console.error("Error approving verification:", error);
            toast({ title: "Erreur", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (request, reason) => {
        if (!reason?.trim()) {
            toast({ title: "Raison requise", variant: "destructive" });
            return;
        }

        setActionLoading(true);
        try {
            await base44.entities.VerificationRequest.update(request.id, {
                status: 'rejected',
                rejection_reason: reason
            });

            // Update profile (client or vendor)
            const profile = clientProfiles[request.profile_id];
            if (profile) {
                if (profile.user_id) {
                    // It's a VendorProfile
                    await base44.entities.VendorProfile.update(request.profile_id, {
                        verification_status: 'rejected'
                    });
                } else {
                    // It's a ClientProfile
                    await base44.entities.ClientProfile.update(request.profile_id, {
                        verification_status: 'rejected'
                    });
                }
            }

            // Notification cloche
            await base44.entities.Notification.create({
                user_id: request.client_id,
                title: "Demande de vérification refusée ?",
                message: `Raison : ${reason}`,
                type: "verification_rejected",
                link: "/ClientDashboard",
                is_read: false
            });

            // Email notification
            const rejectedUser = users[request.client_id];
            if (rejectedUser) {
                await SendEmail({
                    to: rejectedUser.email,
                    subject: "? Demande de vérification refusée",
                    body: `Bonjour ${rejectedUser.full_name},\n\nVotre demande de vérification a été rejetée.\n\nRaison du rejet: ${reason}\n\nVous pouvez soumettre une nouvelle demande avec les documents corrigés.\n\nCordialement,\nL'équipe EventCrafter`
                });
            }

            toast({ title: "Demande rejetée et utilisateur notifié", duration: 4000 });
            fetchData();
        } catch (error) {
            console.error("Error rejecting verification:", error);
            toast({ title: "Erreur", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: "bg-yellow-100 text-yellow-800",
            documents_sent: "bg-blue-100 text-blue-800",
            documents_received: "bg-purple-100 text-purple-800",
            approved: "bg-green-100 text-green-800",
            rejected: "bg-red-100 text-red-800"
        };
        return <Badge className={styles[status] || "bg-gray-100"}>{status?.toUpperCase()}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Demandes de Vérification
                </CardTitle>
                <CardDescription>Gérer les demandes de vérification (Clients & Prestataires)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req) => {
                                const client = users[req.client_id];
                                const profile = clientProfiles[req.profile_id];

                                return (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-mono text-xs">{req.request_code}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{client?.full_name || "Unknown"}</div>
                                                <div className="text-xs text-stone-500">{client?.email}</div>
                                                {req.request_type === 'business' && (
                                                    <Badge variant="outline" className="mt-1 text-xs">Prestataire</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {format(new Date(req.created_date), 'dd/MM/yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {req.status === 'pending' && (
                                                    <>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline"
                                                                    onClick={() => setSelectedRequest(req)}
                                                                >
                                                                    <MessageSquare className="w-3 h-3 mr-1" />
                                                                    Répondre
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Envoyer les exigences</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4 py-4">
                                                                    <div className="bg-stone-50 p-3 rounded text-sm">
                                                                        <strong>Message :</strong>
                                                                        <p className="mt-2 text-stone-600">{req.client_message}</p>
                                                                    </div>

                                                                    <Textarea 
                                                                        placeholder="Bonjour, pour vérifier votre compte, veuillez nous fournir..."
                                                                        value={adminResponse}
                                                                        onChange={(e) => setAdminResponse(e.target.value)}
                                                                        rows={6}
                                                                    />

                                                                    <Button 
                                                                        onClick={handleSendRequirements}
                                                                        className="w-full"
                                                                        disabled={actionLoading}
                                                                    >
                                                                        <Send className="w-4 h-4 mr-2" />
                                                                        Envoyer les exigences
                                                                    </Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        
                                                        {req.request_type === 'business' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => handleApprove(req)}
                                                                className="bg-green-600 hover:bg-green-700"
                                                                disabled={actionLoading}
                                                            >
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Vérifier
                                                            </Button>
                                                        )}
                                                    </>
                                                )}

                                                {(req.status === 'pending' || req.status === 'documents_sent' || req.status === 'documents_received') && (profile?.verification_documents?.length > 0 || profile?.verification_docs?.length > 0) && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className="w-3 h-3 mr-1" />
                                                                Examiner
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Documents soumis</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4 py-4">
                                                               <div className="bg-stone-50 p-3 rounded text-sm mb-4">
                                                                   <strong>Message du prestataire :</strong>
                                                                   <p className="mt-2 text-stone-600">{req.client_message || "Aucun message"}</p>
                                                               </div>

                                                               <div className="space-y-2">
                                                                   <p className="text-sm font-medium text-stone-700">Documents soumis :</p>
                                                                   {(profile.verification_documents || profile.verification_docs || []).map((doc, i) => (
                                                                       <a 
                                                                           key={i} 
                                                                           href={doc} 
                                                                           target="_blank" 
                                                                           rel="noopener noreferrer"
                                                                           className="flex items-center gap-2 p-3 bg-white border rounded hover:bg-stone-50 transition-colors"
                                                                       >
                                                                           <FileText className="w-5 h-5 text-rose-600" />
                                                                           <span className="text-sm font-medium">Document {i + 1}</span>
                                                                       </a>
                                                                   ))}
                                                               </div>

                                                                <div className="flex gap-2 pt-4 border-t">
                                                                    <Button 
                                                                        onClick={() => handleApprove(req)}
                                                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                                                        disabled={actionLoading}
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                        Approuver
                                                                    </Button>
                                                                    <Dialog>
                                                                        <DialogTrigger asChild>
                                                                            <Button 
                                                                                variant="destructive"
                                                                                className="flex-1"
                                                                            >
                                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                                Rejeter
                                                                            </Button>
                                                                        </DialogTrigger>
                                                                        <DialogContent>
                                                                            <DialogHeader>
                                                                                <DialogTitle>Raison du rejet</DialogTitle>
                                                                            </DialogHeader>
                                                                            <Textarea 
                                                                                placeholder="Veuillez expliquer pourquoi la vérification est rejetée..."
                                                                                rows={4}
                                                                                id="reject-reason"
                                                                            />
                                                                            <Button 
                                                                                onClick={() => {
                                                                                    const reason = document.getElementById('reject-reason').value;
                                                                                    handleReject(req, reason);
                                                                                }}
                                                                                variant="destructive"
                                                                                className="w-full"
                                                                            >
                                                                                Confirmer le rejet
                                                                            </Button>
                                                                        </DialogContent>
                                                                    </Dialog>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}

                                                {req.status === 'approved' && (
                                                    <Badge className="bg-green-100 text-green-800">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Vérifié
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {requests.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <Shield className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                        <p className="text-stone-500">Aucune demande de vérification</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}