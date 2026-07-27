import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Vérifier que l'utilisateur est admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { userId, staffRole } = await req.json();

        if (!userId || staffRole === undefined) {
            return Response.json({ error: 'userId and staffRole are required' }, { status: 400 });
        }

        // Mettre à jour le staff_role de l'utilisateur
        await base44.asServiceRole.entities.User.update(userId, { staff_role: staffRole });

        return Response.json({ 
            success: true, 
            message: 'Staff role updated successfully' 
        });
    } catch (error) {
        console.error('Error updating staff role:', error);
        return Response.json({ 
            error: error.message || 'Failed to update staff role' 
        }, { status: 500 });
    }
});