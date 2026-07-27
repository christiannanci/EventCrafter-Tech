import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const GEO_ENTITIES = {
    continent: base44.entities.Continent,
    country: base44.entities.Country,
    region: base44.entities.Region,
    departement: base44.entities.Departement,
    ville: base44.entities.Ville,
    arrondissement: base44.entities.Arrondissement,
    quartier: base44.entities.Quartier
};

export default function GeoConfig() {
    const [activeTab, setActiveTab] = useState("quartier");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchPending = async () => {
        setLoading(true);
        try {
            const data = await GEO_ENTITIES[activeTab].filter({ status: 'pending' });
            setItems(data);
        } catch (e) {
            console.error(e);
            toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPending(); }, [activeTab]);

    const handleApprove = async (id) => {
        try {
            await GEO_ENTITIES[activeTab].update(id, { status: 'active' });
            toast({ title: "Approuvé", description: "Localisation maintenant active." });
            fetchPending();
        } catch (e) {
            toast({ title: "Erreur", description: "Échec de l'approbation", variant: "destructive" });
        }
    };

    const handleReject = async (id) => {
        if (!confirm("Confirmer la suppression de cette entrée ?")) return;
        try {
            await GEO_ENTITIES[activeTab].delete(id);
            toast({ title: "Rejeté", description: "Entrée supprimée." });
            fetchPending();
        } catch (e) {
            toast({ title: "Erreur", description: "Échec du rejet", variant: "destructive" });
        }
    };

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-2 mb-6 bg-transparent">
                {Object.keys(GEO_ENTITIES).map(key => (
                    <TabsTrigger key={key} value={key} className="capitalize data-[state=active]:bg-rose-600 data-[state=active]:text-white border bg-white">
                        {key}
                    </TabsTrigger>
                ))}
            </TabsList>

            <Card>
                <CardHeader>
                    <CardTitle className="capitalize flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-rose-500" />
                        En attente : {activeTab}s
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-stone-400" /></div>
                    ) : items.length === 0 ? (
                        <div className="text-center p-8 text-stone-500 bg-stone-50 rounded-lg border border-dashed">
                            <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-2" />
                            Aucun élément en attente.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border">
                                    <div>
                                        <div className="font-bold text-lg">{item.name}</div>
                                        <div className="text-sm text-stone-500 font-mono">Code: {item.code}</div>
                                        {item.parent_code && <div className="text-xs text-stone-400">Parent: {item.parent_code}</div>}
                                        <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-200">En attente</Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleApprove(item.id)} className="bg-green-600 hover:bg-green-700">
                                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approuver
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(item.id)}>
                                            <XCircle className="w-4 h-4 mr-1" /> Rejeter
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </Tabs>
    );
}