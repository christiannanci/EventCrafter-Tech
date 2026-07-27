import React, { useState, useEffect } from "react";
import { base44, supabase } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Briefcase, Gavel, Wrench, Users, LogOut, DollarSign, Eye, AlertTriangle, Menu, ChevronDown } from "lucide-react";

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
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    window.location.href = '/Login';
                    return;
                }

                const { data: appUser, error: appUserError } = await supabase
                    .from('app_user')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (appUserError || !appUser) {
                    window.location.href = '/';
                    return;
                }

                const hasStaffRole = appUser.staff_role &&
                                     appUser.staff_role !== 'none' &&
                                     ['admin', 'legal', 'sales', 'tech'].includes(appUser.staff_role);

                if (appUser.role !== 'admin' && !hasStaffRole) {
                    window.location.href = '/';
                    return;
                }
                setUser({ ...session.user, ...appUser });
            } catch (e) {
                console.error('Auth error:', e);
                window.location.href = '/';
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const realRole = user ? ((user.staff_role && user.staff_role !== 'none') ? user.staff_role : (user.role === 'admin' ? 'admin' : 'user')) : 'user';
    const activeRole = simulatedRole || realRole;
    const isRealAdmin = user ? (user.role === 'admin' && (!user.staff_role || user.staff_role === 'none')) : false;
    const isSuperAdmin = activeRole === 'admin';

    // Onglet assigne pour chaque role staff (un staff non-admin n'a droit qu'a celui-la)
    const assignedTab = {
        legal: 'legal',
        sales: 'sales',
        tech: 'tech',
    }[activeRole] || 'overview';

    // Redirection forcee : un staff non-admin ne peut jamais quitter son onglet assigne
    useEffect(() => {
        if (!user) return;
        if (!isSuperAdmin) {
            setActiveTab(assignedTab);
        } else {
            setActiveTab('overview');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRole, user]);

    const handleTabChange = (val) => {
        if (isSuperAdmin) {
            setActiveTab(val);
            return;
        }
        // Un staff non-admin ne peut naviguer que vers les onglets qui lui sont accessibles
        const isAllowed = menuItems.some(item => item.value === val);
        if (!isAllowed) return;
        setActiveTab(val);
    };

    if (loading) return null;
    if (!user) return null;

    const hasAccess = (r) => isSuperAdmin || activeRole === r;

    const menuItems = [
        { value: "overview", label: "Overview", icon: Shield, show: isSuperAdmin },
        { value: "legal", label: "Legal / Juriste", icon: Gavel, show: hasAccess('legal') },
        { value: "sales", label: "Sales / Commercial", icon: Briefcase, show: hasAccess('sales') },
        { value: "tech", label: "Technical / Maint.", icon: Wrench, show: hasAccess('tech') },
        { value: "users", label: "User Roles", icon: Users, show: isSuperAdmin },
        { value: "verifications", label: "Vérifications", icon: Shield, show: isSuperAdmin },
        { value: "payment_proofs", label: "Preuves Paiement", icon: Shield, show: isSuperAdmin },
        { value: "payouts", label: "Payouts", icon: DollarSign, show: isSuperAdmin },
        { value: "reviews", label: "Modération Avis", icon: Shield, show: isSuperAdmin },
        { value: "ranking", label: "Système Ranking", icon: Shield, show: isSuperAdmin },
        { value: "disputes", label: "Litiges en Cours", icon: AlertTriangle, show: hasAccess('legal') },
        { value: "contracts", label: "Tour de Contrôle", icon: DollarSign, show: isSuperAdmin },
        { value: "leads", label: "Gestion Leads", icon: Briefcase, show: hasAccess('sales') },
    ].filter(item => item.show);

    const currentMenuItem = menuItems.find(item => item.value === activeTab) || menuItems[0];

    const brandLabel = isSuperAdmin ? "Admin Panel" : {
        legal: "Espace Juriste",
        sales: "Espace Commercial",
        tech: "Espace Technique",
    }[activeRole] || "Espace Staff";

    return (
        <div className="min-h-screen bg-stone-100">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="bg-stone-900 text-white shadow-xl sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="w-6 h-6 text-rose-500" />
                                <span className="font-bold text-lg">{brandLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-stone-500 font-mono uppercase tracking-wider">
                                {activeRole} View
                                {simulatedRole && <span className="text-rose-500">(Simulated)</span>}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {isRealAdmin && (
                                <Select value={simulatedRole || "admin"} onValueChange={(val) => setSimulatedRole(val === 'admin' ? null : val)}>
                                    <SelectTrigger className="h-9 text-xs bg-stone-800 border-stone-700 text-stone-200 w-full sm:w-44">
                                        <div className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" />
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin (Default)</SelectItem>
                                        <SelectItem value="legal">Juriste</SelectItem>
                                        <SelectItem value="sales">Commercial</SelectItem>
                                        <SelectItem value="tech">Technicien</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {menuItems.length > 1 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="bg-stone-800 border-stone-700 text-stone-100 hover:bg-stone-700 hover:text-white justify-between w-full sm:w-56">
                                            <span className="flex items-center gap-2">
                                                <Menu className="w-4 h-4" />
                                                {currentMenuItem && <currentMenuItem.icon className="w-4 h-4" />}
                                                {currentMenuItem?.label || "Menu"}
                                            </span>
                                            <ChevronDown className="w-4 h-4 opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
                                        {menuItems.map((item) => (
                                            <DropdownMenuItem
                                                key={item.value}
                                                onClick={() => handleTabChange(item.value)}
                                                className={activeTab === item.value ? "bg-rose-50 text-rose-700" : ""}
                                            >
                                                <item.icon className="w-4 h-4 mr-2" />
                                                {item.label}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            <Button
                                variant="ghost"
                                className="text-stone-300 hover:text-white hover:bg-stone-800 justify-start sm:justify-center"
                                onClick={() => window.location.href = '/'}
                            >
                                <LogOut className="w-4 h-4 mr-2" /> Return to App
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 sm:p-10">
                    <div className="max-w-7xl mx-auto">
                        {isSuperAdmin && (
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
                        )}

                        {hasAccess('legal') && (
                            <TabsContent value="legal" className="mt-0">
                                <LegalDashboard />
                            </TabsContent>
                        )}

                        {hasAccess('sales') && (
                            <TabsContent value="sales" className="mt-0">
                                <SalesDashboard />
                            </TabsContent>
                        )}

                        {hasAccess('tech') && (
                            <TabsContent value="tech" className="mt-0">
                                <TechDashboard />
                            </TabsContent>
                        )}

                        {isSuperAdmin && (
                            <>
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
                                <TabsContent value="contracts" className="mt-0">
                                    <ContractMonitoring />
                                </TabsContent>
                            </>
                        )}

                        {hasAccess('legal') && (
                            <TabsContent value="disputes" className="mt-0">
                                <DisputeManagement />
                            </TabsContent>
                        )}

                        {hasAccess('sales') && (
                            <TabsContent value="leads" className="mt-0">
                                <LeadManagement />
                            </TabsContent>
                        )}
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
