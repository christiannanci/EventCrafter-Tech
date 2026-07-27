import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, Star, Zap, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { useLocationContext } from '@/components/LocationContext';

export default function Pricing() {
  const { formatPrice } = useLocationContext();
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
        const types = await base44.entities.MembershipType.list();
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
                { id: "free", name: "Basic", price: 0, description: "Essential tools.", features: ["Standard Listing"], icon: Shield },
                { id: "premium", name: "Premium", price: 10000, description: "Better visibility.", features: ["Featured Listing"], icon: Star, popular: true },
                { id: "gold", name: "Gold", price: 25000, description: "VIP treatment.", features: ["Top of Search"], icon: Zap }
             ]);
        }

        // Fetch vendor profile
        const profiles = await base44.entities.VendorProfile.list();
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
      title: "Processing Payment...",
      description: "Please wait while we secure your subscription.",
    });

    setTimeout(async () => {
      try {
        if (price === 0) {
             // Free plan flow (Immediate activation)
             const profiles = await base44.entities.VendorProfile.list();
             const myProfile = profiles.find(p => p.user_id === user.id);
             
             if (myProfile) {
               await base44.entities.VendorProfile.update(myProfile.id, {
                 plan: plan,
                 subscription_status: "active"
               });
             } else {
               await base44.entities.VendorProfile.create({
                 user_id: user.id,
                 plan: plan,
                 subscription_status: "active",
                 business_name: user.first_name + "'s Business",
                 phone: ""
               });
             }
             setCurrentPlan(plan);
             toast({ title: "Plan Updated", description: "You are now on the Free plan." });
             return;
        }

        const startDate = new Date();
        const endDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
        
        // 1. Create Membership (Pending)
        const membership = await base44.entities.Membership.create({
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
        const contract = await base44.entities.Contract.create({
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
        const invoice = await base44.entities.Invoice.create({
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
        await base44.entities.Membership.update(membership.id, {
            contract_id: contract.id,
            invoice_id: invoice.id
        });

        // 5. Redirect to Checkout
        navigate(`/SubscriptionCheckout?membership_id=${membership.id}`);

      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
    }, 1500);
  };

  // Plans are now fetched dynamically in useEffect

  return (
    <div className="min-h-screen bg-stone-50 py-20 px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-stone-500">
          Unlock more business with our tailored subscription tiers. 
          Upgrade anytime to reach more clients.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative flex flex-col ${plan.popular ? 'border-rose-500 border-2 shadow-xl' : 'hover:shadow-lg transition-shadow'}`}>
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                Most Popular
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
                <span className="text-stone-500 text-sm font-medium"> / month</span>
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
                {currentPlan === plan.id ? "Current Plan" : `Upgrade to ${plan.name}`}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}