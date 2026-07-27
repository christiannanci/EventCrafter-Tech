import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from '@/utils';

import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";
import { Crown, Check } from "lucide-react";

export default function MembershipUpgradeDialog({ open, onOpenChange, currentUser, onSuccess }) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  

  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  const fetchPlans = async () => {
    const membershipTypes = await base44.entities.MembershipType.filter({ status: 'active' });
    
    // Ordre: Basic (free), Premium, Gold
    const sortedPlans = membershipTypes.sort((a, b) => {
      const order = { 'free': 1, 'basic': 1, 'premium': 2, 'gold': 3 };
      const aType = a.code.toLowerCase().includes('premium') ? 'premium' : 
                    a.code.toLowerCase().includes('gold') ? 'gold' : 'free';
      const bType = b.code.toLowerCase().includes('premium') ? 'premium' : 
                    b.code.toLowerCase().includes('gold') ? 'gold' : 'free';
      return order[aType] - order[bType];
    });
    
    setPlans(sortedPlans);
  };

  const handleSelectPlan = async (plan) => {
    if (!plan || loading) return;
    
    setLoading(true);
    try {
      console.log('🚀 Création abonnement pour:', plan.name);
      
      // Créer le contrat
      const contractNumber = `CONT-MEMB-${Date.now()}`;
      const contract = await base44.entities.Contract.create({
        contract_number: contractNumber,
        type: 'subscription',
        status: 'pending',
        contract_amount: plan.price,
        provider_account_id: currentUser.id,
        payment_terms: `Subscription to ${plan.name} plan - ${plan.billing_cycle} billing`,
        jurisdiction_clause: "This contract is governed by the laws of Cameroon.",
        cancellation_terms: plan.legal_terms || "Standard cancellation terms apply."
      });
      console.log('✅ Contrat créé:', contract.id);

      // Créer l'abonnement
      const startDate = new Date();
      const endDate = new Date();
      if (plan.billing_cycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (plan.billing_cycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const membership = await base44.entities.Membership.create({
        user_id: currentUser.id,
        membership_type_code: plan.code,
        contract_id: contract.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        duration_days: Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)),
        amount: plan.price,
        currency: plan.currency || 'FCFA',
        status: 'pending_contract',
        provider_account_id: currentUser.id,
        auto_renew: true
      });
      console.log('✅ Abonnement créé:', membership.id);

      // Créer la facture
      const invoiceNumber = `INV-MEMB-${Date.now()}`;
      const invoice = await base44.entities.Invoice.create({
        invoice_number: invoiceNumber,
        membership_id: membership.id,
        contract_id: contract.id,
        type: 'subscription',
        amount: plan.price,
        currency: plan.currency || 'FCFA',
        status: 'draft',
        issued_date: new Date().toISOString(),
        due_date: new Date().toISOString()
      });
      console.log('✅ Facture créée:', invoice.id);

      // Lier la facture à l'abonnement
      await base44.entities.Membership.update(membership.id, {
        invoice_id: invoice.id
      });

      // Fermer le dialog et rediriger
      const checkoutUrl = createPageUrl('SubscriptionCheckout') + `?membership_id=${membership.id}`;
      console.log('🔄 Redirection vers:', checkoutUrl);
      
      onOpenChange(false);
      
      // Utiliser window.location pour forcer la navigation
      window.location.href = checkoutUrl;
      
    } catch (error) {
      console.error('❌ Erreur création abonnement:', error);
      toast({ title: "Erreur", description: error.message || "Impossible de créer l'abonnement", variant: "destructive" });
      setLoading(false);
    }
  };



  const planColors = {
    free: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-600' },
    gold: { bg: 'bg-stone-50', border: 'border-stone-300', text: 'text-stone-700', badge: 'bg-stone-400' },
    premium: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-600' }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Choose Your Membership Plan
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {plans.map((plan) => {
            const planType = plan.code.toLowerCase().includes('premium') ? 'premium' : 
                            plan.code.toLowerCase().includes('gold') ? 'gold' : 'free';
            const colors = planColors[planType];
            
            return (
              <Card key={plan.id} className={`${colors.border} border-2 hover:shadow-lg transition-shadow`}>
                <CardHeader className={colors.bg}>
                  <Badge className={`${colors.badge} text-white w-fit`}>
                    {plan.name}
                  </Badge>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">{plan.price?.toLocaleString()} {plan.currency}</div>
                    <div className="text-sm text-stone-500">/ {plan.billing_cycle}</div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {(plan.features || []).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={() => !loading && handleSelectPlan(plan)}
                    className={`w-full mt-6 ${colors.badge} hover:opacity-90`}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}