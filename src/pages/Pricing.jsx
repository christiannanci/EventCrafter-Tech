import { Service, VendorProfile, ClientProfile, Booking, Event, Conversation, Message, Review, Notification, Membership, MembershipType, Invoice, Region, Departement, Ville, Quartier, Fonction, PlatformFeedback, Contract, Dispute, Lead, Transaction, Payout, Refund, AppUser, Country, ServiceType } from '@/api/entities';
import { base44 } from '@/api/apiClient';
import React, { useState, useEffect } from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, Star, Zap, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { useLocationContext } from '@/components/LocationContext';
import { useLanguage } from '@/components/LanguageContext';

export default function Pricing() {
  const { formatPrice } = useLocationContext();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [plans, setPlans] = useState([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Fetch Membership Types dynamically
        const types = await MembershipType.list();
        // Fallback to static if empty or error (optional, but good for stability during dev)
        if (types.length > 0) {
            setPlans(types.map(t => ({
                id: t.code,
                name: t.name,
                price: t.price,
                description: t.description || t.legal_terms, // Using legal terms/desc as subtitle
                features: t.features || [],
                icon: t.code === 'gold' ? Zap : t.code === 'premium' ? Star : Shield,
                popular: t.code === 'premium'
            })));
        } else {
             // Default static plans if entity is empty
             setPlans([
                { id: "free", name: t('pricing.fallbackBasicName'), price: 0, description: t('pricing.fallbackBasicDesc'), features: [t('pricing.fallbackBasicFeature')], icon: Shield },
                { id: "premium", name: t('pricing.fallbackPremiumName'), price: 10000, description: t('pricing.fallbackPremiumDesc'), features: [t('pricing.fallbackPremiumFeature')], icon: Star, popular: true },
                { id: "gold", name: t('pricing.fallbackGoldName'), price: 25000, description: t('pricing.fallbackGoldDesc'), features: [t('pricing.fallbackGoldFeature')], icon: Zap }
             ]);
        }

        // Fetch vendor profile
        const profiles = await VendorProfile.list();
        const myProfile = profiles.find(p => p.user_id === currentUser.id);
        if (myProfile) {
          setCurrentPlan(myProfile.plan);
        }
      } catch (e) {
        // Not logged in or error
      }
    };
    init();
  }, []);

  const handleSubscribe = async (plan, price) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    // Mock Payment Process
    toast({
      title: t('pricing.processingPayment'),
      description: t('pricing.processingDesc'),
    });

    setTimeout(async () => {
      try {
        if (price === 0) {
             // Free plan flow (Immediate activation)
             const profiles = await VendorProfile.list();
             const myProfile = profiles.find(p => p.user_id === user.id);
             
             if (myProfile) {
               await VendorProfile.update(myProfile.id, {
                 plan: plan,
                 subscription_status: "active"
               });
             } else {
               await VendorProfile.create({
                 user_id: user.id,
                 plan: plan,
                 subscription_status: "active",
                 business_name: user.first_name + "'s Business",
                 phone: ""
               });
             }
             setCurrentPlan(plan);
             toast({ title: t('pricing.planUpdated'), description: t('pricing.freePlanDesc') });
             return;
        }

        const startDate = new Date();
        const endDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
        
        // 1. Create Membership (Pending)
        const membership = await Membership.create({
            user_id: user.id,
            membership_type_code: plan,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            duration_days: 30,
            amount: price,
            status: "pending_contract",
            auto_renew: true
        });

        // 2. Generate Contract
        const contract = await Contract.create({
             contract_number: `CTR-SUB-${Date.now()}`,
             membership_id: membership.id,
             type: 'subscription',
             status: 'draft',
             contract_amount: price,
             jurisdiction_clause: "Les tribunaux compétents seront ceux du siège social de la plateforme pour tout litige relatif à l'abonnement.",
             cancellation_terms: "L'abonnement peut être résilié à tout moment. Tout mois entamé est dû.",
             commission_clause: "Non applicable pour les abonnements."
        });

        // 3. Generate Invoice
        const invoice = await Invoice.create({
             invoice_number: `INV-SUB-${Date.now()}`,
             membership_id: membership.id,
             contract_id: contract.id,
             type: 'subscription',
             amount: price,
             status: 'issued',
             issued_date: startDate.toISOString(),
             due_date: startDate.toISOString(),
             recipient_id: user.id,
             items: [{
                 description: `${plan} Plan Subscription (30 Days)`,
                 quantity: 1,
                 unit_price: price,
                 total: price
             }]
        });

        // 4. Link everything to membership
        await Membership.update(membership.id, {
            contract_id: contract.id,
            invoice_id: invoice.id
        });

        // 5. Redirect to Checkout
        navigate(`/SubscriptionCheckout?membership_id=${membership.id}`);

      } catch (error) {
        console.error(error);
        toast({
          title: t('pricing.error'),
          description: t('pricing.errorDesc'),
          variant: "destructive"
        });
      }
    }, 1500);
  };

  // Plans are now fetched dynamically in useEffect

  return (
    <div className="min-h-screen bg-stone-50 py-20 px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-4">{t('pricing.title')}</h1>
        <p className="text-xl text-stone-500">
          {t('pricing.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative flex flex-col ${plan.popular ? 'border-rose-500 border-2 shadow-xl' : 'hover:shadow-lg transition-shadow'}`}>
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                {t('pricing.mostPopular')}
              </div>
            )}
            <CardHeader>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.popular ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-600'}`}>
                <plan.icon className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold text-stone-900">{formatPrice(plan.price)}</span>
                <span className="text-stone-500 text-sm font-medium"> {t('pricing.perMonth')}</span>
              </div>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-stone-600">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className={`w-full ${plan.popular ? 'bg-rose-600 hover:bg-rose-700' : 'bg-stone-900 hover:bg-stone-800'}`}
                variant={currentPlan === plan.id ? "outline" : "default"}
                onClick={() => handleSubscribe(plan.id, plan.price)}
                disabled={currentPlan === plan.id}
              >
                {currentPlan === plan.id ? t('pricing.currentPlan') : `${t('pricing.upgradeTo')} ${plan.name}`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
