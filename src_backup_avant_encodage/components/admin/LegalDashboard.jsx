import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Gavel, CheckCircle } from "lucide-react";
import DisputeManager from "@/components/dashboard/DisputeManager";

export default function LegalDashboard() {
    const [contracts, setContracts] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [selectedDispute, setSelectedDispute] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            const [c, d] = await Promise.all([
                base44.entities.Contract.list(),
                base44.entities.Dispute.list()
            ]);
            setContracts(c);
            setDisputes(d);
        };
        loadData();
    }, []);

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
                            <CardTitle>All Contracts</CardTitle>
                            <CardDescription>Review and manage platform contracts</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="rounded-md border p-4">
                                {contracts.length === 0 ? "No contracts found." : (
                                    <div className="space-y-2">
                                        {contracts.map(c => (
                                            <div key={c.id} className="flex justify-between items-center p-3 border-b last:border-0">
                                                <div>
                                                    <div className="font-medium">{c.contract_number}</div>
                                                    <div className="text-sm text-stone-500">Status: {c.status} | Type: {c.type}</div>
                                                </div>
                                                <Badge variant={c.status === 'signed' ? 'success' : 'outline'}>{c.status}</Badge>
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
                            <CardTitle>Disputes</CardTitle>
                            <CardDescription>Resolve booking disputes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {disputes.length === 0 ? "No active disputes." : disputes.map(d => (
                                    <div key={d.id} className="flex justify-between items-center p-4 border rounded-lg bg-red-50/50">
                                        <div className="flex items-center gap-3">
                                            <Gavel className="w-5 h-5 text-red-500" />
                                            <div>
                                                <div className="font-semibold">Dispute #{d.dispute_code || d.id.slice(0,8)}</div>
                                                <div className="text-sm">Status: <span className="font-medium">{d.status}</span></div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => setSelectedDispute(d)}>View Details</Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Reuse existing dispute manager for details if needed, or build custom admin view */}
                    {selectedDispute && (
                         <div className="mt-4 p-4 border rounded-lg">
                             <h3 className="font-bold mb-2">Dispute Details</h3>
                             <p>Reason: {selectedDispute.reason}</p>
                             <p>Amount in question: {selectedDispute.amount_disputed}</p>
                             {/* Integration for resolving would go here */}
                             <Button onClick={() => setSelectedDispute(null)} variant="ghost" className="mt-2">Close</Button>
                         </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}