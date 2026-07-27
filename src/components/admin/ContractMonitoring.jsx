import React, { useState } from 'react';
import { InvokeLLM, SendEmail, UploadFile, SendSMS, GenerateImage, ExtractDataFromUploadedFile } from '@/api/integrations';
import { base44 } from "@/api/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  FileText,
  Calendar,
  Users,
  Eye,
  XCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ContractMonitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContract, setSelectedContract] = useState(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  // Charger les donnees
  const { data: invoices = [] } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => base44.entities.Invoice.list('-issued_date', 1000)
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 1000)
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['admin-contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date', 1000)
  });

  const { data: vendors = {} } = useQuery({
    queryKey: ['admin-vendors-map'],
    queryFn: async () => {
      const allVendors = await base44.entities.VendorProfile.list('-created_date', 500);
      const map = {};
      allVendors.forEach(v => map[v.user_id] = v);
      return map;
    }
  });

  // Calculs de tresorerie
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalPending = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaid = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalCommission = paidInvoices.reduce((sum, i) => sum + (i.commission_amount || 0), 0);

  // Alertes d'inactivite (> 48h en awaiting_payment)
  const now = new Date();
  const inactiveBookings = bookings.filter(b => {
    if (b.status !== 'awaiting_payment') return false;
    const hoursSinceUpdate = (now - new Date(b.updated_date)) / (1000 * 60 * 60);
    return hoursSinceUpdate > 48;
  });

  // Services termines aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = bookings.filter(b => {
    if (b.status !== 'completed') return false;
    const completedDate = new Date(b.updated_date);
    completedDate.setHours(0, 0, 0, 0);
    return completedDate.getTime() === today.getTime();
  });

  // GMV (Gross Merchandise Value)
  const activeGMV = bookings
    .filter(b => ['in_progress', 'awaiting_payment'].includes(b.status))
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Mutation pour cloturer manuellement
  const closeManuallyMutation = useMutation({
    mutationFn: async ({ bookingId, reason }) => {
      // Mettre a jour le statut
      await base44.entities.Booking.update(bookingId, {
        status: 'completed',
        payment_status: 'fully_paid'
      });

      // Liberer les fonds
      const transactions = await base44.entities.Transaction.filter({ booking_id: bookingId });
      const escrowTx = transactions.find(t => t.status === 'escrow_held');
      
      if (escrowTx) {
        await base44.entities.Transaction.update(escrowTx.id, {
          status: 'released',
          description: escrowTx.description + ` (Admin closure: ${reason})`
        });
      }

      // Notification au vendeur
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await base44.entities.Notification.create({
          user_id: booking.planner_id,
          title: '? Service Cloture par Admin',
          message: `Votre service a ete marque comme termine par l'administration. Raison: ${reason}`,
          type: 'admin_action',
          link: '/VendorDashboard?tab=dossiers',
          is_read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-bookings']);
      toast({ title: 'Service cloture', description: 'Le dossier a ete marque comme termine' });
      setShowCloseDialog(false);
      setSelectedContract(null);
      setCloseReason('');
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (bookingId) => {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const allUsers = await base44.entities.User.list();
      const clientUser = allUsers.find(u => u.email === booking.created_by);
      
      if (clientUser) {
        await base44.entities.Notification.create({
          user_id: clientUser.id,
          title: '? Rappel de Paiement',
          message: `Votre paiement est en attente depuis plus de 48h. Veuillez proceder au paiement pour confirmer votre reservation.`,
          type: 'payment_reminder',
          link: '/ClientDashboard',
          is_read: false
        });

        await SendEmail({
          from_name: 'EventCrafter',
          to: clientUser.email,
          subject: 'Rappel - Paiement en attente',
          body: `
            <html>
              <body style="font-family: Arial, sans-serif;">
                <h2>Bonjour,</h2>
                <p>Votre reservation est en attente de paiement depuis plus de 48 heures.</p>
                <p>Merci de finaliser votre paiement pour securiser votre evenement.</p>
                <p><a href="${window.location.origin}/ClientDashboard" style="background: #FF6B35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir ma reservation</a></p>
              </body>
            </html>
          `
        });
      }
    },
    onSuccess: () => {
      toast({ title: 'Rappel envoye', description: 'Le client a ete notifie' });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          Centre de Surveillance - Tour de Controle
        </h2>
        <p className="text-stone-500 mt-1">Vue d'ensemble des contrats actifs et flux de tresorerie</p>
      </div>

      {/* Metriques Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Factures En Attente</p>
                <p className="text-2xl font-bold text-orange-600">{totalPending.toLocaleString()} FCFA</p>
                <p className="text-xs text-stone-500 mt-1">{pendingInvoices.length} facture(s)</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Factures Payees</p>
                <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} FCFA</p>
                <p className="text-xs text-stone-500 mt-1">{paidInvoices.length} facture(s)</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">GMV Actif</p>
                <p className="text-2xl font-bold text-indigo-600">{activeGMV.toLocaleString()} FCFA</p>
                <p className="text-xs text-stone-500 mt-1">En cours</p>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Commission Generee</p>
                <p className="text-2xl font-bold text-purple-600">{totalCommission.toLocaleString()} FCFA</p>
                <p className="text-xs text-stone-500 mt-1">5% sur payes</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes d'Inactivite */}
      {inactiveBookings.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Alertes d'Inactivite - Contrats en Attente &gt; 48h
            </CardTitle>
            <CardDescription>Ces contrats necessitent un rappel ou une intervention</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {inactiveBookings.map((booking) => {
                const vendor = vendors[booking.planner_id];
                const hoursSince = Math.floor((now - new Date(booking.updated_date)) / (1000 * 60 * 60));

                return (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200">
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900">
                        {booking.client_name || 'Client'} ? {vendor?.business_name || 'Vendeur'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-stone-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {hoursSince}h d'inactivite
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {booking.total_amount?.toLocaleString()} FCFA
                        </span>
                        {booking.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.event_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/Chat?userId=${booking.planner_id}`, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => sendReminderMutation.mutate(booking.id)}
                        disabled={sendReminderMutation.isPending}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Rappeler Client
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Termines Aujourd'hui */}
      <Card className="border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Services Termines Aujourd'hui
          </CardTitle>
          <CardDescription>Rapport de fin de service et commissions generees</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {completedToday.length > 0 ? (
            <div className="space-y-3">
              {completedToday.map((booking) => {
                const vendor = vendors[booking.planner_id];
                const commission = (booking.total_amount || 0) * 0.05;
                const invoice = invoices.find(i => i.booking_id === booking.id);

                return (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200">
                    <div className="flex-1">
                      <p className="font-semibold text-stone-900">
                        {booking.event_type || 'evenement'} de {booking.client_name || 'Client'}
                      </p>
                      <p className="text-sm text-stone-600 mt-1">
                        Termine par {vendor?.business_name || 'Vendeur'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                        <span>Facture: {invoice?.invoice_number || 'N/A'}</span>
                        <span>Montant: {booking.total_amount?.toLocaleString()} FCFA</span>
                        <Badge className="bg-green-600">Commission: {commission.toLocaleString()} FCFA</Badge>
                      </div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                );
              })}
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-semibold text-stone-700">
                  Total Commission Aujourd'hui: {' '}
                  <span className="text-green-600">
                    {completedToday.reduce((sum, b) => sum + ((b.total_amount || 0) * 0.05), 0).toLocaleString()} FCFA
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-stone-500">
              Aucun service termine aujourd'hui
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services en cours necessitant surveillance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Services En Cours d'Execution
          </CardTitle>
          <CardDescription>Contrats actifs a surveiller</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bookings
              .filter(b => b.status === 'in_progress')
              .slice(0, 10)
              .map((booking) => {
                const vendor = vendors[booking.planner_id];
                const daysUntilEvent = booking.event_date
                  ? Math.ceil((new Date(booking.event_date) - new Date()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">
                        {booking.client_name || 'Client'} ? {vendor?.business_name || 'Vendeur'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-stone-600">
                        <span>{booking.total_amount?.toLocaleString()} FCFA</span>
                        {daysUntilEvent !== null && (
                          <Badge variant="outline" className={daysUntilEvent <= 3 ? 'border-red-400 text-red-700' : ''}>
                            J-{daysUntilEvent}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedContract(booking);
                        setShowCloseDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cloturer
                    </Button>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de cloture manuelle */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cloturer Manuellement le Service</DialogTitle>
            <DialogDescription>
              Cette action marquera le service comme termine et liberera les fonds au prestataire.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedContract && (
              <div className="p-3 bg-stone-50 rounded-lg text-sm">
                <p><strong>Client:</strong> {selectedContract.client_name}</p>
                <p><strong>Montant:</strong> {selectedContract.total_amount?.toLocaleString()} FCFA</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Raison de la cloture manuelle *</label>
              <Textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Ex: Client injoignable, service verifie comme termine..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => closeManuallyMutation.mutate({ bookingId: selectedContract?.id, reason: closeReason })}
              disabled={!closeReason || closeManuallyMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {closeManuallyMutation.isPending ? 'Traitement...' : 'Confirmer la Cloture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
