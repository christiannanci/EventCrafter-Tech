import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldAlert, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ServiceTypesConfig() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await base44.entities.ServiceType.list();
            setRequests(data.filter(item => item.status === 'pending'));
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleAction = async (id, action) => {
        try {
            const newStatus = action === 'approve' ? 'active' : 'rejected';
            await base44.entities.ServiceType.update(id, { status: newStatus });
            toast({
                title: action === 'approve' ? "Approuvé" : "Rejeté",
                description: `Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès.`,
                variant: action === 'approve' ? "default" : "destructive"
            });
            fetchRequests();
        } catch (error) {
            toast({ title: "Erreur", description: "Opération échouée", variant: "destructive" });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <CardTitle>Demandes en attente</CardTitle>
                </div>
                <CardDescription>
                    Approuver ou rejeter les nouvelles catégories de services suggérées par les prestataires.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-stone-400" /></div>
                ) : requests.length > 0 ? (
                    <div className="divide-y divide-stone-100">
                        {requests.map((request) => (
                            <div key={request.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-stone-900">{request.name}</h3>
                                        <Badge variant="outline">{request.abbreviation}</Badge>
                                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>
                                    </div>
                                    <p className="text-sm text-stone-600 mb-1">{request.description}</p>
                                    <div className="flex gap-2 text-xs text-stone-400">
                                        <span>Type: {request.media_type}</span>
                                        {request.media_url && (
                                            <a href={request.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                Voir média
                                            </a>
                                        )}
                                        <span>• Demandé par: {request.created_by}</span>
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
                        <p className="text-stone-500">Aucune demande en attente.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}