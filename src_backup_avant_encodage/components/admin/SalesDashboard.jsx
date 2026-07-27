import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";

export default function SalesDashboard() {
    const [stats, setStats] = useState({
        totalBookings: 0,
        totalVolume: 0,
        activeSubscriptions: 0,
        totalVendors: 0
    });

    useEffect(() => {
        const loadStats = async () => {
            // In a real app, these would be aggregated queries
            const bookings = await base44.entities.Booking.list();
            const vendors = await base44.entities.VendorProfile.list();
            
            const volume = bookings.reduce((acc, b) => acc + (b.total_amount || 0), 0);
            
            setStats({
                totalBookings: bookings.length,
                totalVolume: volume,
                activeSubscriptions: vendors.filter(v => v.subscription_status === 'active').length,
                totalVendors: vendors.length
            });
        };
        loadStats();
    }, []);

    const StatCard = ({ title, value, icon: Icon, color }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 text-${color}-500`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Sales & Commercial Strategy</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Volume" value={`$${stats.totalVolume.toLocaleString()}`} icon={DollarSign} color="green" />
                <StatCard title="Total Bookings" value={stats.totalBookings} icon={BarChart3} color="blue" />
                <StatCard title="Active Vendors" value={stats.activeSubscriptions} icon={Users} color="purple" />
                <StatCard title="Growth Rate" value="+12.5%" icon={TrendingUp} color="emerald" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                 <Card className="col-span-2">
                     <CardHeader>
                         <CardTitle>Sales Strategy Overview</CardTitle>
                         <CardDescription>Monthly performance analysis</CardDescription>
                     </CardHeader>
                     <CardContent className="h-[200px] flex items-center justify-center text-stone-400 border-2 border-dashed rounded-lg">
                         Chart Integration Placeholder
                     </CardContent>
                 </Card>
            </div>
        </div>
    );
}