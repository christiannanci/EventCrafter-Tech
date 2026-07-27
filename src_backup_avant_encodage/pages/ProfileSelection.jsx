import React, { useState } from 'react';
import { supabase } from '@/api/apiClient';
import { VendorProfile, ClientProfile } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Store, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ProfileSelection() {
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const { toast } = useToast();

  // Vérifier si l'utilisateur a déjà un profil
  React.useEffect(() => {
    const checkProfiles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setChecking(false);
          return;
        }

        const vendorProfiles = await VendorProfile.filter({ user_id: user.id });
        const clientProfiles = await ClientProfile.filter({ user_id: user.id });

        // Si l'utilisateur a déjà un profil, rediriger vers le bon dashboard
        if (vendorProfiles.length > 0) {
          window.location.href = '/VendorDashboard';
          return;
        }
        if (clientProfiles.length > 0) {
          window.location.href = '/ClientDashboard';
          return;
        }

        // Sinon, continuer avec la sélection
        setChecking(false);
      } catch (e) {
        console.error('Error checking profiles:', e);
        setChecking(false);
      }
    };
    checkProfiles();
  }, []);

  // Client form
  const [clientData, setClientData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    whatsapp: ""
  });

  // Vendor form
  const [vendorData, setVendorData] = useState({
    business_name: "",
    phone: "",
    city: ""
  });

  const handleCreateProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      if (selectedType === 'client') {
        await ClientProfile.create({
          id: crypto.randomUUID(),
          user_id: user.id,
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          phone: clientData.phone,
          whatsapp: clientData.whatsapp || clientData.phone,
          contact_email: user.email,
          verification_status: 'unverified',
          account_balance: 0,
          created_by_id: user.id,
          created_by: user.email,
        });

        toast({ title: "Profil Client créé!", description: "Bienvenue sur EventCrafter" });
        window.location.href = '/ClientDashboard';
      } else {
        await VendorProfile.create({
          id: crypto.randomUUID(),
          user_id: user.id,
          business_name: vendorData.business_name,
          phone: vendorData.phone,
          city: vendorData.city,
          plan: 'free',
          subscription_status: 'active',
          verification_status: 'unverified',
          account_balance: 0,
          created_by_id: user.id,
          created_by: user.email,
        });

        toast({ title: "Profil Vendeur créé!", description: "Commencez à lister vos services" });
        window.location.href = '/VendorDashboard';
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({ title: "Erreur", description: error.message || "Impossible de créer le profil", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-stone-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-stone-900 mb-2">Bienvenue sur EventCrafter! ??</h1>
            <p className="text-stone-600">Choisissez votre type de compte pour commencer</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className={`cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                selectedType === 'client' ? 'ring-4 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedType('client')}
            >
              <CardHeader className="text-center pb-4">
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  selectedType === 'client' ? 'bg-blue-600' : 'bg-blue-100'
                }`}>
                  <User className={`w-10 h-10 ${selectedType === 'client' ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <CardTitle className="text-2xl">Client</CardTitle>
                <CardDescription className="text-base mt-2">
                  Je cherche des prestataires pour mon événement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-stone-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Parcourir les services disponibles</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Gérer vos événements et réservations</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Paiements sécurisés avec escrow</span>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                selectedType === 'vendor' ? 'ring-4 ring-rose-500 bg-rose-50' : ''
              }`}
              onClick={() => setSelectedType('vendor')}
            >
              <CardHeader className="text-center pb-4">
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  selectedType === 'vendor' ? 'bg-rose-600' : 'bg-rose-100'
                }`}>
                  <Store className={`w-10 h-10 ${selectedType === 'vendor' ? 'text-white' : 'text-rose-600'}`} />
                </div>
                <CardTitle className="text-2xl">Prestataire</CardTitle>
                <CardDescription className="text-base mt-2">
                  Je propose mes services événementiels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-stone-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Créer votre catalogue de services</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Recevoir des demandes de clients</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Gérer vos contrats et paiements</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Button
              size="lg"
              disabled={!selectedType}
              onClick={() => setStep(2)}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white px-8"
            >
              Continuer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>
            {selectedType === 'client' ? 'Créer votre profil Client' : 'Créer votre profil Prestataire'}
          </CardTitle>
          <CardDescription>
            Complétez quelques informations pour commencer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedType === 'client' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={clientData.first_name}
                  onChange={(e) => setClientData({...clientData, first_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  value={clientData.last_name}
                  onChange={(e) => setClientData({...clientData, last_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  placeholder="+237 6..."
                  value={clientData.phone}
                  onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp (optionnel)</Label>
                <Input
                  id="whatsapp"
                  placeholder="+237 6..."
                  value={clientData.whatsapp}
                  onChange={(e) => setClientData({...clientData, whatsapp: e.target.value})}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nom de l'entreprise *</Label>
                <Input
                  id="business_name"
                  value={vendorData.business_name}
                  onChange={(e) => setVendorData({...vendorData, business_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  placeholder="+237 6..."
                  value={vendorData.phone}
                  onChange={(e) => setVendorData({...vendorData, phone: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Input
                  id="city"
                  placeholder="Douala, Yaoundé..."
                  value={vendorData.city}
                  onChange={(e) => setVendorData({...vendorData, city: e.target.value})}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Retour
            </Button>
            <Button
              onClick={handleCreateProfile}
              disabled={loading || (selectedType === 'client'
                ? !clientData.first_name || !clientData.last_name || !clientData.phone
                : !vendorData.business_name || !vendorData.phone || !vendorData.city
              )}
              className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
            >
              {loading ? 'Création...' : 'Créer mon profil'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}