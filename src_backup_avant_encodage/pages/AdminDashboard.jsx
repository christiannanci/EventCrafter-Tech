import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Briefcase, Gavel, Wrench, Users, LogOut, DollarSign, Eye, AlertTriangle } from "lucide-react";
import { useNavigate } from 'react-router-dom';

// Import Role Views
import UserManagement from "@/components/admin/UserManagement";
import LegalDashboard from "@/components/admin/LegalDashboard";
import SalesDashboard from "@/components/admin/SalesDashboard";
import TechDashboard from "@/components/admin/TechDashboard";
import AdminPayouts from "@/pages/AdminPayouts";
import VerificationRequests from "@/components/admin/VerificationRequests";
import PaymentProofValidation from "@/components/admin/PaymentProofValidation";
import ReviewModeration from "@/components/admin/ReviewModeration";
import RankingDashboard from "@/components/admin/RankingDashboard";
import LeadManagement from "@/components/admin/LeadManagement";
import ContractMonitoring from "@/components/admin/ContractMonitoring";
import DisputeManagement from "@/components/admin/DisputeManagement";

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [simulatedRole, setSimulatedRole] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const currentUser = await base44.auth.me();
                console.log('Current user in AdminDashboard:', currentUser);
                console.log('Staff role:', currentUser?.staff_role);
                
                // Autoriser l'accès si l'utilisateur est admin OU a un staff_role spécifique
                const hasStaffRole = currentUser.staff_role && 
                                     currentUser.staff_role !== 'none' && 
                                     ['admin', 'legal', 'sales', 'tech'].includes(currentUser.staff_role);
                
                if (!currentUser || (currentUser.role !== 'admin' && !hasStaffRole)) {
                    console.log('Access denied - redirecting to home');
                    window.location.href = '/'; 
                    return;
                }
                setUser(currentUser);
            } catch (e) {
                console.error('Auth error:', e);
                window.location.href = '/';
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    if (loading) return null;
    if (!user) return null;

    // Si l'utilisateur a un staff_role défini (et != 'none'), utiliser ce rôle
    // Sinon, utiliser 'admin' si c'est un admin système
    const realRole = (user.staff_role && user.staff_role !== 'none') ? user.staff_role : (user.role === 'admin' ? 'admin' : 'user');
    const activeRole = simulatedRole || realRole;
    
    const isRealAdmin = user.role === 'admin' && (!user.staff_role || user.staff_role === 'none');
    const isSuperAdmin = activeRole === 'admin';
    const hasAccess = (r) => isSuperAdmin || activeRole === r;

    // Define default tab based on active role
    let defaultTab = "overview";
    if (activeRole === 'legal') defaultTab = "legal";
    if (activeRole === 'sales') defaultTab = "sales";
    if (activeRole === 'tech') defaultTab = "tech";

    return (
        <div className="min-h-screen bg-stone-100">
            <Tabs key={activeRole} defaultValue={defaultTab} className="flex min-h-screen">
                {/* Sidebar */}
                <div className="w-64 bg-stone-900 text-white flex flex-col fixed h-full z-10 shadow-xl">
                    <div className="p-6 border-b border-stone-800 bg-stone-950">
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-6 h-6 text-rose-500" />
                            <span className="font-bold text-lg">Admin Panel</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500 font-mono uppercase tracking-wider">
                            {activeRole} View
                            {simulatedRole && <span className="text-rose-500">(Simulated)</span>}
                        </div>

                        {/* Role Simulator for Real Admins */}
                        {isRealAdmin && (
                            <div className="mt-4 pt-4 border-t border-stone-800">
                                <label className="text-[10px] text-stone-400 mb-1 flex items-center gap-1">
                                    <Eye className="w-3 h-3" /> Simulate Role
                                </label>
                                <Select value={simulatedRole || "admin"} onValueChange={(val) => setSimulatedRole(val === 'admin' ? null : val)}>
                                    <SelectTrigger className="h-8 text-xs bg-stone-800 border-stone-700 text-stone-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin (Default)</SelectItem>
                                        <SelectItem value="legal">Juriste</SelectItem>
                                        <SelectItem value="sales">Commercial</SelectItem>
                                        <SelectItem value="tech">Technicien</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 py-6 px-3">
                        <TabsList className="flex flex-col h-auto w-full bg-transparent gap-1 items-stretch p-0">
                            {isSuperAdmin && (
                                <TabsTrigger value="overview" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <Shield className="w-4 h-4 mr-3" /> Overview
                                </TabsTrigger>
                            )}
                            
                            {(hasAccess('legal')) && (
                                <TabsTrigger value="legal" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <Gavel className="w-4 h-4 mr-3" /> Legal / Juriste
                                </TabsTrigger>
                            )}

                            {(hasAccess('sales')) && (
                                <TabsTrigger value="sales" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <Briefcase className="w-4 h-4 mr-3" /> Sales / Commercial
                                </TabsTrigger>
                            )}

                            {(hasAccess('tech')) && (
                                <TabsTrigger value="tech" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <Wrench className="w-4 h-4 mr-3" /> Technical / Maint.
                                </TabsTrigger>
                            )}

                             {isSuperAdmin && (
                                <TabsTrigger value="users" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <Users className="w-4 h-4 mr-3" /> User Roles
                                </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                               <TabsTrigger value="verifications" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                   <Shield className="w-4 h-4 mr-3" /> Vérifications
                               </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                               <TabsTrigger value="payment_proofs" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                   <Shield className="w-4 h-4 mr-3" /> Preuves Paiement
                               </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                               <TabsTrigger value="payouts" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                   <DollarSign className="w-4 h-4 mr-3" /> Payouts
                               </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                               <TabsTrigger value="reviews" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                   <Shield className="w-4 h-4 mr-3" /> Modération Avis
                               </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                               <TabsTrigger value="ranking" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                   <Shield className="w-4 h-4 mr-3" /> Système Ranking
                               </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                                <TabsTrigger value="disputes" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <AlertTriangle className="w-4 h-4 mr-3" /> Litiges en Cours
                                </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                                <TabsTrigger value="contracts" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <DollarSign className="w-4 h-4 mr-3" /> Tour de Contrôle
                                </TabsTrigger>
                            )}

                            {isSuperAdmin && (
                                <TabsTrigger value="leads" className="justify-start px-4 py-3 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-stone-400 hover:text-white hover:bg-stone-800 transition-all rounded-md">
                                    <Briefcase className="w-4 h-4 mr-3" /> Gestion Leads
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    <div className="p-4 bg-stone-950">
                        <Button variant="ghost" className="w-full justify-start text-stone-400 hover:text-white hover:bg-stone-900" onClick={() => window.location.href = '/'}>
                            <LogOut className="w-4 h-4 mr-2" /> Return to App
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 ml-64 p-10 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        <TabsContent value="overview" className="mt-0">
                            <h2 className="text-3xl font-bold mb-6">System Overview</h2>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                <Card>
                                    <CardHeader><CardTitle>Platform Health</CardTitle></CardHeader>
                                    <CardContent className="text-emerald-600 font-bold">Operational</CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>User Role</CardTitle></CardHeader>
                                    <CardContent className="capitalize">{activeRole}</CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="legal" className="mt-0">
                            <LegalDashboard />
                        </TabsContent>

                        <TabsContent value="sales" className="mt-0">
                            <SalesDashboard />
                        </TabsContent>

                        <TabsContent value="tech" className="mt-0">
                            <TechDashboard />
                        </TabsContent>

                        <TabsContent value="users" className="mt-0">
                            <UserManagement />
                        </TabsContent>

                        <TabsContent value="verifications" className="mt-0">
                            <VerificationRequests />
                        </TabsContent>

                        <TabsContent value="payment_proofs" className="mt-0">
                            <PaymentProofValidation />
                        </TabsContent>

                        <TabsContent value="payouts" className="mt-0">
                            <AdminPayouts />
                        </TabsContent>

                        <TabsContent value="reviews" className="mt-0">
                            <ReviewModeration />
                        </TabsContent>

                        <TabsContent value="ranking" className="mt-0">
                            <RankingDashboard />
                        </TabsContent>

                        <TabsContent value="disputes" className="mt-0">
                            <DisputeManagement />
                        </TabsContent>

                        <TabsContent value="contracts" className="mt-0">
                            <ContractMonitoring />
                        </TabsContent>

                        <TabsContent value="leads" className="mt-0">
                            <LeadManagement />
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}