import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminServiceTypes() {
    const [user, setUser] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await base44.auth.me();
                if (currentUser?.role !== 'admin') {
                    window.location.href = '/';
                    return;
                }
                setUser(currentUser);
                fetchRequests();
            } catch (e) {
                window.location.href = '/login';
            }
        };
        checkUser();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Fetch pending service types
            const data = await base44.entities.ServiceType.list();
            // Client side filter for simplicity or if backend filter is limited
            const pending = data.filter(item => item.status === 'pending');
            setRequests(pending);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            const newStatus = action === 'approve' ? 'active' : 'rejected';
            await base44.entities.ServiceType.update(id, { status: newStatus });
            
            toast({
                title: action === 'approve' ? "Approuvé" : "Rejeté",
                description: `Demande de type de service ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès.`,
                variant: action === 'approve' ? "default" : "destructive"
            });
            
            fetchRequests();
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "L'opération a échoué", variant: "destructive" });
        }
    };

    if (!user) return null;

    return (
        <div className="container mxauto px-4 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-stone-900">Approbations des Types de Service</h1>
                <p className="text-stone-500">Gérez les demandes des prestataires pour de nouvelles catégories de service.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        <CardTitle>Demandes en Attente</CardTitle>
                    </div>
                    <CardDescription>
                        Examinez et validez les nouvelles catégories suggérées par les prestataires.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 text-center text-stone-500">Chargement des demandes...</div>
                    ) : requests.length > 0 ? (
                        <div className="divide-y divide-stone-100">
                            {requests.map((request) => (
                                <div key={request.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-stone-900">{request.name}</h3>
                                            <Badge variant="outline">{request.abbreviation}</Badge>
                                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En Attente</Badge>
                                        </div>
                                        <p className="text-sm text-stone-600 mb-1">{request.description}</p>
                                        <div className="flex gap-2 text-xs text-stone-400">
                                            <span>Type : {request.media_type}</span>
                                            {request.media_url && (
                                                <a href={request.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                    Voir le Média
                                                </a>
                                            )}
                                            <span>• Demandé par : {request.created_by}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleAction(request.id, 'reject')}>
                                            <XCircle className="w-4 h-4 mr-2" /> Rejeter
                                        </Button>
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(request.id, 'approve')}>
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center bg-stone-50 rounded-lg border border-dashed border-stone-200">
                            <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-stone-900">Tout est à jour !</h3>
                            <p className="text-stone-500">Aucune demande en attente à examiner.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
