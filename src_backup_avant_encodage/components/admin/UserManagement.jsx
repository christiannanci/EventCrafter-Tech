import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Shield } from "lucide-react";
import StaffInviteDialog from './StaffInviteDialog';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Fetch all users - typically paginated, but for now list all or top 50
            const data = await base44.entities.User.list();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            // Determine system role and staff role based on selection
            let systemRole = 'user';
            let staffRole = 'none';

            if (newRole === 'admin_full') {
                systemRole = 'admin';
                staffRole = 'admin';
            } else if (newRole === 'legal') {
                systemRole = 'admin';
                staffRole = 'legal';
            } else if (newRole === 'sales') {
                systemRole = 'admin';
                staffRole = 'sales';
            } else if (newRole === 'tech') {
                systemRole = 'admin';
                staffRole = 'tech';
            }

            // Update system role first
            const roleResponse = await base44.functions.invoke('updateUserRole', { userId, role: systemRole });
            if (!roleResponse.data.success) {
                throw new Error('Failed to update system role');
            }

            // Update staff role
            const staffResponse = await base44.functions.invoke('updateUserStaffRole', { userId, staffRole });
            if (!staffResponse.data.success) {
                throw new Error('Failed to update staff role');
            }

            setUsers(users.map(u => u.id === userId ? { ...u, role: systemRole, staff_role: staffRole } : u));
            toast.success("Rôle mis à jour avec succès");
        } catch (error) {
            console.error("Failed to update role", error);
            toast.error("Erreur lors de la mise à jour du rôle");
        }
    };

    const roleColors = {
        admin_full: "bg-red-100 text-red-800",
        legal: "bg-blue-100 text-blue-800",
        sales: "bg-green-100 text-green-800",
        tech: "bg-purple-100 text-purple-800",
        none: "bg-stone-100 text-stone-800"
    };

    const getRoleValue = (user) => {
        if (user.role === 'admin' && user.staff_role === 'admin') return 'admin_full';
        if (user.staff_role === 'legal') return 'legal';
        if (user.staff_role === 'sales') return 'sales';
        if (user.staff_role === 'tech') return 'tech';
        return 'none';
    };

    const getRoleLabel = (value) => {
        const labels = {
            admin_full: '👑 Admin Complet',
            legal: '⚖️ Juriste',
            sales: '💼 Commercial',
            tech: '🔧 Technicien',
            none: '👤 Aucun rôle'
        };
        return labels[value] || labels.none;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Gestion des Rôles Staff
                        </CardTitle>
                        <CardDescription>Gérez les membres de l'équipe back office et leurs responsabilités.</CardDescription>
                    </div>
                    <StaffInviteDialog onSuccess={fetchUsers} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle Back Office</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => {
                                const currentRole = getRoleValue(u);
                                return (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.full_name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <Badge className={roleColors[currentRole]}>
                                                {getRoleLabel(currentRole)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Select 
                                                value={currentRole} 
                                                onValueChange={(val) => handleRoleUpdate(u.id, val)}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">👤 Aucun rôle</SelectItem>
                                                    <SelectItem value="admin_full">👑 Admin Complet</SelectItem>
                                                    <SelectItem value="legal">⚖️ Juriste</SelectItem>
                                                    <SelectItem value="sales">💼 Commercial</SelectItem>
                                                    <SelectItem value="tech">🔧 Technicien</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}