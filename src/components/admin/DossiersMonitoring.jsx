import React, { useState } from 'react';
import { base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Zap,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Eye,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DossiersMonitoring() {
  const { toast } = useToast();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Charger toutes les données nécessaires
  const { data: vendors } = useQuery({
    queryKey: ['all-vendors-monitoring'],
    queryFn: () => base44.entities.VendorProfile.list('-created_date', 5000)
  });

  const { data: leadUnlocks } = useQuery({
    queryKey: ['lead-unlocks-monitoring'],
    queryFn: () => base44.entities.LeadUnlock.list('-unlocked_at', 10000)
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations-monitoring'],
    queryFn: () => base44.entities.Conversation.list('-created_date', 10000)
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings-monitoring'],
    queryFn: () => base44.entities.Booking.list('-created_date', 10000)
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions-boost'],
    queryFn: () => base44.entities.Transaction.filter({ 
      description: { $regex: 'Smart Match Boost|Coup de Coeur' }
    })
  });

  // Calculer les métriques globales
  const calculateGlobalMetrics = () => {
    if (!conversations || !bookings) return null;

    const convosInDiscussion = conversations.filter(c => c.status === 'active');
    const confirmedBookings = bookings.filter(b => 
      ['confirmed', 'awaiting_deposit', 'deposit_paid', 'in_progress'].includes(b.status)
    );

    // Calculer temps moyen Discussion → Confirmé
    let totalDays = 0;
    let count = 0;
    
    confirmedBookings.forEach(booking => {
      const convo = conversations.find(c => c.metadata?.lead_id === booking.service_id);
      if (convo && booking.created_date) {
        const convoStart = new Date(convo.created_date);
        const bookingConfirmed = new Date(booking.created_date);
        const days = (bookingConfirmed - convoStart) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 365) { // Sanity check
          totalDays += days;
          count++;
        }
      }
    });

    const avgDaysToConfirm = count > 0 ? (totalDays / count).toFixed(1) : 0;

    // Dossiers bloqués (en discussion depuis > 7 jours)
    const now = new Date();
    const stuckDossiers = convosInDiscussion.filter(c => {
      const daysSinceStart = (now - new Date(c.created_date)) / (1000 * 60 * 60 * 24);
      return daysSinceStart > 7;
    });

    return {
      totalConversations: convosInDiscussion.length,
      totalConfirmed: confirmedBookings.length,
      avgDaysToConfirm,
      stuckDossiers: stuckDossiers.length,
      conversionRate: convosInDiscussion.length > 0 
        ? ((confirmedBookings.length / convosInDiscussion.length) * 100).toFixed(1)
        : 0
    };
  };

  // Calculer ROI par vendeur
  const calculateVendorROI = (vendorId) => {
    if (!leadUnlocks || !bookings || !transactions || !vendors) return null;

    const vendor = vendors.find(v => v.user_id === vendorId);
    if (!vendor) return null;

    // Calculer montant dépensé en boosts
    const boostTransactions = transactions.filter(t => 
      t.user_id === vendorId && 
      (t.description?.includes('Smart Match Boost') || t.description?.includes('Coup de Coeur'))
    );
    const totalBoostSpent = boostTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Nombre de leads débloqués
    const vendorUnlocks = leadUnlocks.filter(u => u.vendor_id === vendorId);
    const dossiersOuverts = vendorUnlocks.length;

    // Nombre de dossiers confirmés
    const vendorBookings = bookings.filter(b => 
      b.planner_id === vendorId && 
      ['confirmed', 'awaiting_deposit', 'deposit_paid', 'in_progress', 'completed'].includes(b.status)
    );
    const dossiersConfirmes = vendorBookings.length;

    // Revenus générés
    const totalRevenue = vendorBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // ROI
    const roi = totalBoostSpent > 0 
      ? (((totalRevenue - totalBoostSpent) / totalBoostSpent) * 100).toFixed(0)
      : 0;

    return {
      vendorName: vendor.business_name || 'Vendeur',
      vendorPlan: vendor.plan,
      totalBoostSpent,
      dossiersOuverts,
      dossiersConfirmes,
      totalRevenue,
      roi,
      conversionRate: dossiersOuverts > 0 
        ? ((dossiersConfirmes / dossiersOuverts) * 100).toFixed(1)
        : 0
    };
  };

  // Top vendors par ROI
  const getTopVendorsByROI = () => {
    if (!vendors) return [];

    const vendorStats = vendors
      .map(v => calculateVendorROI(v.user_id))
      .filter(v => v && v.totalBoostSpent > 0)
      .sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi))
      .slice(0, 10);

    return vendorStats;
  };

  const sendReminderNotification = async (conversationId) => {
    try {
      const convo = conversations.find(c => c.id === conversationId);
      if (!convo) return;

      // Envoyer notification au vendeur
      await base44.entities.Notification.create({
        user_id: convo.planner_id || convo.vendor_id,
        title: "⏰ Dossier en attente",
        message: "Un de vos dossiers est en discussion depuis plus de 7 jours. Relancez votre client pour conclure !",
        type: "system",
        is_read: false
      });

      toast({
        title: "Notification envoyée",
        description: "Le prestataire a été notifié"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive"
      });
    }
  };

  const viewDossierHistory = async (dossierId) => {
    // Charger l'historique complet
    const lead = leadUnlocks?.find(u => u.lead_id === dossierId);
    const convo = conversations?.find(c => c.metadata?.lead_id === dossierId);
    const booking = bookings?.find(b => b.service_id === dossierId);

    setSelectedDossier({
      lead,
      conversation: convo,
      booking,
      messages: convo?.messages || []
    });
    setShowHistoryDialog(true);
  };

  const globalMetrics = calculateGlobalMetrics();
  const topVendors = getTopVendorsByROI();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          Monitoring des Dossiers & ROI Boosts
        </h2>
        <p className="text-stone-500 mt-1">Superviser la conversion et performance des prestataires</p>
      </div>

      {/* Métriques Globales */}
      {globalMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-600">Dossiers en Discussion</p>
                  <p className="text-2xl font-bold text-blue-600">{globalMetrics.totalConversations}</p>
                </div>
                <MessageCircle className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-600">Dossiers Confirmés</p>
                  <p className="text-2xl font-bold text-green-600">{globalMetrics.totalConfirmed}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-600">Temps Moyen Conversion</p>
                  <p className="text-2xl font-bold text-purple-600">{globalMetrics.avgDaysToConfirm}j</p>
                </div>
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={globalMetrics.stuckDossiers > 0 ? "border-amber-300" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-600">Dossiers Bloqués</p>
                  <p className={`text-2xl font-bold ${globalMetrics.stuckDossiers > 0 ? 'text-amber-600' : 'text-stone-600'}`}>
                    {globalMetrics.stuckDossiers}
                  </p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${globalMetrics.stuckDossiers > 0 ? 'text-amber-400' : 'text-stone-400'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ROI Top Vendors */}
      <Card className="border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Top 10 Vendors par ROI Boost
          </CardTitle>
          <CardDescription>Retour sur investissement des prestataires boostés</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {topVendors.map((vendor, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">{vendor.vendorName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={
                        vendor.vendorPlan === 'gold' ? 'bg-amber-600' :
                        vendor.vendorPlan === 'premium' ? 'bg-purple-600' :
                        'bg-stone-600'
                      }>
                        {vendor.vendorPlan}
                      </Badge>
                      <span className="text-xs text-stone-500">
                        {vendor.dossiersConfirmes}/{vendor.dossiersOuverts} confirmés
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-stone-600">
                      ${vendor.totalBoostSpent} dépensés
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">
                      {vendor.totalRevenue.toLocaleString()} FCFA
                    </span>
                  </div>
                  <Badge className={
                    parseFloat(vendor.roi) > 500 ? 'bg-green-600' :
                    parseFloat(vendor.roi) > 200 ? 'bg-blue-600' :
                    parseFloat(vendor.roi) > 0 ? 'bg-amber-600' :
                    'bg-red-600'
                  }>
                    ROI: {vendor.roi}%
                  </Badge>
                </div>
              </div>
            ))}
            {topVendors.length === 0 && (
              <div className="text-center py-8 text-stone-500">
                Aucun vendor avec boost actif pour le moment
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dossiers Bloqués nécessitant intervention */}
      {globalMetrics && globalMetrics.stuckDossiers > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Dossiers Bloqués (Discussion &gt; 7 jours)
            </CardTitle>
            <CardDescription>Nécessitent une relance ou intervention</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {conversations?.filter(c => {
                const daysSinceStart = (new Date() - new Date(c.created_date)) / (1000 * 60 * 60 * 24);
                return c.status === 'active' && daysSinceStart > 7;
              }).map((convo) => {
                const daysSinceStart = Math.floor((new Date() - new Date(convo.created_date)) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={convo.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200">
                    <div>
                      <p className="font-semibold text-stone-900">
                        Conversation ID: {convo.id.substring(0, 8)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-stone-600">
                        <Calendar className="w-4 h-4" />
                        <span>En discussion depuis {daysSinceStart} jours</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDossierHistory(convo.metadata?.lead_id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir Historique
                      </Button>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => sendReminderNotification(convo.id)}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Relancer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Historique Dossier */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique Complet du Dossier</DialogTitle>
          </DialogHeader>
          {selectedDossier && (
            <div className="space-y-4">
              {selectedDossier.lead && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Étape 1: Lead Débloqué</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-stone-600">
                      Débloqué le: {new Date(selectedDossier.lead.unlocked_at).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-stone-600">
                      Type: {selectedDossier.lead.unlock_type}
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedDossier.conversation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Étape 2: Discussion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-stone-600 mb-2">
                      Démarré le: {new Date(selectedDossier.conversation.created_date).toLocaleString('fr-FR')}
                    </p>
                    <div className="bg-stone-50 p-3 rounded max-h-40 overflow-y-auto">
                      {selectedDossier.messages.length} message(s) échangé(s)
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedDossier.booking && (
                <Card className="border-green-300">
                  <CardHeader>
                    <CardTitle className="text-sm">Étape 3: Confirmé</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-stone-600">
                      Confirmé le: {new Date(selectedDossier.booking.created_date).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-sm font-semibold text-green-700 mt-2">
                      Montant: {selectedDossier.booking.total_amount?.toLocaleString()} FCFA
                    </p>
                    <Badge className="mt-2">{selectedDossier.booking.status}</Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}