import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, CalendarCheck, Wallet, MessageSquare, Crown, AlertCircle, ChevronLeft, ChevronRight, Lock, Unlock, AlertOctagon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { base44 } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { getLeadPricingInfo } from '@/components/LeadPricingCalculator';
import { useRewardCredit } from '@/components/RewardSystem';

export default function LeadsSection({ 
  leads, 
  loading, 
  page,
  itemsPerPage,
  onPageChange,
  membershipStatus,
  notificationCount,
  user,
  onUpgradeClick,
  vendorProfile,
  onLeadsUpdate
}) {
  const { toast } = useToast();
  const [processingUnlock, setProcessingUnlock] = React.useState(false);
  const [unlockedLeads, setUnlockedLeads] = React.useState(new Set());
  const [refundEligible, setRefundEligible] = React.useState(new Set());
  const [refundPolicy, setRefundPolicy] = React.useState(null);
  
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const paginatedLeads = leads.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Charger les leads déjà débloqués + politique remboursement
  React.useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        const [unlocks, policyConfig] = await Promise.all([
          base44.entities.LeadUnlock.filter({ vendor_id: user.id }),
          base44.entities.RefundPolicyConfig.filter({ config_key: 'default' })
        ]);
        
        setUnlockedLeads(new Set(unlocks.map(u => u.lead_id)));
        setRefundPolicy(policyConfig[0] || { waiting_period_days: 7 });

        // Vérifier éligibilité remboursement
        const eligible = new Set();
        const now = new Date();
        
        for (const unlock of unlocks) {
          const unlockDate = new Date(unlock.unlocked_at);
          const daysSince = Math.floor((now - unlockDate) / (1000 * 60 * 60 * 24));
          
          if (daysSince >= (policyConfig[0]?.waiting_period_days || 7)) {
            // Vérifier si pas déjà demandé
            const existingRequest = await base44.entities.LeadRefundRequest.filter({ 
              vendor_id: user.id, 
              lead_id: unlock.lead_id 
            });
            
            if (existingRequest.length === 0) {
              eligible.add(unlock.lead_id);
            }
          }
        }
        
        setRefundEligible(eligible);
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, [user?.id]);

  // Déterminer si un lead est visible selon le plan
  const getLeadVisibility = (leadIndex) => {
    // Premium & Gold: Accès illimité et instantané
    if (membershipStatus === 'premium' || membershipStatus === 'gold') {
      return { visible: true, unlocked: true, realtime: true };
    }
    
    // Gratuit: 1-2 leads par semaine (différés)
    // Pour simplifier: les 2 premiers leads de la liste sont visibles mais floutés
    const isVisible = leadIndex < 2; // Limite à 2 leads/semaine pour Gratuit
    
    return { 
      visible: isVisible, 
      unlocked: false, // Contacts floutés, nécessite déblocage payant
      realtime: false 
    };
  };

  // Gérer le déblocage d'un lead avec paiement
  const handleUnlockLead = async (lead, useCredit = false) => {
    setProcessingUnlock(true);
    try {
      const pricing = getLeadPricingInfo(lead);
      let unlockType = 'pay_per_lead';
      let amountPaid = pricing.priceUSD;

      // Utiliser un crédit reward si demandé
      if (useCredit) {
        if ((vendorProfile.reward_credits || 0) < 1) {
          toast({
            title: "❌ Pas assez de crédits",
            description: "Vous n'avez pas de crédit reward disponible.",
            variant: "destructive"
          });
          return;
        }
        
        // Déduire 1 crédit
        await base44.entities.VendorProfile.update(vendorProfile.id, {
          reward_credits: vendorProfile.reward_credits - 1
        });
        
        unlockType = 'reward_credit';
        amountPaid = 0;
      } else {
        // TODO: Intégration paiement réel (Mobile Money/Stripe)
        // Pour l'instant, simulation
        
        // Déduire du wallet
        if ((vendorProfile.account_balance || 0) < amountPaid) {
          toast({
            title: "❌ Solde insuffisant",
            description: `Vous avez besoin de $${amountPaid} pour débloquer ce lead. Rechargez votre portefeuille.`,
            variant: "destructive"
          });
          return;
        }
        
        await base44.entities.VendorProfile.update(vendorProfile.id, {
          account_balance: (vendorProfile.account_balance || 0) - amountPaid
        });
      }
      
      // Créer l'enregistrement de déblocage
      await base44.entities.LeadUnlock.create({
        vendor_id: user.id,
        lead_id: lead.id,
        unlock_type: unlockType,
        amount_paid: amountPaid,
        unlocked_at: new Date().toISOString()
      });

      // Créer transaction
      await base44.entities.Transaction.create({
        user_id: user.id,
        amount: -amountPaid,
        type: 'ad_fee',
        status: 'completed',
        description: `Déblocage lead: ${lead.event_type} - ${pricing.category}`
      });

      // Mettre à jour l'état local
      setUnlockedLeads(new Set([...unlockedLeads, lead.id]));

      toast({
        title: useCredit ? "✅ Lead débloqué avec crédit !" : "✅ Lead débloqué !",
        description: useCredit 
          ? `Crédit utilisé. Reste: ${(vendorProfile.reward_credits || 0) - 1} crédits`
          : `${pricing.priceFCFA} débité. Contacts complets maintenant visibles.`,
      });

      if (onLeadsUpdate) onLeadsUpdate();
      
    } catch (error) {
      console.error('Unlock error:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de débloquer le lead. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setProcessingUnlock(false);
    }
  };

  const handleContactClient = async (lead) => {
    try {
      const allConvs = await base44.entities.Conversation.list('-created_date', 100);
      const existing = allConvs.find(c => 
        c.participants.includes(user.id) && 
        c.participants.includes(lead.client_id)
      );

      if (existing) {
        window.location.href = `/Chat?conversationId=${existing.id}`;
      } else {
        const newConv = await base44.entities.Conversation.create({
          participants: [String(user.id), String(lead.client_id)],
          last_message: `Réponse à la demande: ${lead.event_type}`,
          last_message_at: new Date().toISOString()
        });
        window.location.href = `/Chat?conversationId=${newConv.id}`;
      }
    } catch (error) {
      toast({ 
        title: "Erreur de connexion", 
        description: "Impossible de démarrer la conversation.",
        variant: "destructive" 
      });
    }
  };

  // Flouter les informations de contact
  const blurContact = (text) => {
    if (!text) return '●●●●●●●●';
    return text.substring(0, 2) + '●●●●●●' + text.substring(text.length - 2);
  };

  // Demander remboursement
  const handleRequestRefund = async (lead) => {
    try {
      const unlock = await base44.entities.LeadUnlock.filter({ 
        vendor_id: user.id, 
        lead_id: lead.id 
      });
      
      if (unlock.length === 0) return;

      await base44.entities.LeadRefundRequest.create({
        vendor_id: user.id,
        lead_id: lead.id,
        unlock_id: unlock[0].id,
        amount_paid: unlock[0].amount_paid || 0,
        unlock_type: unlock[0].unlock_type,
        reason: "Client ne répond pas après délai d'attente",
        status: 'pending'
      });

      setRefundEligible(prev => {
        const newSet = new Set(prev);
        newSet.delete(lead.id);
        return newSet;
      });

      toast({
        title: "✅ Demande envoyée",
        description: unlock[0].unlock_type === 'reward_credit' 
          ? "Votre crédit sera restauré après validation admin."
          : `Votre crédit de $${unlock[0].amount_paid} sera reversé sur votre compte après validation.`,
      });
    } catch (error) {
      console.error('Refund request error:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'envoyer la demande. Réessayez.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-600" />
              Demandes Clients Disponibles
            </CardTitle>
            <p className="text-sm text-stone-500">
              {membershipStatus === 'premium' || membershipStatus === 'gold' 
                ? '✅ Accès illimité et instantané' 
                : '⚠️ Plan Gratuit: 1-2 leads/semaine, contacts floutés'}
            </p>
          </div>
          {vendorProfile && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-stone-600">Crédits Reward</span>
                <Badge variant="outline" className="border-green-500 text-green-600">
                  {vendorProfile.reward_credits || 0} crédits
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-600">Solde Wallet</span>
                <Badge variant="outline" className="border-blue-500 text-blue-600">
                  ${(vendorProfile.account_balance || 0).toFixed(2)}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-l-4 border-l-stone-200">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : leads.length > 0 ? (
          <div className="space-y-4">
            {paginatedLeads.map((lead, idx) => {
              const globalIndex = (page - 1) * itemsPerPage + idx;
              const visibility = getLeadVisibility(globalIndex);
              const isUnlocked = unlockedLeads.has(lead.id) || visibility.unlocked;
              const pricing = getLeadPricingInfo(lead);
              
              // Lead non visible pour plan Gratuit (au-delà de 2 par semaine)
              if (!visibility.visible) {
                return (
                  <Card key={lead.id} className="border-l-4 border-l-amber-500 bg-amber-50/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Lock className="w-10 h-10 text-amber-600" />
                          <div>
                            <h4 className="font-bold text-stone-900 mb-1">Lead Disponible</h4>
                            <p className="text-sm text-stone-600">
                              Limite hebdomadaire atteinte. Passez à Premium pour voir plus de leads.
                            </p>
                          </div>
                        </div>
                        <Button onClick={onUpgradeClick} className="bg-amber-600 hover:bg-amber-700">
                          <Crown className="w-4 h-4 mr-2" />
                          Passer Premium
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              
              return (
              <Card key={lead.id} className={`border-l-4 ${isUnlocked ? 'border-l-rose-600' : 'border-l-stone-400 bg-stone-50/50'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className="bg-rose-100 text-rose-800 border-0">
                          {lead.event_type}
                        </Badge>
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                          {lead.service_category}
                        </Badge>
                        {!isUnlocked && (
                          <Badge className="bg-amber-500 text-white">
                            <Lock className="w-3 h-3 mr-1" />
                            Contacts Floutés
                          </Badge>
                        )}
                        {visibility.realtime && (
                          <Badge className="bg-green-500 text-white">
                            ⚡ Temps Réel
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-lg text-stone-900 mb-2">
                        {lead.event_type} - {lead.service_category}
                      </h4>
                      <div className="space-y-2 text-sm text-stone-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-stone-400" />
                          <span>{lead.location}</span>
                        </div>
                        {lead.event_date && (
                          <div className="flex items-center gap-2">
                            <CalendarCheck className="w-4 h-4 text-stone-400" />
                            <span>{format(new Date(lead.event_date), 'dd/MM/yyyy')}</span>
                          </div>
                        )}
                        {lead.budget && (
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-stone-400" />
                            <span className="font-medium text-green-600">{lead.budget}</span>
                            <Badge variant="outline" className="text-xs">
                              {pricing.description}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Contacts floutés ou dévoilés */}
                        {!isUnlocked ? (
                          <>
                            <div className="flex items-center gap-2 text-stone-400">
                              📞 Téléphone: {blurContact(lead.client_phone || '237670934378')}
                            </div>
                            <div className="flex items-center gap-2 text-stone-400">
                              📧 Email: {blurContact(lead.client_email || 'client@example.com')}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                              📞 Téléphone: {lead.client_phone || '+237 670 93 43 78'}
                            </div>
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                              📧 Email: {lead.client_email || 'client@example.com'}
                            </div>
                          </>
                        )}
                      </div>
                      {lead.description && (
                        <p className="mt-3 text-sm text-stone-600 bg-stone-50 p-3 rounded-lg">
                          "{lead.description}"
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {isUnlocked ? (
                        <>
                          <Button 
                            className="bg-rose-600 hover:bg-rose-700 whitespace-nowrap"
                            onClick={() => handleContactClient(lead)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Contacter Client
                          </Button>
                          {refundEligible.has(lead.id) && (
                            <Button 
                              onClick={() => handleRequestRefund(lead)}
                              variant="outline"
                              className="border-orange-500 text-orange-700 hover:bg-orange-50 whitespace-nowrap text-xs"
                            >
                              <AlertOctagon className="w-3 h-3 mr-1" />
                              Pas de réponse?
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleUnlockLead(lead, false)}
                            disabled={processingUnlock}
                            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          >
                            <Unlock className="w-4 h-4 mr-2" />
                            Débloquer {pricing.priceFCFA}
                          </Button>
                          {(vendorProfile?.reward_credits || 0) > 0 && (
                            <Button 
                              onClick={() => handleUnlockLead(lead, true)}
                              disabled={processingUnlock}
                              variant="outline"
                              className="border-amber-500 text-amber-700 hover:bg-amber-50 whitespace-nowrap"
                            >
                              🎁 Utiliser 1 Crédit
                            </Button>
                          )}
                          <Button 
                            onClick={onUpgradeClick}
                            variant="outline"
                            className="whitespace-nowrap"
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Upgrade Plan
                          </Button>
                        </>
                      )}
                      <span className="text-xs text-stone-400 text-center">
                        Posté {format(new Date(lead.created_date), 'dd/MM')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-stone-600">
                  Page {page} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-2">Aucune demande disponible</h3>
            <p className="text-stone-500">Les demandes clients correspondant à vos services apparaîtront ici.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}