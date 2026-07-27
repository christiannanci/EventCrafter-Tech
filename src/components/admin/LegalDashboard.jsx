import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Gavel, CheckCircle, Download } from "lucide-react";
import DisputeManager from "@/components/dashboard/DisputeManager";
import { generateContractPDF } from "@/components/utils/contractPdf";

export default function LegalDashboard() {
    const [contracts, setContracts] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [selectedDisputeBooking, setSelectedDisputeBooking] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const user = await base44.auth.me();
                setCurrentUser(user);

                const [c, d, b] = await Promise.all([
                    base44.entities.Contract.list('-created_date'),
                    base44.entities.Dispute.list('-created_date'),
                    base44.entities.Booking.list()
                ]);
                setContracts(c);
                setDisputes(d);
                setBookings(b);
            } catch (e) {
                console.error("Erreur chargement Legal Dashboard:", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const openDisputeCenter = (dispute) => {
        const booking = bookings.find(b => b.id === dispute.booking_id);
        if (booking) {
            setSelectedDisputeBooking(booking);
        }
    };

    const statusBadgeVariant = (status) => {
        if (status === 'signed' || status === 'active') return 'default';
        if (status === 'draft' || status === 'pending_contract') return 'outline';
        return 'secondary';
    };

    if (loading) {
        return <div className="p-10 text-center text-stone-500">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Legal & Compliance Dashboard</h2>
            <Tabs defaultValue="contracts">
                <TabsList>
                    <TabsTrigger value="contracts">Contracts Management</TabsTrigger>
                    <TabsTrigger value="disputes">Disputes & Litigation</TabsTrigger>
                </TabsList>

                <TabsContent value="contracts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tous les Contrats ({contracts.length})</CardTitle>
                            <CardDescription>Consultez et vérifiez la conformité des contrats de la plateforme</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="rounded-md border p-4">
                                {contracts.length === 0 ? "Aucun contrat trouve." : (
                                    <div className="space-y-2">
                                        {contracts.map(c => (
                                            <div key={c.id} className="flex justify-between items-center p-3 border-b last:border-0">
                                                <div>
                                                    <div className="font-medium">{c.title || c.contract_number}</div>
                                                    <div className="text-sm text-stone-500">
                                                        N: {c.contract_number} | Type: {c.type || 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => generateContractPDF(c, c.provider_signature_name || 'Prestataire', c.client_signature_name || 'Client')}
                                                    >
                                                        <Download className="w-3 h-3 mr-1" />
                                                        PDF
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="disputes">
                     <Card>
                        <CardHeader>
                            <CardTitle>Litiges ({disputes.length})</CardTitle>
                            <CardDescription>Examinez et arbitrez les litiges entre clients et prestataires</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {disputes.length === 0 ? "Aucun litige actif." : disputes.map(d => (
                                    <div key={d.id} className="flex justify-between items-center p-4 border rounded-lg bg-red-50/50">
                                        <div className="flex items-center gap-3">
                                            <Gavel className="w-5 h-5 text-red-500" />
                                            <div>
                                                <div className="font-semibold">Litige #{d.dispute_code || d.id.slice(0, 8)}</div>
                                                <div className="text-sm text-stone-600">
                                                    {d.nature?.replace(/_/g, ' ')} - Initie par: {d.initiator}
                                                </div>
                                                <div className="text-sm">
                                                    Statut: <span className="font-medium">{d.is_closed ? 'Cloture' : 'Ouvert'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => openDisputeCenter(d)}>
                                            <Gavel className="w-4 h-4 mr-2" />
                                            Examiner et Arbitrer
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {selectedDisputeBooking && (
                <DisputeManager
                    booking={selectedDisputeBooking}
                    currentUser={currentUser}
                    onClose={() => {
                        setSelectedDisputeBooking(null);
                        base44.entities.Dispute.list('-created_date').then(setDisputes);
                    }}
                />
            )}
        </div>
    );
}