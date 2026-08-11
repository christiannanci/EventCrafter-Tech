import React, { useState, useEffect } from 'react';
import { base44, supabase } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Shield, Trash2, Loader2 } from "lucide-react";
import StaffInviteDialog from './StaffInviteDialog';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
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

            const { error: updateError } = await supabase
                .from('app_user')
                .update({ role: systemRole, staff_role: staffRole })
                .eq('id', userId);

            if (updateError) throw updateError;

            setUsers(users.map(u => u.id === userId ? { ...u, role: systemRole, staff_role: staffRole } : u));
            toast.success("Role mis a jour avec succes");
        } catch (error) {
            console.error("Failed to update role", error);
            toast.error("Erreur lors de la mise a jour du role");
        }
    };

    // Supprime les services et les profils (vendeur/client) d'un compte. Le compte
    // de connexion Supabase Auth lui-meme n'est PAS supprime (necessite une cle
    // service_role non exposee cote client) - il reste mais vide, sans donnees utilisables.
    const handleDeleteAccount = async (user) => {
        const confirmed = confirm(
            `Etes-vous sur de vouloir supprimer definitivement le compte de "${user.full_name || user.email}" et toutes ses offres de service associees ?\n\nCette action est irreversible. Le compte de connexion restera techniquement present mais sera vide et inutilisable.`
        );
        if (!confirmed) return;

        setDeletingId(user.id);
        try {
            const allServices = await base44.entities.Service.list();
            const userServices = allServices.filter(s => s.planner_id === user.id || s.created_by === user.id);
            for (const service of userServices) {
                await base44.entities.Service.delete(service.id);
            }

            const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: user.id });
            for (const vp of vendorProfiles) {
                await base44.entities.VendorProfile.delete(vp.id);
            }

            const clientProfiles = await base44.entities.ClientProfile.filter({ user_id: user.id });
            for (const cp of clientProfiles) {
                await base44.entities.ClientProfile.delete(cp.id);
            }

            toast.success(`Compte supprime : ${userServices.length} service(s), ${vendorProfiles.length} profil(s) vendeur et ${clientProfiles.length} profil(s) client retires.`);
            fetchUsers();
        } catch (error) {
            console.error("Failed to delete account", error);
            toast.error("Erreur lors de la suppression du compte. Certaines donnees ont peut-etre ete partiellement supprimees.");
            fetchUsers();
        } finally {
            setDeletingId(null);
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
            admin_full: '\uD83D\uDC51 Admin Complet',
            legal: '\u2696\uFE0F Juriste',
            sales: '\uD83D\uDCBC Commercial',
            tech: '\uD83D\uDD27 Technicien',
            none: '\uD83D\uDC64 Aucun role'
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
                            Gestion des Roles Staff
                        </CardTitle>
                        <CardDescription>Gerez les membres de l'equipe back office et leurs responsabilites.</CardDescription>
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
                                <TableHead>Role Back Office</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Supprimer</TableHead>
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
                                                    <SelectItem value="none">{'\uD83D\uDC64'} Aucun role</SelectItem>
                                                    <SelectItem value="admin_full">{'\uD83D\uDC51'} Admin Complet</SelectItem>
                                                    <SelectItem value="legal">{'\u2696\uFE0F'} Juriste</SelectItem>
                                                    <SelectItem value="sales">{'\uD83D\uDCBC'} Commercial</SelectItem>
                                                    <SelectItem value="tech">{'\uD83D\uDD27'} Technicien</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-300 text-red-600 hover:bg-red-50"
                                                disabled={deletingId === u.id}
                                                onClick={() => handleDeleteAccount(u)}
                                            >
                                                {deletingId === u.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </Button>
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
