import React, { useState } from 'react';
import { base44 } from '@/api/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertTriangle, 
  MessageCircle, 
  DollarSign,
  XCircle,
  Eye,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Scale,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function DisputeManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionAction, setResolutionAction] = useState('payment'); // payment, refund, both
  const [refundAmount, setRefundAmount] = useState('');
  const [resolutionType, setResolutionType] = useState('amicable'); // amicable, refund, sanction
  const [showMediationChat, setShowMediationChat] = useState(false);
  const [mediationMessage, setMediationMessage] = useState('');
  const [mediationMessages, setMediationMessages] = useState([]);
  const [mediationLoading, setMediationLoading] = useState(false);
  const [mediationConvId, setMediationConvId] = useState(null);

  // Charger l'utilisateur courant
  const { data: currentUser } = useQuery({
    queryKey: ['current-admin-user'],
    queryFn: () => base44.auth.me()
  });

  // Charger les disputes
  const { data: disputes = [] } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: () => base44.entities.Dispute.list('-created_date', 500)
  });

  const { data: bookings = {} } = useQuery({
    queryKey: ['admin-bookings-map'],
    queryFn: async () => {
      const allBookings = await base44.entities.Booking.list('-created_date', 1000);
      const map = {};
      allBookings.forEach(b => map[b.id] = b);
      return map;
    }
  });

  const { data: contracts = {} } = useQuery({
    queryKey: ['admin-contracts-map'],
    queryFn: async () => {
      const allContracts = await base44.entities.Contract.list('-created_date', 1000);
      const map = {};
      allContracts.forEach(c => map[c.id] = c);
      return map;
    }
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

  const { data: users = {} } = useQuery({
    queryKey: ['admin-users-map'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      const map = {};
      allUsers.forEach(u => map[u.id] = u);
      return map;
    }
  });

  const contactPartyMutation = useMutation({
    mutationFn: async ({ userId, message }) => {
      await base44.entities.Notification.create({
        user_id: userId,
        title: '⚖️ Message de l\'Administration',
        message: message,
        type: 'admin_message',
        link: '/ClientDashboard',
        is_read: false
      });
    },
    onSuccess: () => {
      toast({ title: 'Message envoyé', description: 'La partie a été contactée' });
    }
  });

  const exportDisputePDFMutation = useMutation({
    mutationFn: async (disputeId) => {
      const dispute = disputes.find(d => d.id === disputeId);
      const booking = bookings[dispute.booking_id];
      const contract = contracts[dispute.contract_id];
      
      // Récupérer les messages de médiation
      const conversations = await base44.entities.Conversation.filter({ booking_id: booking.id });
      const messages = conversations.length > 0 
        ? await base44.entities.Message.filter({ conversation_id: conversations[0].id })
        : [];

      // Générer le PDF via l'API
      const pdfContent = {
        dispute_code: dispute.dispute_code,
        booking_code: booking.booking_code,
        contract_url: contract?.contract_url,
        client_name: booking.client_name,
        vendor_name: vendors[booking.planner_id]?.business_name,
        description: dispute.description,
        evidence_urls: dispute.report_url?.split(',') || [],
        messages: messages.map(m => ({
          sender: m.sender_id,
          content: m.content,
          timestamp: m.created_date
        })),
        resolution: dispute.negotiation_conclusion
      };

      // Télécharger le PDF
      const blob = new Blob([JSON.stringify(pdfContent, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Litige_${dispute.dispute_code}.json`;
      a.click();
    },
    onSuccess: () => {
      toast({ title: 'PDF Exporté', description: 'Le dossier a été téléchargé' });
    }
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, action, amount, notes, resolutionType }) => {
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) return;

      const booking = bookings[dispute.booking_id];
      
      // Déterminer si le prestataire a perdu le litige
      const vendorLostDispute = action === 'refund' || (action === 'both' && resolutionType === 'sanction');
      
      // Mettre à jour le litige
      await base44.entities.Dispute.update(disputeId, {
        is_resolved: true,
        is_closed: true,
        closed_date: new Date().toISOString(),
        negotiation_conclusion: notes,
        payment_authorized: action === 'payment' || action === 'both',
        refund_authorized: action === 'refund' || action === 'both'
      });

      // CONSÉQUENCES SUR LE PRESTATAIRE
      if (vendorLostDispute && booking?.planner_id) {
        const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: booking.planner_id });
        const vendorProfile = vendorProfiles[0];

        if (vendorProfile) {
          const currentDisputesLost = vendorProfile.disputes_lost_count || 0;
          const newDisputesLost = currentDisputesLost + 1;

          // 1. Pénalité sur le Score de Fiabilité (baisse de 0.5 points)
          const allServices = await base44.entities.Service.filter({ planner_id: booking.planner_id });
          for (const service of allServices) {
            const currentRating = service.rating || 5.0;
            const penalizedRating = Math.max(1.0, currentRating - 0.5);
            await base44.entities.Service.update(service.id, {
              rating: penalizedRating
            });
          }

          // 2. Suspension de tous les Boosts actifs
          await base44.entities.VendorProfile.update(vendorProfile.id, {
            smart_match_boost_active: false,
            disputes_lost_count: newDisputesLost,
            account_suspended: newDisputesLost >= 3
          });

          // 3. Red Flag Admin après 3 litiges perdus
          if (newDisputesLost >= 3) {
            const allAdmins = await base44.entities.User.filter({ role: 'admin' });
            for (const admin of allAdmins) {
              await base44.entities.Notification.create({
                user_id: admin.id,
                title: '🚨 RED FLAG - Bannissement Requis',
                message: `Le prestataire "${vendorProfile.business_name}" a perdu ${newDisputesLost} litiges. Action de bannissement recommandée.`,
                type: 'admin_alert',
                link: '/AdminDashboard?tab=users',
                is_read: false
              });
            }
          }

          // Notifier le prestataire des conséquences
          await base44.entities.Notification.create({
            user_id: booking.planner_id,
            title: '⚠️ Litige Perdu - Conséquences',
            message: newDisputesLost >= 3 
              ? `Votre compte a été suspendu après ${newDisputesLost} litiges perdus. Contactez l'administration.`
              : `Le litige a été résolu contre vous. Vos boosts sont suspendus et votre note a été réduite. Total litiges perdus: ${newDisputesLost}/3`,
            type: 'warning',
            link: '/VendorDashboard',
            is_read: false
          });
        }
      }

      // Traiter les actions financières
      if (action === 'refund' || action === 'both') {
        // Créer un remboursement
        await base44.entities.ClientRefund.create({
          client_id: booking.created_by,
          booking_id: booking.id,
          amount: parseFloat(amount) || booking.total_amount,
          status: 'pending',
          reason: `Litige résolu: ${notes}`
        });

        // Notifier le client
        const allUsers = await base44.entities.User.list();
        const clientUser = allUsers.find(u => u.email === booking.created_by);
        if (clientUser) {
          await base44.entities.Notification.create({
            user_id: clientUser.id,
            title: '✅ Litige Résolu - Remboursement',
            message: `Votre litige a été résolu. Un remboursement de ${parseFloat(amount) || booking.total_amount} FCFA sera traité.`,
            type: 'dispute_resolved',
            link: '/ClientDashboard',
            is_read: false
          });
        }
      }

      if (action === 'payment' || action === 'both') {
        // Libérer le paiement au prestataire
        const transactions = await base44.entities.Transaction.filter({ booking_id: booking.id });
        const escrowTx = transactions.find(t => t.status === 'escrow_held');
        
        if (escrowTx) {
          await base44.entities.Transaction.update(escrowTx.id, {
            status: 'released',
            description: escrowTx.description + ` (Litige résolu - Admin)`
          });
        }

        // Notifier le vendeur
        await base44.entities.Notification.create({
          user_id: booking.planner_id,
          title: '✅ Litige Résolu - Paiement Libéré',
          message: `Le litige a été résolu en votre faveur. Les fonds sont libérés.`,
          type: 'dispute_resolved',
          link: '/VendorDashboard',
          is_read: false
        });
      }

      // Mettre à jour le statut du booking selon le type de résolution
      let newStatus = 'completed';
      if (resolutionType === 'amicable') {
        newStatus = 'in_progress'; // Service reprend
      } else if (resolutionType === 'refund') {
        newStatus = 'cancelled'; // Contrat annulé
      } else if (resolutionType === 'sanction') {
        newStatus = 'completed'; // Sanction appliquée
      }
      
      await base44.entities.Booking.update(booking.id, {
        status: newStatus
      });

      // Débloquer les paiements si résolution amiable
      if (resolutionType === 'amicable') {
        const transactions = await base44.entities.Transaction.filter({ booking_id: booking.id });
        for (const tx of transactions) {
          if (tx.status === 'blocked') {
            await base44.entities.Transaction.update(tx.id, {
              status: 'escrow_held'
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-disputes', 'admin-bookings-map']);
      toast({ title: 'Litige résolu', description: 'Les actions ont été exécutées' });
      setShowResolveDialog(false);
      setSelectedDispute(null);
      setResolutionNotes('');
      setRefundAmount('');
    }
  });

  const loadMediationMessages = async (dispute) => {
    if (!dispute?.booking_id) return;
    setMediationLoading(true);
    try {
      const booking = bookings[dispute.booking_id];
      if (!booking) return;
      const clientUser = Object.values(users).find(u => u.email === booking.created_by);
      const vendorId = booking.planner_id;
      const clientId = clientUser?.id;
      let convId = null;
      if (vendorId && clientId) {
        const allConvs = await base44.entities.Conversation.list('-created_date', 100);
        const conv = allConvs.find(c => c.participants?.includes(vendorId) && c.participants?.includes(clientId));
        if (conv) convId = conv.id;
      }
      setMediationConvId(convId);
      if (!convId) { setMediationMessages([]); return; }
      const msgs = await base44.entities.Message.filter({ conversation_id: convId });
      msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMediationMessages(msgs.slice(-50));
    } catch(e) { console.error(e); }
    finally { setMediationLoading(false); }
  };

  const handleSendMediationMessage = async () => {
    if (!mediationMessage.trim()) return;
    try {
      let convId = mediationConvId;
      const booking = bookings[selectedDispute?.booking_id];
      if (!convId && booking) {
        const clientUser = Object.values(users).find(u => u.email === booking.created_by);
        if (clientUser && booking.planner_id) {
          const newConv = await base44.entities.Conversation.create({
            participants: [booking.planner_id, clientUser.id],
            last_message: mediationMessage,
            last_message_at: new Date().toISOString()
          });
          convId = newConv.id;
          setMediationConvId(convId);
        }
      }
      if (!convId) { toast({ title: 'Erreur', description: 'Conversation introuvable', variant: 'destructive' }); return; }
      await base44.entities.Message.create({
        conversation_id: convId,
        sender_id: currentUser?.id || 'admin',
        content: `[⚖️ MÉDIATION ADMIN] ${mediationMessage}`,
        read_status: 'unread'
      });
      await base44.entities.Conversation.update(convId, { last_message: mediationMessage, last_message_at: new Date().toISOString() });
      toast({ title: 'Message envoyé', description: 'Les parties ont été notifiées' });
      setMediationMessage('');
      loadMediationMessages(selectedDispute);
    } catch(e) {
      toast({ title: 'Erreur', description: 'Envoi échoué', variant: 'destructive' });
    }
  };

  const openDisputes = disputes.filter(d => !d.is_closed);
  const resolvedDisputes = disputes.filter(d => d.is_closed);

  const getTimeline = (dispute) => {
    const booking = bookings[dispute.booking_id];
    const contract = contracts[dispute.contract_id];
    
    if (!booking) return [];

    const timeline = [];
    
    if (contract?.signed_at) {
      timeline.push({
        label: 'Contrat Signé',
        date: contract.signed_at,
        icon: FileText,
        color: 'text-blue-600'
      });
    }
    
    if (booking.payment_status === 'fully_paid' || booking.payment_status === 'deposit_paid') {
      timeline.push({
        label: 'Paiement Reçu',
        date: booking.updated_date,
        icon: DollarSign,
        color: 'text-green-600'
      });
    }
    
    timeline.push({
      label: 'Litige Ouvert',
      date: dispute.created_date,
      icon: AlertTriangle,
      color: 'text-red-600'
    });
    
    if (dispute.is_closed) {
      timeline.push({
        label: 'Litige Clôturé',
        date: dispute.closed_date,
        icon: CheckCircle2,
        color: 'text-green-600'
      });
    }
    
    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Scale className="w-6 h-6 text-red-600" />
          Tribunal des Contrats
        </h2>
        <p className="text-stone-500 mt-1">Gestion et arbitrage des litiges</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Litiges Actifs</p>
                <p className="text-2xl font-bold text-red-600">{openDisputes.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Résolus</p>
                <p className="text-2xl font-bold text-green-600">{resolvedDisputes.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Taux de Résolution</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {disputes.length > 0 ? Math.round((resolvedDisputes.length / disputes.length) * 100) : 0}%
                </p>
              </div>
              <Scale className="w-8 h-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Litiges Actifs */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Litiges en Cours - Action Requise
          </CardTitle>
          <CardDescription>Ces litiges nécessitent votre arbitrage</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {openDisputes.length > 0 ? (
            <div className="space-y-4">
              {openDisputes.map((dispute) => {
                const booking = bookings[dispute.booking_id];
                const contract = contracts[dispute.contract_id];
                const vendor = booking ? vendors[booking.planner_id] : null;
                const timeline = getTimeline(dispute);

                return (
                  <Card key={dispute.id} className="border-2 border-red-200">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-red-600 text-white">
                                {dispute.dispute_code}
                              </Badge>
                              <Badge variant="outline">
                                Initié par: {dispute.initiator === 'client' ? 'Client' : 'Prestataire'}
                              </Badge>
                            </div>
                            <p className="text-sm text-stone-600">
                              <strong>Client:</strong> {booking?.client_name || 'N/A'} • 
                              <strong> Prestataire:</strong> {vendor?.business_name || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-stone-500">
                              Ouvert le {new Date(dispute.created_date).toLocaleDateString('fr-FR')}
                            </p>
                            {(() => {
                              const hoursElapsed = Math.floor((new Date() - new Date(dispute.created_date)) / (1000 * 60 * 60));
                              const hoursLeft = 48 - hoursElapsed;
                              const isUrgent = hoursLeft <= 12;
                              const isExpired = hoursLeft <= 0;
                              return (
                                <div className={`mt-1 text-xs font-semibold px-2 py-1 rounded-full inline-block ${
                                  isExpired ? 'bg-red-600 text-white' : isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {isExpired ? '🔴 Délai expiré !' : `⏱ ${hoursLeft}h restantes`}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-stone-50 rounded-lg p-4">
                          <p className="text-xs font-semibold text-stone-700 mb-3">Timeline du Dossier</p>
                          <div className="flex items-center gap-2 overflow-x-auto">
                            {timeline.map((event, idx) => {
                              const Icon = event.icon;
                              return (
                                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                                  <div className="flex flex-col items-center">
                                    <div className={`p-2 rounded-full bg-white border-2 ${event.color}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs text-center mt-1 max-w-[80px]">{event.label}</p>
                                    <p className="text-xs text-stone-500">
                                      {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    </p>
                                  </div>
                                  {idx < timeline.length - 1 && (
                                    <div className="w-12 h-0.5 bg-stone-300 mb-16" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="bg-white rounded-lg border p-4">
                          <p className="text-sm font-semibold text-stone-700 mb-2">Description du Litige</p>
                          <p className="text-sm text-stone-600 whitespace-pre-wrap">{dispute.description}</p>
                        </div>

                        {/* Preuves */}
                        {dispute.report_url && (
                          <div>
                            <p className="text-xs font-semibold text-stone-700 mb-2">Preuves Fournies</p>
                            <div className="flex gap-2 flex-wrap">
                              {dispute.report_url.split(',').map((url, idx) => (
                                <a 
                                  key={idx} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="relative group"
                                >
                                  <img 
                                    src={url} 
                                    alt={`Preuve ${idx + 1}`}
                                    className="w-24 h-24 object-cover rounded-lg border hover:opacity-75 transition-opacity"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
                                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Montants */}
                        {booking && (
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span className="text-stone-600">Montant Total:</span>
                              <span className="font-semibold">{booking.total_amount?.toLocaleString()} FCFA</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-orange-600" />
                              <span className="text-stone-600">Payé:</span>
                              <span className="font-semibold">{booking.paid_amount?.toLocaleString() || 0} FCFA</span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!booking) return;
                              const clientUser = Object.values(users).find(u => u.email === booking.created_by);
                              if (clientUser) {
                                const message = prompt('Message pour le client:');
                                if (message) {
                                  contactPartyMutation.mutate({ userId: clientUser.id, message });
                                }
                              }
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Contacter Client
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!booking) return;
                              const message = prompt('Message pour le prestataire:');
                              if (message) {
                                contactPartyMutation.mutate({ userId: booking.planner_id, message });
                              }
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Contacter Prestataire
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/Chat?userId=${booking?.planner_id}`, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir Discussion
                          </Button>
                          {contract && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(contract.contract_url, '_blank')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Voir Contrat
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportDisputePDFMutation.mutate(dispute.id)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setMediationConvId(null);
                              setMediationMessages([]);
                              setShowMediationChat(true);
                              loadMediationMessages(dispute);
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Chat Médiation
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 ml-auto"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setRefundAmount(booking?.total_amount?.toString() || '');
                              setShowResolveDialog(true);
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Résoudre & Clôturer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500">
              Aucun litige actif
            </div>
          )}
        </CardContent>
      </Card>

      {/* Litiges Résolus */}
      {resolvedDisputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Litiges Résolus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedDisputes.slice(0, 10).map((dispute) => {
                const booking = bookings[dispute.booking_id];
                return (
                  <div key={dispute.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{dispute.dispute_code}</p>
                      <p className="text-xs text-stone-500">
                        {booking?.client_name || 'N/A'} • Résolu le {new Date(dispute.closed_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Résolu</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de résolution */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Résoudre le Litige {selectedDispute?.dispute_code}</DialogTitle>
            <DialogDescription>
              Choisissez l'action appropriée et rédigez une conclusion
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Type de Résolution *</Label>
              <RadioGroup value={resolutionType} onValueChange={setResolutionType}>
                <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-green-200 hover:bg-green-50">
                  <RadioGroupItem value="amicable" id="amicable" />
                  <Label htmlFor="amicable" className="flex-1 cursor-pointer">
                    <p className="font-medium text-green-900">✅ Option A - Résolu à l'Amiable</p>
                    <p className="text-xs text-green-600 mt-1">Le service reprend, statut redevient "En cours"</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-orange-200 hover:bg-orange-50">
                  <RadioGroupItem value="refund" id="refund-option" />
                  <Label htmlFor="refund-option" className="flex-1 cursor-pointer">
                    <p className="font-medium text-orange-900">💸 Option B - Remboursement</p>
                    <p className="text-xs text-orange-600 mt-1">Retour des fonds, contrat annulé</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-red-200 hover:bg-red-50">
                  <RadioGroupItem value="sanction" id="sanction" />
                  <Label htmlFor="sanction" className="flex-1 cursor-pointer">
                    <p className="font-medium text-red-900">⚖️ Option C - Sanction</p>
                    <p className="text-xs text-red-600 mt-1">Pénalité financière ou bannissement</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Action Financière *</Label>
              <RadioGroup value={resolutionAction} onValueChange={setResolutionAction}>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-stone-50">
                  <RadioGroupItem value="payment" id="payment" />
                  <Label htmlFor="payment" className="flex-1 cursor-pointer">
                    <p className="font-medium text-stone-900">💰 Libérer le Paiement au Prestataire</p>
                    <p className="text-xs text-stone-500 mt-1">Le prestataire a rempli ses obligations</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-stone-50">
                  <RadioGroupItem value="refund" id="refund" />
                  <Label htmlFor="refund" className="flex-1 cursor-pointer">
                    <p className="font-medium text-stone-900">🔄 Rembourser le Client</p>
                    <p className="text-xs text-stone-500 mt-1">Le prestataire n'a pas rempli ses obligations</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-stone-50">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="flex-1 cursor-pointer">
                    <p className="font-medium text-stone-900">⚖️ Solution Hybride</p>
                    <p className="text-xs text-stone-500 mt-1">Remboursement partiel + paiement partiel</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {(resolutionAction === 'refund' || resolutionAction === 'both') && (
              <div className="space-y-2">
                <Label>Montant du Remboursement (FCFA)</Label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Montant à rembourser"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Note de Conclusion *</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Rédigez votre conclusion et les raisons de votre décision..."
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => resolveDisputeMutation.mutate({
                disputeId: selectedDispute?.id,
                action: resolutionAction,
                amount: refundAmount,
                notes: resolutionNotes,
                resolutionType: resolutionType
              })}
              disabled={!resolutionNotes || resolveDisputeMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {resolveDisputeMutation.isPending ? 'Traitement...' : 'Confirmer la Résolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Chat Médiation */}
      <Dialog open={showMediationChat} onOpenChange={setShowMediationChat}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Chat Médiation - {selectedDispute?.dispute_code}</DialogTitle>
            <DialogDescription>
              Conversation à trois: Client, Prestataire et Administration
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-[500px] border rounded-lg">
            <div className="flex-1 overflow-y-auto p-4 bg-stone-50 space-y-3">
              {mediationLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-stone-400" /></div>
              ) : mediationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-stone-400">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Aucun message dans cette conversation.</p>
                  <p className="text-xs mt-1">Utilisez la zone ci-dessous pour envoyer un message de médiation.</p>
                </div>
              ) : (
                mediationMessages.map((msg, idx) => {
                  const isAdmin = msg.sender_id === currentUser?.id;
                  const isAdminMarked = msg.content?.startsWith('[⚖️ MÉDIATION ADMIN]');
                  const vendor = selectedDispute ? vendors[bookings[selectedDispute.booking_id]?.planner_id] : null;
                  const isVendor = msg.sender_id === bookings[selectedDispute?.booking_id]?.planner_id;
                  const bgColor = isAdminMarked ? 'bg-green-100' : isVendor ? 'bg-purple-100' : 'bg-blue-100';
                  const labelColor = isAdminMarked ? 'text-green-900' : isVendor ? 'text-purple-900' : 'text-blue-900';
                  const label = isAdminMarked ? '⚖️ Administration' : isVendor ? `🏢 ${vendor?.business_name || 'Prestataire'}` : '👤 Client';
                  return (
                    <div key={idx} className={`${bgColor} p-3 rounded-lg`}>
                      <p className={`text-xs font-semibold ${labelColor} mb-1`}>{label}</p>
                      <p className={`text-sm ${labelColor.replace('900', '800')}`}>{msg.content?.replace('[⚖️ MÉDIATION ADMIN] ', '')}</p>
                      <p className={`text-xs mt-1 ${labelColor.replace('900', '500')}`}>{new Date(msg.created_date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t p-4 bg-white">
              <div className="flex gap-2">
                <Textarea
                  value={mediationMessage}
                  onChange={(e) => setMediationMessage(e.target.value)}
                  placeholder="Votre message de médiation..."
                  rows={2}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMediationMessage}
                  disabled={!mediationMessage.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}