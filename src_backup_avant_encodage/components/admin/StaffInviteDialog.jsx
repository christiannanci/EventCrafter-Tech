import React, { useState } from 'react';
import { base44 } from '@/api/apiClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';

export default function StaffInviteDialog({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [staffRole, setStaffRole] = useState('none');

  const handleInvite = async () => {
    if (!email || !staffRole || staffRole === 'none') {
      toast.error("Veuillez renseigner l'email et le rôle");
      return;
    }

    setLoading(true);
    try {
      // Invite user with admin role (so they can access back office)
      await base44.users.inviteUser(email, 'admin');
      
      // Wait a bit for user creation, then update staff_role
      setTimeout(async () => {
        try {
          const users = await base44.entities.User.filter({ email });
          if (users.length > 0) {
            const response = await base44.functions.invoke('updateUserStaffRole', { 
              userId: users[0].id, 
              staffRole: staffRole 
            });
            if (response.data.success) {
              const roleLabels = {
                admin: 'Admin Complet',
                legal: 'Juriste',
                sales: 'Commercial',
                tech: 'Technicien'
              };
              toast.success(`Invitation envoyée à ${email} - Rôle: ${roleLabels[staffRole]}`);
              setOpen(false);
              setEmail('');
              setStaffRole('none');
              if (onSuccess) onSuccess();
            } else {
              throw new Error(response.data.error || 'Update failed');
            }
          }
        } catch (err) {
          console.error('Error updating staff role:', err);
          toast.error("Erreur lors de l'attribution du rôle");
        } finally {
          setLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Invitation error:', error);
      toast.error("Erreur lors de l'invitation");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Inviter un membre du staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un nouveau membre du staff</DialogTitle>
          <DialogDescription>
            L'utilisateur recevra une invitation par email et pourra accéder directement à son panneau back office.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email de l'utilisateur</Label>
            <Input
              type="email"
              placeholder="utilisateur@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Rôle dans le back office</Label>
            <Select value={staffRole} onValueChange={setStaffRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>-- Choisir --</SelectItem>
                <SelectItem value="admin">👑 Admin (Accès complet)</SelectItem>
                <SelectItem value="legal">⚖️ Juriste (Légal)</SelectItem>
                <SelectItem value="sales">💼 Commercial (Ventes)</SelectItem>
                <SelectItem value="tech">🔧 Technicien (Technique)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            ℹ️ L'utilisateur aura accès au back office avec les permissions de son rôle.
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Envoyer l'invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}