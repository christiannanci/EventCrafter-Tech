import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Vérifier que l'utilisateur est admin
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { userId, role } = await req.json();

        if (!userId || !role) {
            return Response.json({ error: 'Missing userId or role' }, { status: 400 });
        }

        // Récupérer l'utilisateur pour obtenir son email
        const targetUser = await base44.asServiceRole.entities.User.get(userId);
        
        if (!targetUser) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Réinviter l'utilisateur avec le nouveau rôle
        // Cette méthode met à jour le rôle de l'utilisateur existant
        await base44.users.inviteUser(targetUser.email, role);

        return Response.json({ 
            success: true,
            message: 'System role updated successfully'
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        return Response.json({ 
            error: error.message || 'Failed to update user role' 
        }, { status: 500 });
    }
});