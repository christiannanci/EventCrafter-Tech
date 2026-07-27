import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb,
  MessageCircle, 
  CheckCircle2,
  Flag,
  Calendar,
  User,
  DollarSign,
  Loader2,
  MessageSquare,
  FileSignature,
  Eye,
  Star,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Shield
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from '@/utils';
import ContractFlow from './ContractFlow';
import ServiceCompletionPrompt from './ServiceCompletionPrompt';
import DisputeDialog from './DisputeDialog';
import DisputeReplyDialog from './DisputeReplyDialog';
import PaymentModal from '@/components/PaymentModal';

export default function MesDossiers({ vendorId, vendorProfile, onUpgradeClick }) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, nouveau, discussion, confirme, termine
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [showContractFlow, setShowContractFlow] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [showDisputeReplyDialog, setShowDisputeReplyDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAllDossiers();
    checkDisputeSuspension();
  }, [vendorId]);

  const checkDisputeSuspension = async () => {
    if (!vendorProfile || !vendorId) return;
    
    try {
      // Charger les bookings pour vérifier les litiges
      const allBookings = await base44.entities.Booking.list().catch(() => []);
      const myBookings = (allBookings || []).filter(b => b?.planner_id === vendorId);
      
      // Vérifier les litiges ouverts
      const allDisputes = await base44.entities.Dispute.list().catch(() => []);
      const myOpenDisputes = (allDisputes || []).filter(d => {
        if (!d) return false;
        const booking = (myBookings || []).find(b => b?.id === d.booking_id);
        return booking && !d.is_closed;
      });

      // Si un litige est ouvert, désactiver les boosts
      if (myOpenDisputes.length > 0 && vendorProfile.smart_match_boost_active) {
        await base44.entities.VendorProfile.update(vendorProfile.id, {
          smart_match_boost_active: false
        });
        toast({
          title: "⚠️ Boost Suspendu",
          description: "Vos boosts sont suspendus pendant la résolution du litige",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking dispute suspension:', error);
    }
  };

  const loadAllDossiers = async () => {
    if (!vendorId) return;
    
    setLoading(true);
    try {
      // 1. Charger les leads débloqués
      const unlockedLeads = await base44.entities.LeadUnlock.filter({ vendor_id: vendorId }).catch(() => []);
      const leadIds = (unlockedLeads || []).map(u => u?.lead_id).filter(Boolean);
      const allLeads = await base44.entities.Lead.list().catch(() => []);
      const myLeads = (allLeads || []).filter(l => l && leadIds.includes(l.id));

      // 2. Charger les conversations
      const allConversations = await base44.entities.Conversation.list().catch(() => []);
      const myConversations = (allConversations || []).filter(c => c && (c.planner_id === vendorId || c.vendor_id === vendorId));

      // 3. Charger les bookings
      const allBookings = await base44.entities.Booking.list().catch(() => []);
      const myBookings = (allBookings || []).filter(b => b?.planner_id === vendorId);

      // 4. Construire les dossiers unifiés
      const dossierMap = new Map();

      // Ajouter les leads débloqués
      (myLeads || []).forEach(lead => {
        if (!lead?.id) return;
        try {
          const unlock = (unlockedLeads || []).find(u => u?.lead_id === lead.id);
          dossierMap.set(lead.id, {
            id: lead.id,
            type: 'lead',
            clientName: lead.client_name || 'Client',
            clientEmail: lead.client_email || '',
            clientPhone: lead.client_phone || '',
            eventType: lead.event_type || 'Other',
            eventDate: lead.event_date || null,
            location: lead.location || '',
            budget: lead.budget || '',
            description: lead.description || '',
            status: 'nouveau',
            unlockedAt: unlock?.unlocked_at,
            lastUpdate: unlock?.unlocked_at || lead.created_date
          });
        } catch (e) {
          console.error('Error processing lead:', e);
        }
      });

      // Enrichir avec conversations (passage à "discussion")
      myConversations.forEach(conv => {
        if (!conv?.id) return;
        try {
          const leadId = conv.metadata?.lead_id;
          if (leadId && dossierMap.has(leadId)) {
            const dossier = dossierMap.get(leadId);
            dossier.status = 'discussion';
            dossier.conversationId = conv.id;
            dossier.lastUpdate = conv.updated_date || dossier.lastUpdate;
          }
        } catch (e) {
          console.error('Error processing conversation:', e);
        }
      });

      // Enrichir avec bookings (passage à "confirme" ou "termine")
      const allContracts = await base44.entities.Contract.list().catch(() => []);
      
      myBookings.forEach(booking => {
        if (!booking) return;
        const dossierId = booking.service_id || booking.id;
        
        // Déterminer le statut
        let status = 'confirme';
        if (booking.status && ['completed', 'cancelled', 'disputed'].includes(booking.status)) {
          status = 'termine';
        }

        // Trouver le contrat associé
        const contract = (allContracts || []).find(c => c?.booking_id === booking.id);

        try {
          if (dossierMap.has(dossierId)) {
            const dossier = dossierMap.get(dossierId);
            dossier.status = status;
            dossier.bookingId = booking.id;
            dossier.bookingStatus = booking.status || 'pending';
            dossier.amount = booking.total_amount || 0;
            dossier.contract = contract || null;
            dossier.lastUpdate = booking.updated_date || dossier.lastUpdate;
          } else {
            // Booking sans lead débloqué (client direct)
            dossierMap.set(booking.id, {
              id: booking.id,
              type: 'booking',
              clientName: booking.client_name || 'Client',
              eventType: booking.event_type || 'Other',
              eventDate: booking.event_date || null,
              status: status,
              bookingId: booking.id,
              bookingStatus: booking.status || 'pending',
              amount: booking.total_amount || 0,
              contract: contract || null,
              lastUpdate: booking.updated_date || booking.created_date
            });
          }
        } catch (e) {
          console.error('Error processing booking:', e);
        }
      });

      const dossiersArray = Array.from(dossierMap.values())
        .filter(d => d && d.id)
        .sort((a, b) => {
          try {
            return new Date(b?.lastUpdate || 0) - new Date(a?.lastUpdate || 0);
          } catch {
            return 0;
          }
        });

      setDossiers(dossiersArray);
    } catch (error) {
      console.error('Error loading dossiers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les dossiers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status, bookingStatus) => {
    try {
      const configs = {
        nouveau: {
          icon: Lightbulb,
          label: '💡 Nouveau Lead',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800',
          action: 'Débloquer / Répondre'
        },
        discussion: {
          icon: MessageCircle,
          label: '💬 En Discussion',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800',
          action: 'Négocier / Envoyer Devis'
        },
        confirme: bookingStatus === 'in_progress' ? {
          icon: MessageSquare,
          label: '🚀 En Cours d\'Exécution',
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          badge: 'bg-indigo-100 text-indigo-800',
          action: 'Mode Chantier'
        } : {
          icon: CheckCircle2,
          label: '✅ Confirmé',
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-800',
          action: 'Voir Détails / Gérer'
        },
        termine: {
          icon: Flag,
          label: '🏁 Terminé',
          bg: 'bg-stone-50',
          border: 'border-stone-200',
          badge: 'bg-stone-100 text-stone-800',
          action: 'Demander Avis'
        }
      };
      return configs[status] || configs.nouveau;
    } catch {
      return {
        icon: Lightbulb,
        label: 'Lead',
        bg: 'bg-stone-50',
        border: 'border-stone-200',
        badge: 'bg-stone-100 text-stone-800',
        action: 'Voir Détails'
      };
    }
  };

  const handleAction = (dossier) => {
    if (!dossier) return;
    try {
      const { status } = dossier;
      
      if (status === 'nouveau') {
        // Ouvrir le chat pour commencer la discussion
        if (dossier.conversationId) {
          window.location.href = createPageUrl(`Chat?conversationId=${dossier.conversationId}`);
        } else {
          toast({ 
            title: "Commencer la discussion",
            description: "Contactez le client via les détails fournis"
          });
        }
      } else if (status === 'discussion') {
        if (dossier.conversationId) {
          window.location.href = createPageUrl(`Chat?conversationId=${dossier.conversationId}`);
        }
      } else if (status === 'confirme') {
        window.location.href = createPageUrl(`VendorDashboard?tab=bookings_received`);
      } else if (status === 'termine') {
        toast({ 
          title: "Demander un avis",
          description: "Fonctionnalité à venir"
        });
      }
    } catch (e) {
      console.error('Error handling action:', e);
    }
  };

  const openContractFlow = async (dossier) => {
    if (!dossier?.bookingId) {
      // Créer un booking d'abord si nécessaire
      toast({ 
        title: "Créer d'abord une réservation",
        description: "Finalisez les détails de négociation avant de générer le contrat"
      });
      return;
    }
    
    try {
      const allBookings = await base44.entities.Booking.list().catch(() => []);
      const booking = (allBookings || []).find(b => b?.id === dossier.bookingId);
      
      if (booking) {
        setSelectedDossier({ ...dossier, booking });
        setShowContractFlow(true);
      } else {
        toast({ 
          title: "Erreur",
          description: "Impossible de charger la réservation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      toast({ 
        title: "Erreur",
        description: "Impossible de charger la réservation",
        variant: "destructive"
      });
    }
  };

  const filteredDossiers = filter === 'all' 
    ? (dossiers || [])
    : (dossiers || []).filter(d => d?.status === filter);

  const stats = {
    nouveau: (dossiers || []).filter(d => d?.status === 'nouveau').length,
    discussion: (dossiers || []).filter(d => d?.status === 'discussion').length,
    confirme: (dossiers || []).filter(d => d?.status === 'confirme').length,
    termine: (dossiers || []).filter(d => d?.status === 'termine').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        <span className="ml-3 text-stone-600">Chargement de vos dossiers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Flow Dialog */}
      {selectedDossier?.booking && (
        <>
          <ContractFlow
            booking={selectedDossier.booking}
            currentUser={{ id: vendorId }}
            open={showContractFlow}
            onOpenChange={setShowContractFlow}
            onComplete={() => {
              setShowContractFlow(false);
              loadAllDossiers();
            }}
          />
          <DisputeDialog
            open={showDisputeDialog}
            onOpenChange={setShowDisputeDialog}
            booking={selectedDossier.booking}
            userType="vendor"
            onSuccess={() => { setShowDisputeDialog(false); loadAllDossiers(); }}
          />
          <DisputeReplyDialog
            open={showDisputeReplyDialog}
            onOpenChange={setShowDisputeReplyDialog}
            booking={selectedDossier.booking}
            userType="vendor"
            onSuccess={() => { setShowDisputeReplyDialog(false); loadAllDossiers(); }}
          />
        </>
      )}

      {/* Payment Modal */}
      {paymentBooking && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={(isOpen) => {
            setShowPaymentModal(isOpen);
            if (!isOpen) {
              setPaymentBooking(null);
              loadAllDossiers();
            }
          }}
          booking={paymentBooking}
        />
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Mes Dossiers</h2>
          <p className="text-stone-500 text-sm mt-1">Vue d'ensemble de votre tunnel de vente</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'nouveau' ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => setFilter(filter === 'nouveau' ? 'all' : 'nouveau')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Nouveaux Leads</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.nouveau}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'discussion' ? 'ring-2 ring-blue-400' : ''}`}
          onClick={() => setFilter(filter === 'discussion' ? 'all' : 'discussion')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">En Discussion</p>
                <p className="text-2xl font-bold text-blue-600">{stats.discussion}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'confirme' ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => setFilter(filter === 'confirme' ? 'all' : 'confirme')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Confirmés</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirme}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'termine' ? 'ring-2 ring-stone-400' : ''}`}
          onClick={() => setFilter(filter === 'termine' ? 'all' : 'termine')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-600">Terminés</p>
                <p className="text-2xl font-bold text-stone-600">{stats.termine}</p>
              </div>
              <Flag className="w-8 h-8 text-stone-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dossiers List */}
      {filteredDossiers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center">
            <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              {filter === 'all' ? 'Aucun dossier' : `Aucun dossier ${getStatusConfig(filter).label.toLowerCase()}`}
            </h3>
            <p className="text-stone-500">
              Vos dossiers clients apparaîtront ici au fur et à mesure
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDossiers.map((dossier) => {
            if (!dossier?.id) return null;
            const config = getStatusConfig(dossier.status, dossier.bookingStatus);
            const Icon = config.icon;
            
            // Calculer le compte à rebours pour "En cours d'exécution"
            const isInProgress = dossier?.bookingStatus === 'in_progress';
            let daysUntilEvent = null;
            if (dossier?.eventDate) {
              try {
                daysUntilEvent = Math.ceil((new Date(dossier.eventDate) - new Date()) / (1000 * 60 * 60 * 24));
              } catch {
                daysUntilEvent = null;
              }
            }

            return (
              <Card key={dossier.id} className={`${config.bg} ${config.border} border-2 hover:shadow-lg transition-all`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${config.badge}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-stone-600" />
                          <h3 className="text-lg font-bold text-stone-900">{dossier?.clientName || 'Client'}</h3>
                        </div>
                        <Badge className={config.badge}>{config.label}</Badge>
                      </div>
                    </div>
                    <div className="text-right text-xs text-stone-500">
                      Mis à jour {dossier?.lastUpdate ? new Date(dossier.lastUpdate).toLocaleDateString('fr-FR') : 'N/A'}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {dossier.eventType && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-stone-500" />
                        <span className="text-stone-700">
                          {dossier.eventType} - {dossier?.eventDate ? new Date(dossier.eventDate).toLocaleDateString('fr-FR') : 'Date à définir'}
                        </span>
                      </div>
                    )}
                    
                    {dossier.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-stone-500" />
                        <span className="text-stone-700">{dossier.location}</span>
                      </div>
                    )}

                    {dossier.budget && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-stone-500" />
                        <span className="text-stone-700">Budget: {dossier.budget}</span>
                      </div>
                    )}

                    {dossier?.amount && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-semibold">{Number(dossier.amount).toLocaleString()} FCFA</span>
                      </div>
                    )}

                    {dossier.status === 'nouveau' && (
                      <>
                        {dossier.clientEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-stone-500" />
                            <span className="text-stone-700">{dossier.clientEmail}</span>
                          </div>
                        )}
                        {dossier.clientPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-stone-500" />
                            <span className="text-stone-700">{dossier.clientPhone}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {dossier.description && (
                    <div className="mb-4 p-3 bg-white rounded-lg border">
                      <p className="text-sm text-stone-700">{dossier.description}</p>
                    </div>
                  )}

                  {/* Prompt de clôture si événement passé */}
                  <ServiceCompletionPrompt 
                    dossier={dossier}
                    userType="vendor"
                    onComplete={loadAllDossiers}
                  />

                  {/* Mode Chantier - Compte à rebours */}
                  {isInProgress && daysUntilEvent !== null && daysUntilEvent > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-indigo-600 mb-1">🚀 Mode Chantier Actif</p>
                          <p className="text-2xl font-bold text-indigo-900">
                            {daysUntilEvent} jour{daysUntilEvent > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-indigo-600">avant l'événement</p>
                        </div>
                        <Calendar className="w-12 h-12 text-indigo-300" />
                      </div>
                    </div>
                  )}
                  
                  {isInProgress && daysUntilEvent !== null && daysUntilEvent <= 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-1">🎉 C'est le jour J !</p>
                          <p className="text-xl font-bold text-green-900">
                            L'événement a lieu aujourd'hui
                          </p>
                        </div>
                        <Calendar className="w-12 h-12 text-green-300" />
                      </div>
                    </div>
                  )}

                  {dossier.bookingStatus && (
                    <div className="mb-4">
                      <Badge variant="outline" className="text-xs">
                        Statut: {dossier.bookingStatus}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleAction(dossier)}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      {config.action}
                    </Button>
                    
                    {dossier.status === 'discussion' && (
                      <Button 
                        variant="outline"
                        onClick={() => openContractFlow(dossier)}
                      >
                        <FileSignature className="w-4 h-4 mr-2" />
                        Générer Contrat
                      </Button>
                    )}

                    {dossier.status === 'confirme' && dossier.bookingStatus === 'in_progress' && (
                      <>
                        <Button variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          Détails Logistiques
                        </Button>
                        <Button variant="outline">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contacter
                        </Button>
                        <Button 
                          variant="outline"
                          className="border-amber-600 text-amber-700 hover:bg-amber-50"
                          onClick={async () => {
                            try {
                              const allBookings = await base44.entities.Booking.list().catch(() => []);
                              const booking = allBookings.find(b => b.id === dossier.bookingId);
                              if (booking) {
                                setSelectedDossier({ ...dossier, booking });
                                setShowDisputeDialog(true);
                              } else {
                                toast({ 
                                  title: "Erreur",
                                  description: "Impossible de charger la réservation",
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error('Error:', error);
                            }
                          }}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Signaler un Incident
                        </Button>
                      </>
                    )}

                    {dossier.status === 'confirme' && !['awaiting_payment', 'in_progress'].includes(dossier.bookingStatus) && (
                      <>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            if (dossier.conversationId) {
                              window.location.href = createPageUrl(`Chat?conversationId=${dossier.conversationId}`);
                            } else {
                              toast({ title: "Pas de conversation", description: "Aucune conversation disponible" });
                            }
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Discussion
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => openContractFlow(dossier)}
                        >
                          <FileSignature className="w-4 h-4 mr-2" />
                          Gérer Contrat
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => openContractFlow(dossier)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Voir Contrat
                        </Button>
                      </>
                    )}

                    {dossier.bookingStatus === 'disputed' && (
                      <Button
                        variant="outline"
                        className="border-blue-600 text-blue-700 hover:bg-blue-50"
                        onClick={async () => {
                          const allBookings = await base44.entities.Booking.list().catch(() => []);
                          const booking = allBookings.find(b => b.id === dossier.bookingId);
                          if (booking) { setSelectedDossier({ ...dossier, booking }); setShowDisputeReplyDialog(true); }
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Répondre au Litige
                      </Button>
                    )}

                    {dossier.status === 'termine' && (
                      <>
                        <Button variant="outline">
                          <Star className="w-4 h-4 mr-2" />
                          Demander Avis
                        </Button>
                        {dossier.bookingStatus !== 'disputed' && (
                          <Button 
                            variant="outline"
                            className="border-amber-600 text-amber-700 hover:bg-amber-50"
                            onClick={async () => {
                              try {
                                const allBookings = await base44.entities.Booking.list().catch(() => []);
                                const booking = allBookings.find(b => b.id === dossier.bookingId);
                                if (booking) {
                                  setSelectedDossier({ ...dossier, booking });
                                  setShowDisputeDialog(true);
                                } else {
                                  toast({ 
                                    title: "Erreur",
                                    description: "Impossible de charger la réservation",
                                    variant: "destructive"
                                  });
                                }
                              } catch (error) {
                                console.error('Error:', error);
                              }
                            }}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Signaler un Incident
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}