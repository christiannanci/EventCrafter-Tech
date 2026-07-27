import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Target, Crown } from "lucide-react";

const EXCLUDED_STATUSES = ['cancelled', 'draft'];

export default function SalesDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBookings: 0,
        totalVolume: 0,
        totalVendors: 0,
        activeSubscriptions: 0,
        growthRate: 0,
        inactiveVendors: [],
        monthlyData: [],
        categoryData: [],
        leadsCount: 0,
        conversionRate: 0,
        freeVendorsCount: 0,
        premiumOpportunity: 0,
    });

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);
            try {
                const [bookings, vendors, services, leads] = await Promise.all([
                    base44.entities.Booking.list(),
                    base44.entities.VendorProfile.list(),
                    base44.entities.Service.list(),
                    base44.entities.Lead.list(),
                ]);

                // Mission 1 : Volume et bookings reels (on exclut annule/brouillon)
                const validBookings = bookings.filter(b => !EXCLUDED_STATUSES.includes(b.status));
                const totalVolume = validBookings.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);
                const totalBookings = validBookings.length;

                // Mission 1 : Taux de croissance reel (mois courant vs mois precedent)
                const now = new Date();
                const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

                const thisMonthVolume = validBookings
                    .filter(b => b.created_date && new Date(b.created_date) >= startOfThisMonth)
                    .reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);

                const lastMonthVolume = validBookings
                    .filter(b => b.created_date && new Date(b.created_date) >= startOfLastMonth && new Date(b.created_date) < startOfThisMonth)
                    .reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);

                const growthRate = lastMonthVolume > 0
                    ? ((thisMonthVolume - lastMonthVolume) / lastMonthVolume) * 100
                    : (thisMonthVolume > 0 ? 100 : 0);

                // Mission 2 : Portefeuille prestataires
                const activeSubscriptions = vendors.filter(v => v.subscription_status === 'active' && v.plan !== 'free').length;
                const freeVendorsCount = vendors.filter(v => v.plan === 'free' || !v.plan).length;

                // Prestataires inactifs : aucun booking recu dans les 60 derniers jours (ou jamais)
                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                const inactiveVendors = vendors.filter(v => {
                    const vendorBookings = validBookings.filter(b => b.planner_id === v.user_id);
                    if (vendorBookings.length === 0) return true;
                    const mostRecent = vendorBookings
                        .map(b => new Date(b.created_date || 0))
                        .sort((a, b) => b - a)[0];
                    return mostRecent < sixtyDaysAgo;
                }).slice(0, 10);

                // Mission 3 : Tendance mensuelle (6 derniers mois)
                const monthlyData = [];
                for (let i = 5; i >= 0; i--) {
                    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
                    const monthBookings = validBookings.filter(b => {
                        const d = new Date(b.created_date || 0);
                        return d >= monthStart && d < monthEnd;
                    });
                    const monthVolume = monthBookings.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);
                    monthlyData.push({
                        label: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
                        volume: monthVolume,
                        count: monthBookings.length
                    });
                }
                const maxMonthlyVolume = Math.max(...monthlyData.map(m => m.volume), 1);

                // Mission 3 : Categories les plus rentables
                const categoryMap = {};
                validBookings.forEach(b => {
                    const service = services.find(s => s.id === b.service_id);
                    const category = service?.category || 'Autre';
                    categoryMap[category] = (categoryMap[category] || 0) + (Number(b.total_amount) || 0);
                });
                const categoryData = Object.entries(categoryMap)
                    .map(([category, volume]) => ({ category, volume }))
                    .sort((a, b) => b.volume - a.volume)
                    .slice(0, 5);
                const maxCategoryVolume = Math.max(...categoryData.map(c => c.volume), 1);

                // Mission 4 : Conversion leads -> bookings
                const leadsCount = leads.length;
                const conversionRate = leadsCount > 0 ? (totalBookings / leadsCount) * 100 : 0;

                setStats({
                    totalBookings,
                    totalVolume,
                    totalVendors: vendors.length,
                    activeSubscriptions,
                    growthRate,
                    inactiveVendors,
                    monthlyData,
                    maxMonthlyVolume,
                    categoryData,
                    maxCategoryVolume,
                    leadsCount,
                    conversionRate,
                    freeVendorsCount,
                });
            } catch (e) {
                console.error("Erreur chargement Sales Dashboard:", e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 text-${color}-500`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
            </CardContent>
        </Card>
    );

    if (loading) {
        return <div className="p-10 text-center text-stone-500">Chargement des donnees commerciales...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Sales & Commercial Strategy</h2>

            {/* Mission 1 : Performances commerciales */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Volume Total (GMV)"
                    value={`${stats.totalVolume.toLocaleString()} FCFA`}
                    icon={DollarSign}
                    color="green"
                    subtitle={`${stats.totalBookings} reservations valides`}
                />
                <StatCard
                    title="Reservations Totales"
                    value={stats.totalBookings}
                    icon={BarChart3}
                    color="blue"
                />
                <StatCard
                    title="Prestataires Actifs"
                    value={stats.totalVendors}
                    icon={Users}
                    color="purple"
                    subtitle={`${stats.activeSubscriptions} abonnements payants`}
                />
                <StatCard
                    title="Croissance (vs mois dernier)"
                    value={`${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate.toFixed(1)}%`}
                    icon={stats.growthRate >= 0 ? TrendingUp : TrendingDown}
                    color={stats.growthRate >= 0 ? "emerald" : "red"}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Mission 3 : Tendance mensuelle */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Evolution Mensuelle (6 mois)
                        </CardTitle>
                        <CardDescription>Volume de reservations par mois (FCFA)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between gap-2 h-[180px] px-2">
                            {stats.monthlyData?.map((m, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                    <span className="text-[10px] text-stone-500">
                                        {m.volume > 0 ? `${Math.round(m.volume / 1000)}k` : '0'}
                                    </span>
                                    <div
                                        className="w-full bg-rose-500 rounded-t transition-all"
                                        style={{
                                            height: `${Math.max((m.volume / stats.maxMonthlyVolume) * 130, m.volume > 0 ? 4 : 0)}px`
                                        }}
                                    />
                                    <span className="text-xs text-stone-600 capitalize">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Mission 3 : Categories les plus rentables */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-4 h-4" /> Top Categories
                        </CardTitle>
                        <CardDescription>Categories de services les plus rentables</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {stats.categoryData?.length === 0 ? (
                            <p className="text-sm text-stone-400">Aucune donnee disponible.</p>
                        ) : stats.categoryData?.map((c, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-stone-700">{c.category}</span>
                                    <span className="font-medium">{c.volume.toLocaleString()} FCFA</span>
                                </div>
                                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${(c.volume / stats.maxCategoryVolume) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Mission 2 : Prestataires inactifs a relancer */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="w-4 h-4" /> Prestataires a Relancer
                        </CardTitle>
                        <CardDescription>Aucune reservation depuis plus de 60 jours</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.inactiveVendors?.length === 0 ? (
                            <p className="text-sm text-stone-400">Tous les prestataires sont actifs. Bon travail !</p>
                        ) : (
                            <div className="space-y-2">
                                {stats.inactiveVendors.map((v, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 bg-amber-50 rounded border border-amber-100">
                                        <span className="text-sm font-medium">{v.business_name || 'Sans nom'}</span>
                                        <Badge variant="outline" className="text-amber-700 border-amber-300">
                                            {v.plan || 'free'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Mission 4 : Strategie de croissance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-rose-700">
                            <Crown className="w-4 h-4" /> Opportunites de Croissance
                        </CardTitle>
                        <CardDescription>Leviers pour augmenter le GMV</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium">Conversion Leads -&gt; Reservations</p>
                                <p className="text-xs text-stone-500">{stats.leadsCount} leads generes</p>
                            </div>
                            <span className="text-lg font-bold text-rose-600">{stats.conversionRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium">Prestataires en Plan Gratuit</p>
                                <p className="text-xs text-stone-500">Potentiel d'upsell Premium/Gold</p>
                            </div>
                            <span className="text-lg font-bold text-amber-600">{stats.freeVendorsCount}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}