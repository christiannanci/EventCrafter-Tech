import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, MapPin, CheckCircle2, Loader2, LogIn } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useLanguage } from '@/components/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { NotificationService } from '@/components/NotificationService';

export default function PostRequest() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [date, setDate] = useState();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [serviceTypes, setServiceTypes] = useState([]);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Charger tous les ServiceTypes
        const types = await base44.entities.ServiceType.list();
        setServiceTypes(types);
      } catch (e) {
        setUser(null);
      } finally {
        setChecking(false);
      }
    };
    checkAuth();
  }, []);

  const onSubmit = async (data) => {
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl('PostRequest'));
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Lead.create({
        client_id: user.id,
        client_name: user.first_name || user.email,
        event_type: data.event_type,
        service_category: data.service_category,
        event_date: date ? date.toISOString() : null,
        location: data.location,
        budget: data.budget,
        description: data.description,
        status: 'open'
      });

      // Notifier les fournisseurs correspondants
      const [allServices, allVendorProfiles, allMemberships] = await Promise.all([
        base44.entities.Service.list(),
        base44.entities.VendorProfile.list(),
        base44.entities.Membership.list()
      ]);

      // Filtrer les services qui correspondent à la catégorie
      const matchingServices = allServices.filter(service => {
        const categoryMatch = data.service_category === 'All' || service.category === data.service_category;
        return categoryMatch;
      });

      // Obtenir les IDs uniques des fournisseurs
      const vendorIds = [...new Set(matchingServices.map(s => s.planner_id))];

      // Notifier chaque fournisseur en respectant les limites
      for (const vendorId of vendorIds) {
        const vendorProfile = allVendorProfiles.find(vp => vp.user_id === vendorId);
        if (!vendorProfile) continue;

        // Vérifier l'abonnement actif
        const activeMemberships = allMemberships.filter(m => 
          m.user_id === vendorId && 
          m.status === 'active' &&
          new Date(m.end_date) > new Date()
        );

        let membershipStatus = 'free';
        if (activeMemberships.length > 0) {
          const membershipTypeCode = activeMemberships[0].membership_type_code?.toLowerCase() || '';
          if (membershipTypeCode.includes('premium')) {
            membershipStatus = 'premium';
          } else if (membershipTypeCode.includes('gold')) {
            membershipStatus = 'gold';
          }
        }

        // Compter les notifications post_request reçues ce mois
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const existingNotifications = await base44.entities.Notification.filter({
          user_id: vendorId,
          type: 'post_request'
        });

        const monthlyCount = existingNotifications.filter(n => 
          new Date(n.created_date) >= startOfMonth
        ).length;

        // Déterminer si on peut envoyer la notification
        let canNotify = false;
        if (membershipStatus === 'free') {
          canNotify = monthlyCount < 10;
        } else if (membershipStatus === 'premium' || membershipStatus === 'gold') {
          canNotify = true; // Illimité
        }

        if (canNotify) {
          const notifTitle = `Nouvelle demande: ${data.event_type}`;
          const notifMessage = `Un client recherche ${data.service_category} pour un événement le ${date ? format(date, 'dd/MM/yyyy') : 'date TBD'}. Localisation: ${data.location}`;

          // Notification in-app + email (NotificationService gère les deux)
          await NotificationService.sendToVendor({
            vendorId,
            title: notifTitle,
            message: notifMessage,
            type: 'post_request',
            link: '/VendorDashboard'
          });
        }
      }
      
      setSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F9F7F3] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center p-8">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-['Poppins'] font-bold text-[#2C2C2C] mb-2">Connexion requise</h2>
          <p className="text-gray-500 mb-8 font-['Inter']">
            Vous devez être connecté pour publier une demande. Créez un compte ou connectez-vous pour continuer.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>Retour</Button>
            <Button 
              className="bg-[#FF6B35] hover:bg-[#e05a2b]" 
              onClick={() => base44.auth.redirectToLogin(createPageUrl('PostRequest'))}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Se connecter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F9F7F3] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center p-8">
          <div className="w-16 h-16 bg-[#2ECC71]/10 text-[#2ECC71] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-['Poppins'] font-bold text-[#2C2C2C] mb-2">Demande Publiée !</h2>
          <p className="text-gray-500 mb-8 font-['Inter']">
            Votre demande a été envoyée à notre réseau de vendeurs vérifiés. Ils vous contacteront sous peu.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>Retour Accueil</Button>
            <Button className="bg-[#FF6B35] hover:bg-[#e05a2b]" onClick={() => navigate('/ClientDashboard?tab=my_requests')}>Voir Mes Demandes</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F3] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-['Poppins'] font-bold text-[#2C2C2C]">Publier une Demande</h1>
          <p className="text-[#2C2C2C]/70 mt-2 font-['Inter']">Dites-nous ce dont vous avez besoin, nous vous mettrons en relation avec les meilleurs vendeurs.</p>
        </div>

        <Card className="border-[#F4C542]/20 shadow-lg shadow-[#F4C542]/5">
          <CardHeader>
            <CardTitle className="text-[#2C2C2C]">Détails de l'Événement</CardTitle>
            <CardDescription>Remplissez les détails ci-dessous pour obtenir des devis précis.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Type d'Événement</Label>
                  <Select onValueChange={(val) => setValue('event_type', val)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Wedding">Mariage</SelectItem>
                      <SelectItem value="Birthday">Anniversaire</SelectItem>
                      <SelectItem value="Corporate">Événement d'Entreprise</SelectItem>
                      <SelectItem value="Conference">Conférence</SelectItem>
                      <SelectItem value="Baby Shower">Baby Shower</SelectItem>
                      <SelectItem value="Graduation">Remise de Diplôme</SelectItem>
                      <SelectItem value="Religious">Cérémonie Religieuse</SelectItem>
                      <SelectItem value="Funeral">Funérailles</SelectItem>
                      <SelectItem value="Other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Service Nécessaire</Label>
                  <Select onValueChange={(val) => setValue('service_category', val)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Tous les Services (Planification Complète)</SelectItem>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.code_service} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <Label>Date de l'Événement</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd/MM/yyyy") : <span>Choisir une date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Lieu (Ville/Quartier)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                    <Input className="pl-9" placeholder="ex. Douala, Bonapriso" {...register('location', { required: true })} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Budget Estimé</Label>
                <Input placeholder="ex. 100 000 - 200 000 FCFA" {...register('budget')} />
              </div>

              <div className="space-y-2">
                <Label>Description & Exigences</Label>
                <Textarea 
                  placeholder="Décrivez votre vision, nombre d'invités, et exigences spécifiques..." 
                  className="h-32"
                  {...register('description', { required: true })}
                />
              </div>

              <Button type="submit" className="w-full bg-[#FF6B35] hover:bg-[#e05a2b] h-12 text-lg font-['Poppins']" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Publier la Demande
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
