import React, { useState, useEffect } from 'react';
import { base44, supabase } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Crown,
  Eye,
  EyeOff,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Store,
  FileSignature,
  Pencil,
  Package,
  Wallet,
  Clock,
  XCircle,
  Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import VendorProfileForm from "@/components/dashboard/VendorProfileForm";
import VendorBankAccountManager from "@/components/dashboard/VendorBankAccountManager";
import RateClientDialog from "@/components/dashboard/RateClientDialog";
import SuggestServiceTypeDialog from "@/components/SuggestServiceTypeDialog";
import DisputeManager from "@/components/dashboard/DisputeManager";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";
import MembershipUpgradeDialog from "@/components/dashboard/MembershipUpgradeDialog";
import VendorReviewsDisplay from "@/components/dashboard/VendorReviewsDisplay";
import ContractFlow from '@/components/dashboard/ContractFlow';
import { useVendorData } from '@/components/dashboard/hooks/useVendorData';
import StatCard from '@/components/dashboard/StatCard';
import BookingTable from '@/components/dashboard/BookingTable';
import LeadsSection from '@/components/dashboard/LeadsSection';
import BookingFilters from '@/components/dashboard/BookingFilters';
import MesDossiers from '@/components/dashboard/MesDossiers';
import { NotificationService } from '@/components/NotificationService';
import { serviceSchema, validateData } from '@/components/ValidationSchemas';
import { PermissionGuard } from '@/components/PermissionGuard';
import PlatformFeedbackPrompt from '@/components/PlatformFeedbackPrompt';
import UpgradePromptSystem from '@/components/UpgradePromptSystem';
import { checkAndGrantAutoRewards } from '@/components/RewardSystem';
import VerificationGuard from '@/components/VerificationGuard';
import CulturalBadgeManager from '@/components/dashboard/CulturalBadgeManager';
import LeadCreditPacks from '@/components/dashboard/LeadCreditPacks';
import SmartMatchBoost from '@/components/dashboard/SmartMatchBoost';
import { checkPerformanceReward } from '@/components/PerformanceRewardSystem';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { withRateLimit } from '@/components/RateLimiter';
import { compressImage, isImage, formatFileSize } from '@/components/ImageCompressor';
import { generateEntityCode, generateSlug } from '@/components/SecurityUtils';
import { useLanguage } from '@/components/LanguageContext';

