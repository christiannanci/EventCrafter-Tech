import { Service, VendorProfile, ClientProfile, Booking, Event, Conversation, Message, Review, Notification, Membership, Invoice, Region, Departement, Ville, Quartier, Fonction, PlatformFeedback, Contract, Dispute, Lead, Transaction, Payout, Refund, AppUser, Country, ServiceType } from '@/api/entities';
import { base44 } from '@/api/apiClient';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

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
        const types = await ServiceType.list();
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
      await Lead.create({
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
        Service.list(),
        VendorProfile.list(),
        Membership.list()
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

        const existingNotifications = await Notification.filter({
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
          await Notification.create({
            user_id: vendorId,
            title: `Nouvelle demande: ${data.event_type}`,
            message: `Un client recherche ${data.service_category} pour un événement le ${date ? format(date, 'dd/MM/yyyy') : 'date TBD'}. Localisation: ${data.location}`,
            type: 'post_request',
            link: '/VendorDashboard',
            is_read: false
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
          <h2 className="text-2xl font-['Poppins'] font-bold text-[#2C2C2C] mb-2">{t('postRequest.loginRequired')}</h2>
          <p className="text-gray-500 mb-8 font-['Inter']">
            {t('postRequest.loginDesc')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>{t('postRequest.back')}</Button>
            <Button 
              className="bg-[#FF6B35] hover:bg-[#e05a2b]" 
              onClick={() => base44.auth.redirectToLogin(createPageUrl('PostRequest'))}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {t('postRequest.signIn')}
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
          <h2 className="text-2xl font-['Poppins'] font-bold text-[#2C2C2C] mb-2">{t('postRequest.requestPosted')}</h2>
          <p className="text-gray-500 mb-8 font-['Inter']">
            {t('postRequest.requestPostedDesc')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>{t('postRequest.returnHome')}</Button>
            <Button className="bg-[#FF6B35] hover:bg-[#e05a2b]" onClick={() => navigate('/ClientDashboard?tab=my_requests')}>{t('postRequest.viewRequests')}</Button>
          </div>
        </Card>
      </div>
    );
  }

  const eventTypeOptions = [
    { value: 'Wedding', key: 'wedding' },
    { value: 'Birthday', key: 'birthday' },
    { value: 'Corporate', key: 'corporate' },
    { value: 'Conference', key: 'conference' },
    { value: 'Baby Shower', key: 'babyShower' },
    { value: 'Graduation', key: 'graduation' },
    { value: 'Religious', key: 'religious' },
    { value: 'Funeral', key: 'funeral' },
    { value: 'Other', key: 'other' },
  ];

  return (
    <div className="min-h-screen bg-[#F9F7F3] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-['Poppins'] font-bold text-[#2C2C2C]">{t('postRequest.title')}</h1>
          <p className="text-[#2C2C2C]/70 mt-2 font-['Inter']">{t('postRequest.subtitle')}</p>
        </div>

        <Card className="border-[#F4C542]/20 shadow-lg shadow-[#F4C542]/5">
          <CardHeader>
            <CardTitle className="text-[#2C2C2C]">{t('postRequest.eventDetails')}</CardTitle>
            <CardDescription>{t('postRequest.eventDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('postRequest.eventType')}</Label>
                  <Select onValueChange={(val) => setValue('event_type', val)} required>
                    <SelectTrigger>
                      <SelectValue placeholder={t('postRequest.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(`postRequest.eventTypes.${opt.key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('postRequest.serviceNeeded')}</Label>
                  <Select onValueChange={(val) => setValue('service_category', val)} required>
                    <SelectTrigger>
                      <SelectValue placeholder={t('postRequest.selectService')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">{t('postRequest.allServices')}</SelectItem>
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
                  <Label>{t('postRequest.eventDate')}</Label>
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
                        {date ? format(date, "dd/MM/yyyy") : <span>{t('postRequest.pickDate')}</span>}
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
                  <Label>{t('postRequest.location')}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                    <Input className="pl-9" placeholder={t('postRequest.locationPlaceholder')} {...register('location', { required: true })} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('postRequest.budget')}</Label>
                <Input placeholder={t('postRequest.budgetPlaceholder')} {...register('budget')} />
              </div>

              <div className="space-y-2">
                <Label>{t('postRequest.description')}</Label>
                <Textarea 
                  placeholder={t('postRequest.descriptionPlaceholder')} 
                  className="h-32"
                  {...register('description', { required: true })}
                />
              </div>

              <Button type="submit" className="w-full bg-[#FF6B35] hover:bg-[#e05a2b] h-12 text-lg font-['Poppins']" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {t('postRequest.postRequest')}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