export default function VendorDashboard() {
  const [user, setUser] = useState(null);
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false);
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [availableFunctions, setAvailableFunctions] = useState([]);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [selectedDisputeBooking, setSelectedDisputeBooking] = useState(null);
  const [selectedContractBooking, setSelectedContractBooking] = useState(null);
  const [isContractFlowOpen, setIsContractFlowOpen] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [bookingFilters, setBookingFilters] = useState({ 
    search: '', 
    status: 'all', 
    dateSort: 'newest', 
    amountSort: 'none' 
  });
  const ITEMS_PER_PAGE = 6;

  const {
    vendorProfile,
    myServices,
    bookings,
    leads,
    serviceTypes,
    allFunctions,
    membershipStatus,
    analytics,
    notificationCount,
    notificationLimit,
    loading,
    error,
    refetch,
    setMyServices,
    setBookings,
    setLeads
  } = useVendorData(user);

  const [newService, setNewService] = useState({
    title: "",
    description: "",
    category: "",
    service_type_code: "",
    function_codes: [],
    supported_event_types: [],
    price_min: "",
    availability_level: "ville",
    availability_code: "",
    location: "",
    city: "",
    region: "",
    neighborhood_code: "",
    address_details: "",
    image_url: "",
    description_details: "",
    description_terms: "",
    cultural_zones: [],
    cultural_compliance_details: "",
    spoken_languages: [],
    religious_compatibility: [],
    diaspora_ready: false
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [verifMessage, setVerifMessage] = useState("");
  const [sendingVerif, setSendingVerif] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(null);

  const getVerifStatusInfo = (status) => {
    const info = {
      unverified: { icon: XCircle, color: "text-gray-500", bg: "bg-gray-100", text: t('vendor.unverified') },
      pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", text: t('vendor.pending') },
      verified: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", text: t('vendor.verified') },
      rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", text: t('vendor.rejected') }
    };
    return info[status] || info.unverified;
  };

  const handleSendVerifRequest = async () => {
    if (!verifMessage.trim()) {
      toast({ title: "Message requis", description: "Veuillez expliquer votre demande.", variant: "destructive" });
      return;
    }
    if (!vendorProfile?.verification_docs?.length) {
      toast({ title: "Documents requis", description: "Veuillez télécharger au moins un document.", variant: "destructive" });
      return;
    }
    setSendingVerif(true);
    try {
      const requestCode = `VER-VENDOR-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;
      await base44.entities.VerificationRequest.create({
        request_code: requestCode,
        client_id: user.id,
        profile_id: vendorProfile.id,
        request_type: 'business',
        status: 'pending',
        client_message: verifMessage
      });
      await base44.entities.VendorProfile.update(vendorProfile.id, { verification_status: 'pending' });
      await NotificationService.sendToAdmins({
        title: "Nouvelle demande de vérification",
        message: `${vendorProfile.business_name || user.full_name} a demandé la vérification de son compte prestataire`,
        type: "system",
        link: "/AdminDashboard"
      });
      toast({ title: "Demande envoyée", description: "Un administrateur vous contactera sous peu." });
      setVerifMessage("");
      refetch();
    } catch (error) {
      console.error("Error sending verification request:", error);
      toast({ title: "Erreur", description: "Impossible d'envoyer la demande.", variant: "destructive" });
    } finally {
      setSendingVerif(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        checkAndGrantAutoRewards(currentUser.id).catch(err => 
          console.warn('Auto rewards check failed:', err)
        );
        
        checkPerformanceReward(currentUser.id).catch(err =>
          console.warn('Performance reward check failed:', err)
        );
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    init();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setTimeout(() => {
        const tabTrigger = document.querySelector(`[value="${tabParam}"]`);
        if (tabTrigger) {
          tabTrigger.click();
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (!user || !myServices) return;

    const leadChannel = supabase
      .channel('vendor-leads-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead' }, (payload) => {
        const newLead = payload.new;
        if (newLead.status === 'open') {
          const categoryMatch = newLead.service_category === 'All' ||
                               myServices.some(s => s.category === newLead.service_category);
          if (categoryMatch) {
            if (membershipStatus === 'free') {
              const startOfMonth = new Date();
              startOfMonth.setDate(1);
              startOfMonth.setHours(0, 0, 0, 0);
              setLeads(prev => {
                const leadsThisMonth = prev.filter(lead =>
                  new Date(lead.created_date) >= startOfMonth
                );
                if (leadsThisMonth.length < 10) {
                  return [newLead, ...prev];
                }
                return prev;
              });
            } else {
              setLeads(prev => [newLead, ...prev]);
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadChannel);
    };
  }, [user, myServices, membershipStatus]);

  useEffect(() => {
    if (!user) return;

    const bookingChannel = supabase
      .channel('vendor-bookings-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booking' }, async (payload) => {
        const newBooking = payload.new;
        if (newBooking.planner_id === user.id) {
          setBookings(prev => [newBooking, ...prev]);
          await NotificationService.sendToVendor({
            vendorId: user.id,
            title: "Nouvelle Réservation",
            message: `Vous avez recu une nouvelle reservation de ${newBooking.client_name || 'un client'} pour le ${new Date(newBooking.event_date).toLocaleDateString('fr-FR')}. Montant: ${newBooking.total_amount?.toLocaleString() || 'a negocier'} FCFA`,
            type: "booking",
            link: "/VendorDashboard?tab=bookings_received"
          });
          toast({ 
            title: "🎉 Nouvelle Réservation !",
            description: `${newBooking.client_name || 'Un client'} a reserve pour le ${new Date(newBooking.event_date).toLocaleDateString('fr-FR')}`
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'booking' }, (payload) => {
        const updatedBooking = payload.new;
        if (updatedBooking.planner_id === user.id) {
          setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, [user]);

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadingMedia(true);
      
      await withRateLimit('UPLOAD_FILE', user.id, async () => {
        let fileToUpload = file;
      
        if (isImage(file)) {
          const originalSize = file.size;
          toast({ title: "Compression de l'image..." });
          
          fileToUpload = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.85,
            outputFormat: 'webp'
          });
          
          const compressedSize = fileToUpload.size;
          const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);
          
          toast({ 
            title: `Image optimisee (${savedPercent}% réduit)`,
            description: `${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}`
          });
        }
      
        const result = await UploadFile({ file: fileToUpload });
        setNewService({...newService, image_url: result.file_url});
        toast({ title: "Image telechargee avec succès" });
        return true;
      });
    } catch (error) {
      toast({ 
        title: error.message.includes('Rate limit') ? "⚠️ Limite atteinte" : "Echec du telechargement",
        description: error.message.includes('Rate limit') ? error.message : undefined,
        variant: "destructive" 
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadingVideo(true);
      const result = await UploadFile({ file });
      setNewService({...newService, video_url: result.file_url});
      toast({ title: "Video telechargee avec succès" });
    } catch (error) {
      toast({ 
        title: "Echec du telechargement", 
        description: "La video n'a pas pu etre telechargee. Verifiez votre connexion.",
        variant: "destructive" 
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCreateService = async () => {
    try {
      const dataToValidate = {
        title: newService.title,
        description: newService.description,
        category: newService.category,
        price_min: parseFloat(newService.price_min),
        availability_level: newService.availability_level,
        availability_code: newService.availability_code,
        city: newService.city,
        region: newService.region,
        neighborhood_code: newService.neighborhood_code,
        supported_event_types: newService.supported_event_types || []
      };

      const validation = validateData(serviceSchema, dataToValidate);
      if (!validation.success) {
        const firstError = Object.values(validation.errors)[0];
        toast({ 
          title: "Validation échouée", 
          description: firstError,
          variant: "destructive" 
        });
        return;
      }
      
      if (editingService) {
        await base44.entities.Service.update(editingService.id, {
          ...newService,
          price_min: parseFloat(newService.price_min)
        });
        toast({ title: "Service modifie avec succes" });
      } else {
        await base44.entities.Service.create({
          ...newService,
          service_code: generateEntityCode('SERVICE'),
          slug: generateSlug(newService.title),
          price_min: parseFloat(newService.price_min),
          planner_id: user.id
        });
        toast({ title: "Service cree avec succes" });
      }
      
      setIsNewServiceOpen(false);
      setEditingService(null);
      setNewService({ 
          title: "", description: "", description_details: "", description_terms: "",
          category: "", service_type_code: "", function_codes: [], supported_event_types: [], price_min: "", 
          availability_level: "ville", availability_code: "",
          location: "", city: "", region: "", neighborhood_code: "", 
          address_details: "", image_url: "",
          cultural_zones: [], cultural_compliance_details: "",
          spoken_languages: [], religious_compatibility: [], diaspora_ready: false
      });
      refetch();
    } catch (error) {
      console.error("Error creating/updating service", error);
      toast({ 
        title: "Erreur de sauvegarde", 
        description: error.message || "Le service n'a pas pu etre sauvegarde.",
        variant: "destructive" 
      });
    }
  };

  const openEditService = (service) => {
    setEditingService(service);
    setNewService({
      title: service.title || "",
      description: service.description || "",
      category: service.category || "",
      service_type_code: service.service_type_code || "",
      function_codes: service.function_codes || [],
      supported_event_types: service.supported_event_types || [],
      price_min: service.price_min || "",
      availability_level: service.availability_level || "ville",
      availability_code: service.availability_code || "",
      location: service.location || "",
      city: service.city || "",
      region: service.region || "",
      neighborhood_code: service.neighborhood_code || "",
      address_details: service.address_details || "",
      image_url: service.image_url || "",
      description_details: service.description_details || "",
      description_terms: service.description_terms || "",
      cultural_zones: service.cultural_zones || [],
      cultural_compliance_details: service.cultural_compliance_details || "",
      spoken_languages: service.spoken_languages || [],
      religious_compatibility: service.religious_compatibility || [],
      diaspora_ready: service.diaspora_ready || false
    });
    
    const selectedType = serviceTypes.find(t => t.code_service === service.service_type_code);
    if (selectedType) {
      setAvailableFunctions(allFunctions.filter(f => f.service_type_code === selectedType.code_service));
    }
    
    setIsNewServiceOpen(true);
  };

  const updateBookingStatus = async (id, status) => {
    try {
      await base44.entities.Booking.update(id, { status });
      
      if (status === 'completed') {
          const txs = await base44.entities.Transaction.list();
          const tx = txs.find(t => t.reference_id === id && t.status === 'escrow_held');
          
          if (tx) {
              await base44.entities.Transaction.update(tx.id, { 
                  status: 'released',
                  description: tx.description + " (Released)" 
              });
              
              await NotificationService.sendToVendor({
                  vendorId: user.id,
                  title: "Fonds Liberes",
                  message: "L'evenement est termine. Les fonds ont ete liberees vers votre portefeuille.",
                  type: "payment",
                  link: "/VendorDashboard"
              });
          }
      }
      
      refetch();
      toast({ title: "Statut mis a jour" });
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Erreur de mise a jour", 
        description: "Impossible de modifier le statut. Reessayez.",
        variant: "destructive" 
      });
    }
  };

  const deleteService = async (id) => {
    if(confirm("Etes-vous sur de vouloir supprimer ce service ?")) {
      try {
        const services = await base44.entities.Service.list();
        const service = services.find(s => s.id === id);
        
        if (!service) {
          throw new Error("Service introuvable");
        }

        const canDelete = await PermissionGuard.canDeleteService(service);
        if (!canDelete) {
          throw new Error("Vous n'avez pas la permission de supprimer ce service");
        }

        await base44.entities.Service.delete(id);
        toast({ title: "Service supprime avec succes" });
        refetch();
      } catch (error) {
        toast({ 
          title: "Echec de suppression", 
          description: error.message || "Le service n'a pas pu etre supprime.",
          variant: "destructive" 
        });
      }
    }
  };

  // Masquer / afficher une offre (controle vendeur, independant de la suspension admin)
  const toggleServiceVisibility = async (service) => {
    setTogglingVisibility(service.id);
    try {
      const newHiddenState = !service.is_hidden;
      await base44.entities.Service.update(service.id, { is_hidden: newHiddenState });
      toast({
        title: newHiddenState ? "Offre masquée" : "Offre affichée",
        description: newHiddenState
          ? "Cette offre n'apparaît plus dans le marché."
          : "Cette offre est de nouveau visible sur le marché."
      });
      refetch();
    } catch (error) {
      console.error("Toggle visibility error", error);
      toast({ title: "Erreur", description: "Impossible de modifier la visibilité.", variant: "destructive" });
    } finally {
      setTogglingVisibility(null);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: "bg-stone-100 text-stone-800",
      negotiating: "bg-blue-100 text-blue-800",
      offer_submitted: "bg-purple-100 text-purple-800",
      draft: "bg-gray-100 text-gray-800",
      contract_pending: "bg-amber-100 text-amber-800",
      awaiting_payment: "bg-orange-100 text-orange-800",
      confirmed: "bg-emerald-100 text-emerald-800",
      in_progress: "bg-indigo-100 text-indigo-800",
      warranty_period: "bg-teal-100 text-teal-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      disputed: "bg-rose-100 text-rose-800"
    };

    const labels = {
      contract_pending: "Waiting Signature",
      awaiting_payment: "Waiting Payment",
      in_progress: "In Progress",
      delivered: "Delivered (Wait Recept.)",
      warranty_period: "Warranty",
      disputed: "In Dispute"
    };

    return (
      <Badge className={styles[status] || "bg-gray-100"}>
        {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-900 mb-2">Erreur de Chargement</h3>
          <p className="text-stone-600 mb-4">{error}</p>
          <Button onClick={refetch} className="bg-rose-600 hover:bg-rose-700">
            Ressayer
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <PlatformFeedbackPrompt user={user} userRole="provider" />
      
      <UpgradePromptSystem 
        vendorProfile={vendorProfile}
        onUpgradeClick={() => setIsMembershipDialogOpen(true)}
      />
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-3xl font-bold text-stone-900">{t('vendorHeader.dashboardTitle')}</h1>
            <Badge 
              className={`cursor-pointer hover:opacity-80 transition-opacity shrink-0 ${
                membershipStatus === 'premium' ? 'bg-rose-600 text-white' :
                membershipStatus === 'gold' ? 'bg-stone-400 text-white' :
                'bg-green-600 text-white'
              }`}
              onClick={() => setIsMembershipDialogOpen(true)}
            >
              <Crown className="w-3 h-3 mr-1" />
              {membershipStatus.charAt(0).toUpperCase() + membershipStatus.slice(1)}
            </Badge>
          </div>
          <p className="text-stone-500 text-sm">{t('vendorHeader.welcomePrefix')} {user.first_name || user.email}</p>
          
          {membershipStatus === 'free' && (
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-stone-600">
                  {t('vendorHeader.requestsThisMonth')}
                </span>
                <span className={`text-sm font-bold ${notificationCount >= 10 ? 'text-red-600' : 'text-green-600'}`}>
                  {notificationCount}/10
                </span>
              </div>
              <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    notificationCount >= 10 ? 'bg-red-500' :
                    notificationCount >= 7 ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((notificationCount / 10) * 100, 100)}%` }}
                />
              </div>
              {notificationCount >= 7 && notificationCount < 10 && (
                <p className="text-xs text-orange-600 mt-1">
                  Plus que {10 - notificationCount} demande{10 - notificationCount > 1 ? 's' : ''} disponible{10 - notificationCount > 1 ? 's' : ''}
                </p>
              )}
              {notificationCount >= 10 && (
                <p className="text-xs text-red-600 mt-1">
                  {t('vendorHeader.limitReachedShort')}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            className="hidden md:flex"
            onClick={() => setIsMembershipDialogOpen(true)}
          >
            <Crown className="w-4 h-4 mr-2 text-amber-500" />
            {membershipStatus === 'premium' ? t('vendor.premiumPlan') : membershipStatus === 'gold' ? t('vendor.goldPlan') : t('vendor.upgradeShort')}
          </Button>
          <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('vendor.listNewService')}</span>
                <span className="sm:hidden">{t('vendor.createOfferShort')}</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingService ? "Modifier le Service" : "Creer une Offre de Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto max-h-[70vh] px-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-600">Titre du Service</label>
                <Input placeholder="ex. Organisation de Mariage de Luxe" value={newService.title} onChange={e => setNewService({...newService, title: e.target.value})} />
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Categorie</label>
                  <Select value={newService.category} onValueChange={val => {
                    const selectedType = serviceTypes.find(t => t.name === val);
                    setNewService({...newService, category: val, service_type_code: selectedType ? selectedType.code_service : ""});
                    if (selectedType) setAvailableFunctions(allFunctions.filter(f => f.service_type_code === selectedType.code_service));
                    else setAvailableFunctions([]);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choisir categorie" /></SelectTrigger>
                    <SelectContent>
                      {serviceTypes.length > 0 ? serviceTypes.map(t => (<SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)) : (<SelectItem value="Event Planner">Event Planner</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {availableFunctions.length > 0 && (
                    <div className="mt-2 space-y-2 border rounded-md p-2 max-h-40 overflow-y-auto">
                      <label className="text-xs font-medium text-stone-500 block mb-1">Specialites</label>
                      {availableFunctions.map(func => (
                        <div key={func.id} className="flex items-center space-x-2">
                          <input type="checkbox" id={`func-${func.code}`} checked={newService.function_codes?.includes(func.code)} onChange={(e) => { const checked = e.target.checked; setNewService(prev => { const current = prev.function_codes || []; if (checked) return {...prev, function_codes: [...current, func.code]}; return {...prev, function_codes: current.filter(c => c !== func.code)}; }); }} className="h-4 w-4 rounded border-gray-300 text-rose-600" />
                          <label htmlFor={`func-${func.code}`} className="text-sm text-stone-700 cursor-pointer">{func.name}</label>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end mt-1">
                    <SuggestServiceTypeDialog onSubmitted={() => toast({ title: "Submitted" })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Types d'evenements Supportes</label>
                  <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                    {["Wedding","Birthday","Corporate","Conference","Baby Shower","Graduation","Religious","Funeral","Concert","Other"].map(eventType => (
                      <div key={eventType} className="flex items-center space-x-2">
                        <input type="checkbox" id={`event-${eventType}`} checked={newService.supported_event_types?.includes(eventType)} onChange={(e) => { const checked = e.target.checked; setNewService(prev => { const current = prev.supported_event_types || []; if (checked) return {...prev, supported_event_types: [...current, eventType]}; return {...prev, supported_event_types: current.filter(t => t !== eventType)}; }); }} className="h-4 w-4 rounded border-gray-300 text-rose-600" />
                        <label htmlFor={`event-${eventType}`} className="text-xs text-stone-700 cursor-pointer">{eventType}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Prix Minimum (FCFA)</label>
                  <Input type="number" placeholder="50000" value={newService.price_min} onChange={e => setNewService({...newService, price_min: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Zone de Disponibilite</label>
                  <Select value={newService.availability_level} onValueChange={val => setNewService({...newService, availability_level: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continent">Continent</SelectItem>
                      <SelectItem value="country">Pays</SelectItem>
                      <SelectItem value="region">Region</SelectItem>
                      <SelectItem value="departement">Departement</SelectItem>
                      <SelectItem value="ville">Ville</SelectItem>
                      <SelectItem value="arrondissement">Arrondissement</SelectItem>
                      <SelectItem value="quartier">Quartier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-600">Code Zone</label>
                  <Input placeholder="ex. LT, DLA, CM" value={newService.availability_code} onChange={e => setNewService({...newService, availability_code: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Ville" value={newService.city} onChange={e => setNewService({...newService, city: e.target.value})} />
                <Input placeholder="Region" value={newService.region} onChange={e => setNewService({...newService, region: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Quartier" value={newService.neighborhood_code} onChange={e => setNewService({...newService, neighborhood_code: e.target.value})} />
                <Input placeholder="Adresse precise" value={newService.address_details} onChange={e => setNewService({...newService, address_details: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-600">Image de Couverture</label>
                <input type="file" id="media-upload" accept="image/*" onChange={handleMediaUpload} className="hidden" />
                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('media-upload').click()} disabled={uploadingMedia}>
                  {uploadingMedia ? "Telechargement..." : newService.image_url ? "Changer l'image" : "Telecharger une image"}
                </Button>
                {newService.image_url && <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Image telechargee</div>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-600">Video de Presentation</label>
                <input type="file" id="video-upload" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('video-upload').click()} disabled={uploadingVideo}>
                  {uploadingVideo ? "Telechargement..." : newService.video_url ? "Changer la video" : "Telecharger une video"}
                </Button>
                {newService.video_url && <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Video telecharge</div>}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-stone-600">Description Generale</label>
                  <Textarea placeholder="Presentez votre service..." className="h-24" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-stone-600">Details & Prestations Incluses</label>
                  <Textarea placeholder="Detaillez ce qui est inclus..." className="h-24" value={newService.description_details} onChange={e => setNewService({...newService, description_details: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-stone-600">Conditions & Prerequis</label>
                  <Textarea placeholder="Conditions importantes..." className="h-24" value={newService.description_terms} onChange={e => setNewService({...newService, description_terms: e.target.value})} />
                </div>
              </div>
              <Button onClick={handleCreateService} className="w-full bg-rose-600">
                {editingService ? "Enregistrer les modifications" : "Creer l'Offre"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedDisputeBooking && (
        <DisputeManager 
            booking={selectedDisputeBooking} 
            currentUser={user}
            onClose={() => { setSelectedDisputeBooking(null); refetch(); }}
        />
      )}

      <MembershipUpgradeDialog 
        open={isMembershipDialogOpen}
        onOpenChange={setIsMembershipDialogOpen}
        currentUser={user}
        onSuccess={refetch}
      />

      <Tabs defaultValue="dossiers" className="w-full">
        <div className="mb-6 overflow-x-auto -mx-4 px-4">
        <TabsList className="w-max min-w-full justify-start bg-stone-100 p-1 gap-0">
          <TabsTrigger value="dossiers" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">{t('vendor.tabDossiers')}</TabsTrigger>
          <TabsTrigger value="listings" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">{t('vendor.tabCatalogue')}</TabsTrigger>
          <TabsTrigger value="leads" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">{t('vendor.tabProspects')}</TabsTrigger>
          <TabsTrigger value="growth" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">{t('vendor.tabCroissance')}</TabsTrigger>
          <TabsTrigger value="availability" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">{t('vendor.tabCalendrier')}</TabsTrigger>
          <TabsTrigger value="settings" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">{t('vendor.tabParametres')}</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="leads">
          <LeadsSection 
            leads={leads}
            loading={loading.leads}
            page={leadsPage}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setLeadsPage}
            membershipStatus={membershipStatus}
            notificationCount={notificationCount}
            user={user}
            onUpgradeClick={() => setIsMembershipDialogOpen(true)}
            vendorProfile={vendorProfile}
            onLeadsUpdate={refetch}
          />
        </TabsContent>

        <TabsContent value="growth">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <CulturalBadgeManager 
                vendorProfile={vendorProfile}
                onUpdate={refetch}
              />
              <SmartMatchBoost 
                vendorProfile={vendorProfile}
                onUpdate={refetch}
              />
            </div>
            
            <LeadCreditPacks
              vendorProfile={vendorProfile}
              currentUser={user}
              onUpdate={refetch}
            />
          </div>
        </TabsContent>

        <TabsContent value="dossiers">
          <MesDossiers 
            vendorId={user?.id}
            vendorProfile={vendorProfile}
            onUpgradeClick={() => setIsMembershipDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="availability">
             <AvailabilityManager user={user} />
        </TabsContent>

        <TabsContent value="settings">
          <div className="max-w-xl space-y-6">
            <VendorProfileForm user={user} initialProfile={vendorProfile} onSave={refetch} />

            {vendorProfile && (() => {
              const statusInfo = getVerifStatusInfo(vendorProfile.verification_status || 'unverified');
              const StatusIcon = statusInfo.icon;
              const canRequest = !vendorProfile.verification_status || vendorProfile.verification_status === 'unverified' || vendorProfile.verification_status === 'rejected';
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-amber-600" />
                          Documents de Verification
                        </CardTitle>
                      </div>
                      <Badge className={`${statusInfo.bg} ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {canRequest ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Expliquez votre demande</label>
                          <Textarea
                            placeholder="Bonjour, je souhaite faire verifier mon entreprise..."
                            value={verifMessage}
                            onChange={(e) => setVerifMessage(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <input
                          type="file"
                          id="settings-verification-docs"
                          multiple
                          accept=".pdf,.doc,.docx,audio/*,video/*,image/*"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;
                            try {
                              toast({ title: "Televersement en cours..." });
                              const results = await Promise.all(files.map(file => UploadFile({ file })));
                              const urls = results.map(r => r.file_url);
                              const currentDocs = vendorProfile.verification_docs || [];
                              await base44.entities.VendorProfile.update(vendorProfile.id, {
                                verification_docs: [...currentDocs, ...urls]
                              });
                              toast({ title: "Documents televerses" });
                              refetch();
                            } catch (error) {
                              toast({ title: "Echec du televersement", variant: "destructive" });
                            }
                          }}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById('settings-verification-docs').click()}
                        >
                          <FileSignature className="w-4 h-4 mr-2" />
                          Telecharger Document
                        </Button>
                        {vendorProfile.verification_docs?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-stone-500">Documents televerses :</p>
                            {vendorProfile.verification_docs.map((doc, i) => (
                              <a key={i} href={doc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-stone-50 rounded hover:bg-stone-100 text-sm">
                                <FileSignature className="w-4 h-4 text-rose-600" />
                                Document {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                        <Button
                          className="w-full bg-rose-600 hover:bg-rose-700"
                          disabled={sendingVerif}
                          onClick={handleSendVerifRequest}
                        >
                          {sendingVerif ? "Envoi en cours..." : (<><Send className="w-4 h-4 mr-2" />Envoyer la demande</>)}
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusInfo.bg} mb-4`}>
                          <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
                        </div>
                        <p className="text-sm text-stone-600">
                          {vendorProfile.verification_status === 'pending' && "Votre demande est en cours de traitement."}
                          {vendorProfile.verification_status === 'verified' && "Felicitations ! Votre entreprise est verifiee."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            <VendorBankAccountManager user={user} />
            <DeleteAccountDialog user={user} />
          </div>
        </TabsContent>

        <TabsContent value="listings">
           {membershipStatus === 'free' && (
             <Card className="mb-6 border-l-4 border-l-blue-500">
               <CardContent className="p-4">
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex-1">
                     <h3 className="font-semibold text-stone-900 mb-2 flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-blue-600" />
                       {t('vendor.creditsTitle')}
                     </h3>
                     <div className="space-y-2">
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-stone-600">{t('vendor.thisMonth')}</span>
                         <span className={`font-bold ${notificationCount >= 10 ? 'text-red-600' : 'text-stone-900'}`}>
                           {notificationCount}/10 {t('vendor.notificationsReceived')}
                         </span>
                       </div>
                       <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                         <div 
                           className={`h-full transition-all ${
                             notificationCount >= 10 ? 'bg-red-500' :
                             notificationCount >= 7 ? 'bg-orange-500' :
                             'bg-blue-500'
                           }`}
                           style={{ width: `${Math.min((notificationCount / 10) * 100, 100)}%` }}
                         />
                       </div>
                       {notificationCount < 10 && (
                         <p className="text-xs text-stone-500">
                           {10 - notificationCount} {t('vendor.moreAvailableThisMonth')}
                         </p>
                       )}
                     </div>
                   </div>
                   {notificationCount >= 8 && (
                     <Button 
                       size="sm"
                       className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
                       onClick={() => setIsMembershipDialogOpen(true)}
                     >
                       <Crown className="w-3 h-3 mr-1" />
                       Passer Premium
                     </Button>
                   )}
                 </div>
               </CardContent>
             </Card>
           )}

           {membershipStatus === 'free' && notificationLimit && (
             <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white mb-8 shadow-lg">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div className="flex-1">
                   <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                     <AlertCircle className="w-6 h-6" /> 
                     Limite de Notifications Atteinte
                   </h3>
                   <p className="text-white/90 mb-2">
                     Vous avez reçu {notificationCount}/10 notifications ce mois. Vous ne recevrez plus de nouvelles demandes clients.
                   </p>
                   <p className="text-white font-semibold">
                     Passez à Premium ou Gold pour recevoir des notifications illimitées !
                   </p>
                 </div>
                 <Button 
                   className="bg-white text-orange-600 hover:bg-orange-50 font-bold whitespace-nowrap"
                   onClick={() => setIsMembershipDialogOpen(true)}
                 >
                   <Crown className="w-4 h-4 mr-2" />
                   Améliorer l'Abonnement
                 </Button>
               </div>
             </div>
           )}

           {membershipStatus === 'free' && !notificationLimit && (
             <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white mb-8 shadow-lg">
               <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                 <div>
                   <h3 className="text-lg font-bold flex items-center gap-2">
                     <CheckCircle2 className="w-5 h-5" /> 
                     {t('vendor.freePlanUsage').replace('{count}', notificationCount)}
                   </h3>
                   <p className="text-blue-100 mt-1">
                     {t('vendor.freePlanCTA')}
                   </p>
                 </div>
                 <Button 
                   className="bg-white text-indigo-600 hover:bg-indigo-50"
                   onClick={() => setIsMembershipDialogOpen(true)}
                 >
                   <Crown className="w-4 h-4 mr-2" />
                   {t('vendor.viewPlans')}
                 </Button>
               </div>
             </div>
           )}

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Eye} label={t('vendor.totalViews')} value={analytics.views} className="text-rose-400" />
              <StatCard icon={TrendingUp} label={t('vendor.totalLeads')} value={analytics.leads} className="text-green-400" />
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myServices.length > 0 ? myServices.map(service => (
              <Card key={service.id} className={`group relative ${service.is_suspended ? 'border-2 border-amber-400' : ''} ${service.is_hidden ? 'opacity-60' : ''}`}>
                <div className="aspect-video bg-stone-100 relative overflow-hidden rounded-t-lg">
                  {service.image_url && (service.image_url.endsWith('.mp4') || service.image_url.endsWith('.webm') || service.image_url.includes('video')) ? (
                    <video src={service.image_url} className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity" muted loop playsInline />
                  ) : service.image_url ? (
                    <img 
                      src={service.image_url} 
                      alt={service.title} 
                      className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-200">
                      <Package className="w-12 h-12 text-stone-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold">
                    {service.price_min?.toLocaleString()} FCFA
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {service.views || 0}
                  </div>
                  {service.is_hidden && (
                    <div className="absolute top-2 left-2 bg-stone-800/90 backdrop-blur px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Masquée
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start gap-2">
                    <span className="truncate">{service.title}</span>
                    {service.is_suspended && (
                      <Badge className="bg-amber-500 text-white flex-shrink-0 text-[10px]">
                        <ShieldAlert className="w-3 h-3 mr-1" /> Suspendue
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {service.is_suspended && service.suspension_note && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <strong>Motif de suspension :</strong> {service.suspension_note}
                    </div>
                  )}
                  <p className="text-stone-500 text-sm line-clamp-2 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center mt-4">
                    <Badge variant="outline">{service.category}</Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={service.is_hidden ? "text-stone-400 hover:text-stone-600 hover:bg-stone-100" : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"}
                        onClick={() => toggleServiceVisibility(service)}
                        disabled={togglingVisibility === service.id || service.is_suspended}
                        title={service.is_suspended ? "Suspendue par l'administration" : (service.is_hidden ? "Afficher l'offre" : "Masquer l'offre")}
                      >
                        {service.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditService(service)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteService(service.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-20 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-900">Aucun service répertorié</h3>
                <p className="text-stone-500 mb-6">Commencez à gagner en listant vos services d'organisation d'événements.</p>
                <Button onClick={() => setIsNewServiceOpen(true)} variant="outline">Créer Première Offre</Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings_received">
             {selectedContractBooking && (
               <ContractFlow 
                 booking={selectedContractBooking}
                 currentUser={user}
                 open={isContractFlowOpen}
                 onOpenChange={setIsContractFlowOpen}
                 onComplete={() => {
                   setSelectedContractBooking(null);
                   setIsContractFlowOpen(false);
                   refetch();
                 }}
               />
             )}

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
               <StatCard 
                 icon={Wallet}
                 label="Gains en Attente"
                 value={`${bookings
                   .filter(b => b.status === 'confirmed' || b.status === 'completed')
                   .reduce((acc, curr) => acc + (curr.total_amount || 0), 0)
                   .toLocaleString()} FCFA`}
                 className="bg-white border border-stone-200 text-green-600"
               />
               <StatCard 
                 icon={Crown}
                 label="Frais Plateforme (5%)"
                 value={`${bookings
                   .filter(b => b.status === 'confirmed' || b.status === 'completed')
                   .reduce((acc, curr) => acc + (curr.commission_amount || 0), 0)
                   .toLocaleString()} FCFA`}
                 className="bg-white border border-stone-200 text-rose-600"
               />
             </div>

            <BookingFilters 
              filters={bookingFilters}
              onFiltersChange={setBookingFilters}
              onClearFilters={() => setBookingFilters({ search: '', status: 'all', dateSort: 'newest', amountSort: 'none' })}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />

            <div className="mt-6">
              <BookingTable 
                bookings={bookings}
                loading={loading.bookings}
                page={bookingsPage}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setBookingsPage}
                onDiscussionClick={(booking) => window.location.href = `/Chat?userId=${booking.service_id ? booking.service_id.split('-')[0] : 'unknown'}`}
                onContractClick={(booking) => {
                  setSelectedContractBooking(booking);
                  setIsContractFlowOpen(true);
                }}
                onDisputeClick={(booking) => {
                  setSelectedDisputeBooking(booking);
                }}
                StatusBadge={StatusBadge}
                RateClientDialog={RateClientDialog}
                filters={bookingFilters}
              />
            </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
