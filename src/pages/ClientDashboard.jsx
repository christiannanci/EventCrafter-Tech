import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NegotiationDialog from '../components/NegotiationDialog';
import ContractFlow from '@/components/dashboard/ContractFlow';
import InvoiceManager from '@/components/dashboard/InvoiceManager';
import PaymentModal from '../components/PaymentModal';
import { 
  CalendarCheck, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  X,
  Plus,
  Trash2,
  MoreVertical,
  MessageCircle,
  Megaphone,
  FileSignature,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ClientProfileForm from "@/components/dashboard/ClientProfileForm";
import ClientBankAccountManager from "@/components/dashboard/ClientBankAccountManager";
import RateVendorDialog from "@/components/dashboard/RateVendorDialog";
import ServiceReceptionDialog from "@/components/dashboard/ServiceReceptionDialog";
import DisputeManager from "@/components/dashboard/DisputeManager";
import ClientReviewsDisplay from '@/components/dashboard/ClientReviewsDisplay';
import { useSearchParams } from 'react-router-dom';
import PlatformFeedbackPrompt from '@/components/PlatformFeedbackPrompt';
import ServiceCompletionPrompt from '@/components/dashboard/ServiceCompletionPrompt';
import DisputeDialog from '@/components/dashboard/DisputeDialog';
import { AlertTriangle } from 'lucide-react';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function ClientDashboard() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'contact_cart');
  

  const [selectedBookingReception, setSelectedBookingReception] = useState(null);
  const [selectedDisputeBooking, setSelectedDisputeBooking] = useState(null);
  const [selectedContractBooking, setSelectedContractBooking] = useState(null);
  const [isContractFlowOpen, setIsContractFlowOpen] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);

  const [cart, setCart] = useState([]);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser) {
          const clientProfiles = await base44.entities.ClientProfile.filter({ user_id: currentUser.id });
          if (clientProfiles.length === 0) {
            window.location.href = '/ProfileSelection';
            return;
          }
        }
      } catch (e) {
        window.location.href = '/login';
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadCart = () => {
      const stored = localStorage.getItem('contact_cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    };

    loadCart();
    window.addEventListener('storage', loadCart);
    return () => window.removeEventListener('storage', loadCart);
  }, []);

  useEffect(() => {
    // Charger les donnÃ©es du formulaire sauvegardÃ©es si l'utilisateur vient de se connecter
    if (user) {
      const pendingForm = localStorage.getItem('pending_event_form');
      if (pendingForm) {
        try {
          const formData = JSON.parse(pendingForm);
          setEventName(formData.eventName || '');
          setEventDate(formData.eventDate || '');
          setEventDescription(formData.eventDescription || '');
          toast({ 
            title: "Informations restaurÃ©es", 
            description: "Vos donnÃ©es d'Ã©vÃ©nement ont Ã©tÃ© rÃ©cupÃ©rÃ©es" 
          });
        } catch (e) {
          console.error('Failed to load pending form', e);
        }
      }
    }
  }, [user]);

  // Use React Query for data fetching with cache
  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.ClientProfile.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: myEvents = [] } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: () => base44.entities.Event.filter({ client_id: user.id }, '-created_date', 50),
    enabled: !!user,
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ['bookings', user?.email],
    queryFn: () => base44.entities.Booking.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user,
  });

  const { data: myLeads = [] } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: () => base44.entities.Lead.filter({ client_id: user.id }, '-created_date', 50),
    enabled: !!user,
  });

  const { data: services = {} } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const allServices = await base44.entities.Service.list('-created_date', 200);
      const map = {};
      allServices.forEach(s => map[s.id] = s);
      return map;
    },
    enabled: !!user,
  });

  const { data: vendors = {} } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const allVendors = await base44.entities.VendorProfile.list('-created_date', 100);
      const map = {};
      allVendors.forEach(v => map[v.user_id] = v);
      return map;
    },
    enabled: !!user,
  });

  // Mutations with cache invalidation
  const deleteBookingMutation = useMutation({
    mutationFn: (bookingId) => base44.entities.Booking.delete(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      toast({ title: "Service retirÃ©" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const eventBookings = myBookings.filter(b => b.event_id === eventId);
      for (const booking of eventBookings) {
        await base44.entities.Booking.delete(booking.id);
      }
      await base44.entities.Event.delete(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events', 'bookings']);
      toast({ title: "Ã‰vÃ©nement supprimÃ©" });
    },
  });

  const removeFromCart = (serviceId) => {
    const updated = cart.filter(item => item.id !== serviceId);
    setCart(updated);
    localStorage.setItem('contact_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const createEventMutation = useMutation({
    mutationFn: async ({ eventName, eventDate, eventDescription, cart }) => {
      if (!eventName?.trim()) {
        throw new Error("Veuillez entrer un nom pour l'Ã©vÃ©nement");
      }
      if (!eventDate) {
        throw new Error("Veuillez sÃ©lectionner une date pour l'Ã©vÃ©nement");
      }
      if (cart.length === 0) {
        throw new Error("Veuillez ajouter au moins un service au panier");
      }
      console.log("CrÃ©ation Ã©vÃ©nement - utilisateur:", user);
      console.log("Panier:", cart);

      // RÃ©cupÃ©rer services nÃ©cessaires
      const allServices = await base44.entities.Service.list('-created_date', 200);
      
      // VÃ©rifier que tous les services du panier ont un planner_id valide
      const invalidServices = [];
      for (const cartService of cart) {
        const fullService = allServices.find(s => s.id === cartService.id);
        if (!fullService || !fullService.planner_id) {
          invalidServices.push(cartService.title);
        }
      }
      
      if (invalidServices.length > 0) {
        throw new Error(`Les services suivants n'ont pas de vendeur valide: ${invalidServices.join(', ')}`);
      }

      const { generateEntityCode } = await import('../components/SecurityUtils');
      
      const event = await base44.entities.Event.create({
        event_code: generateEntityCode('EVENT'),
        client_id: user.id,
        title: eventName,
        event_type: 'Other',
        start_date: new Date(eventDate).toISOString(),
        end_date: new Date(eventDate).toISOString(),
        status: 'planning'
      });

      console.log("Ã‰vÃ©nement crÃ©Ã©:", event);
      
      for (const cartService of cart) {
        // Trouver le service complet dans la base de donnÃ©es
        const fullService = allServices.find(s => s.id === cartService.id);
        
        if (!fullService) {
          console.error("Service non trouvÃ©:", cartService.id);
          continue;
        }

        const vendorId = fullService.planner_id;
        
        if (!vendorId) {
          console.error("Pas de planner_id pour le service:", fullService);
          toast({ 
            title: "Avertissement", 
            description: `Service "${cartService.title}" ignorÃ© - vendeur introuvable`, 
            variant: "destructive",
            duration: 3000
          });
          continue;
        }

        console.log("CrÃ©ation booking pour service:", fullService.title, "vendeur:", vendorId);
        
        await base44.entities.Booking.create({
          booking_code: generateEntityCode('BOOKING'),
          event_id: event.id,
          service_id: fullService.id,
          planner_id: vendorId,
          client_name: user.full_name || user.email,
          event_type: 'Other',
          event_date: eventDate,
          status: 'pending',
          notes: eventDescription || `Service ajoutÃ© Ã  l'Ã©vÃ©nement: ${eventName}`,
          requested_unit_price: fullService.price_min || 0,
          payment_status: 'unpaid',
          total_amount: 0
        });

        // CrÃ©er automatiquement une conversation avec le vendeur
        const allConvs = await base44.entities.Conversation.list('-created_date', 100);
        const existingConv = allConvs.find(c => 
          c.participants.includes(user.id) && 
          c.participants.includes(vendorId)
        );

        if (!existingConv) {
          await base44.entities.Conversation.create({
            participants: [String(user.id), String(vendorId)],
            last_message: `Nouvelle demande pour ${fullService.title}`,
            last_message_at: new Date().toISOString(),
            service_id: fullService.id
          });
        }

        // Notify vendor
        await base44.entities.Notification.create({
          user_id: vendorId,
          title: "ðŸ“‹ Nouvelle demande de rÃ©servation",
          message: `${user.full_name || user.email} souhaite rÃ©server votre service "${fullService.title}" pour ${eventName}`,
          type: "booking",
          link: "/VendorDashboard",
          is_read: false
        });
      }

      toast({ 
        title: "Ã‰vÃ©nement crÃ©Ã©!", 
        description: `${cart.length} service${cart.length > 1 ? 's' : ''} ajoutÃ©${cart.length > 1 ? 's' : ''} Ã  votre Ã©vÃ©nement. Conversations crÃ©Ã©es avec les prestataires.` 
      });

      setCart([]);
      localStorage.removeItem('contact_cart');
      localStorage.removeItem('pending_event_form');
      window.dispatchEvent(new Event('storage'));
      setEventName("");
      setEventDate("");
      setEventDescription("");

      setCart([]);
      localStorage.removeItem('contact_cart');
      localStorage.removeItem('pending_event_form');
      window.dispatchEvent(new Event('storage'));
      setEventName("");
      setEventDate("");
      setEventDescription("");
      setActiveTab('my_bookings');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events', 'bookings']);
      toast({ title: "Ã‰vÃ©nement crÃ©Ã©!", description: `Services ajoutÃ©s avec succÃ¨s` });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: "bg-stone-100 text-stone-800",
      negotiating: "bg-blue-100 text-blue-800",
      offer_submitted: "bg-purple-100 text-purple-800",
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <PlatformFeedbackPrompt user={user} userRole="client" />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Tableau de Bord Client</h1>
          <p className="text-stone-500">Bienvenue, {user.first_name || user.email}</p>
        </div>
        <Button asChild className="bg-rose-600 hover:bg-rose-700">
          <a href="/Marketplace">
            <ShoppingCart className="w-4 h-4 mr-2" /> Parcourir les Services
          </a>
        </Button>
      </div>

      <DisputeDialog
        open={showDisputeDialog}
        onOpenChange={setShowDisputeDialog}
        booking={selectedDisputeBooking}
        userType="client"
        onSuccess={() => {
          setShowDisputeDialog(false);
          setSelectedDisputeBooking(null);
          queryClient.invalidateQueries(['bookings']);
        }}
      />

      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'Ã©vÃ©nement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera l'Ã©vÃ©nement et tous les services associÃ©s. Cette action est irrÃ©versible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteEventMutation.mutate(deletingEvent);
                setDeletingEvent(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingBooking} onOpenChange={(open) => !open && setDeletingBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le service sera retirÃ© de votre Ã©vÃ©nement. Cette action est irrÃ©versible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteBookingMutation.mutate(deletingBooking);
                setDeletingBooking(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 overflow-x-auto -mx-4 px-4">
        <TabsList className="w-max min-w-full justify-start bg-stone-100 p-1">
          <TabsTrigger value="contact_cart" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">ðŸ›’ Panier</TabsTrigger>
          <TabsTrigger value="my_bookings" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">ðŸ“… Ã‰vÃ©nements</TabsTrigger>
          <TabsTrigger value="my_requests" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">ðŸ“¬ Demandes</TabsTrigger>
          <TabsTrigger value="client_profile" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">ðŸ‘¤ Profil</TabsTrigger>
          <TabsTrigger value="reviews" className="px-3 sm:px-6 text-xs sm:text-sm whitespace-nowrap">â­ Avis</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="contact_cart">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Mon Panier de Services
                </CardTitle>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/Marketplace'}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Ajouter des services
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cart.length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {cart.map((service) => (
                      <div key={service.id} className="flex items-start gap-4 p-4 border rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors group">
                        <img 
                          src={service.image_url} 
                          alt={service.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-grow">
                          <h4 className="font-semibold text-stone-900">{service.title}</h4>
                          <p className="text-sm text-stone-500">{service.city}</p>
                          <p className="text-sm font-bold text-rose-600 mt-1">
                            Ã€ partir de {service.price_min?.toLocaleString()} FCFA
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              const vendorId = service.planner_id || service.created_by;
                              if (!vendorId) return;
                              
                              const allConvs = await base44.entities.Conversation.list('-created_date', 100);
                              const existing = allConvs.find(c => 
                                c.participants.includes(user.id) && 
                                c.participants.includes(vendorId)
                              );

                              if (existing) {
                                window.location.href = `/Chat?conversationId=${existing.id}`;
                              } else {
                                const newConv = await base44.entities.Conversation.create({
                                  participants: [String(user.id), String(vendorId)],
                                  last_message: "Conversation dÃ©marrÃ©e",
                                  last_message_at: new Date().toISOString()
                                });
                                window.location.href = `/Chat?conversationId=${newConv.id}`;
                              }
                            }}
                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                            title="Contacter le prestataire"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeFromCart(service.id)}
                            className="text-stone-400 hover:text-red-600 hover:bg-red-50"
                            title="Retirer du panier"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="font-semibold text-lg">CrÃ©er un Ã‰vÃ©nement</h3>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nom de l'Ã©vÃ©nement *</label>
                      <input 
                        type="text"
                        placeholder="Ex: Mon Mariage 2025"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date de l'Ã©vÃ©nement *</label>
                      <input 
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description (optionnel)</label>
                      <textarea 
                        placeholder="DÃ©tails sur votre Ã©vÃ©nement..."
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                      />
                    </div>

                    <Button 
                      className="w-full bg-rose-600 hover:bg-rose-700"
                      onClick={() => createEventMutation.mutate({ eventName, eventDate, eventDescription, cart })}
                      disabled={createEventMutation.isPending || !eventName?.trim() || !eventDate}
                    >
                      {createEventMutation.isPending ? (
                        <>CrÃ©ation en cours...</>
                      ) : (
                        <>
                          <CalendarCheck className="w-4 h-4 mr-2" />
                          CrÃ©er Ã‰vÃ©nement avec {cart.length} Service{cart.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                    {(!eventName?.trim() || !eventDate) && (
                      <p className="text-xs text-amber-600 mt-2">
                        Vos informations seront conservÃ©es aprÃ¨s connexion
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <ShoppingCart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500">
                    Votre panier est vide
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <Button asChild className="bg-rose-600 hover:bg-rose-700">
                      <a href="/Marketplace">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Explorer les Services
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my_requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Mes Demandes PostÃ©es
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myLeads.length > 0 ? (
                <div className="space-y-4">
                  {myLeads.map((lead) => (
                    <Card key={lead.id} className="border-l-4 border-rose-600">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{lead.event_type}</h4>
                            <p className="text-sm text-stone-500">{lead.service_category}</p>
                          </div>
                          <Badge className={lead.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-800'}>
                            {lead.status === 'open' ? 'Ouverte' : 'FermÃ©e'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-stone-600">
                            <CalendarCheck className="w-4 h-4" />
                            {lead.event_date ? format(new Date(lead.event_date), 'dd MMMM yyyy', { locale: fr }) : 'Date non spÃ©cifiÃ©e'}
                          </div>
                          <p className="text-stone-600">ðŸ“ {lead.location}</p>
                          {lead.budget && <p className="text-stone-600">ðŸ’° {lead.budget}</p>}
                          <p className="text-stone-700 mt-2">{lead.description}</p>
                        </div>
                        <div className="mt-4 text-xs text-stone-400">
                          PostÃ©e le {format(new Date(lead.created_date), 'dd/MM/yyyy Ã  HH:mm')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Megaphone className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-900">Aucune demande</h3>
                  <p className="text-stone-500 mb-6">Vous n'avez pas encore postÃ© de demande de service.</p>
                  <Button asChild className="bg-rose-600 hover:bg-rose-700">
                    <a href="/PostRequest">
                      <Plus className="w-4 h-4 mr-2" />
                      Poster une Demande
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client_profile">
            <ClientProfileForm
                user={user}
                initialProfile={clientProfile}
                onSave={() => queryClient.invalidateQueries(['clientProfile'])}
            />
            <ClientBankAccountManager user={user} />
            <DeleteAccountDialog user={user} />
        </TabsContent>

        <TabsContent value="reviews">
          <ClientReviewsDisplay clientUserId={user.id} />
        </TabsContent>

        <TabsContent value="my_bookings">
          <ServiceReceptionDialog 
              booking={selectedBookingReception} 
              open={!!selectedBookingReception} 
              onOpenChange={(val) => !val && setSelectedBookingReception(null)}
              onSuccess={() => queryClient.invalidateQueries(['bookings'])}
          />

          {selectedContractBooking && (
            <ContractFlow 
              booking={selectedContractBooking}
              currentUser={user}
              open={isContractFlowOpen}
              onOpenChange={setIsContractFlowOpen}
              onComplete={() => {
                setSelectedContractBooking(null);
                setIsContractFlowOpen(false);
                queryClient.invalidateQueries(['bookings']);
              }}
            />
          )}

          {selectedPaymentBooking && (
            <PaymentModal
              booking={selectedPaymentBooking}
              isOpen={!!selectedPaymentBooking}
              onClose={() => setSelectedPaymentBooking(null)}
              onSuccess={() => {
                setSelectedPaymentBooking(null);
                queryClient.invalidateQueries(['bookings']);
                toast({ title: "Paiement effectuÃ© avec succÃ¨s!" });
              }}
            />
          )}



          {myEvents.length > 0 ? (
            <div className="space-y-6">
              {myEvents.map(event => {
                const eventBookings = myBookings.filter(b => b.event_id === event.id);
                
                return (
                  <Card key={event.id} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b">
                      <div className="flex justify-between items-start">
                        <div>
                         <CardTitle className="text-xl flex items-center gap-2">
                           <CalendarCheck className="w-5 h-5 text-rose-600" />
                           {event.title}
                         </CardTitle>
                         <p className="text-sm text-stone-500 mt-1">
                           {format(new Date(event.start_date), 'EEEE d MMMM yyyy', { locale: fr })}
                         </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white">
                            {eventBookings.length} service{eventBookings.length > 1 ? 's' : ''}
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.location.href = `/Marketplace?event_id=${event.id}`}>
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter un service
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeletingEvent(event.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer l'Ã©vÃ©nement
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      {eventBookings.length > 0 ? (
                        <div className="divide-y divide-stone-100">
                          {eventBookings.map(booking => {
                           const service = services[booking.service_id];
                           const vendor = vendors[booking.planner_id];

                           // CrÃ©er un dossier pour le prompt de clÃ´ture
                           const dossier = {
                             id: booking.id,
                             bookingId: booking.id,
                             bookingStatus: booking.status,
                             eventDate: booking.event_date,
                             clientName: booking.client_name,
                             eventType: booking.event_type
                           };

                           return (
                             <div key={booking.id} className="p-4 hover:bg-stone-50 transition-colors space-y-4">
                               {/* Prompt de clÃ´ture si Ã©vÃ©nement passÃ© */}
                               <ServiceCompletionPrompt 
                                 dossier={dossier}
                                 userType="client"
                                 onComplete={() => queryClient.invalidateQueries(['bookings'])}
                               />

                               <div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-start gap-4 flex-grow">
                                    {service?.image_url && (
                                      <img 
                                        src={service.image_url} 
                                        alt={service.title}
                                        className="w-16 h-16 rounded-lg object-cover"
                                      />
                                    )}
                                    <div className="flex-grow">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-stone-900">
                                          {service?.title || 'Service'}
                                        </h4>
                                        <StatusBadge status={booking.status} />
                                      </div>

                                      <div className="space-y-1">
                                        <p className="text-sm text-stone-600 flex items-center gap-2">
                                          <span className="font-medium">Vendeur:</span>
                                          {vendor?.business_name || 'Provider'}
                                        </p>
                                        {booking.total_amount > 0 && (
                                          <p className="text-sm font-semibold text-green-600">
                                            {booking.total_amount?.toLocaleString()} FCFA
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-end gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => window.location.href = `/Chat?userId=${booking.planner_id}`}
                                        className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                      >
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        Discussion
                                      </Button>

                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                        onClick={() => {
                                          setSelectedContractBooking(booking);
                                          setIsContractFlowOpen(true);
                                        }}
                                      >
                                        <FileSignature className="w-4 h-4 mr-2" />
                                        GÃ©rer Contrat
                                      </Button>

                                      {booking.status !== 'draft' && (
                                       <>
                                         {(booking.status === 'awaiting_payment' || booking.status === 'contract_pending') && (
                                           <Button 
                                             size="sm" 
                                             className="bg-green-600 hover:bg-green-700 text-white"
                                             onClick={() => setSelectedPaymentBooking(booking)}
                                           >
                                             <DollarSign className="w-4 h-4 mr-2" />
                                             Effectuer le Paiement
                                           </Button>
                                         )}
                                       </>
                                      )}



                                      {booking.status === 'completed' && (
                                       <RateVendorDialog booking={booking} />
                                      )}

                                      {(['in_progress', 'delivered', 'completed'].includes(booking.status)) && booking.status !== 'disputed' && (
                                       <Button 
                                         size="sm" 
                                         variant="outline"
                                         className="border-amber-600 text-amber-700 hover:bg-amber-50"
                                         onClick={() => {
                                           setSelectedDisputeBooking(booking);
                                           setShowDisputeDialog(true);
                                         }}
                                       >
                                         <AlertTriangle className="w-4 h-4 mr-2" />
                                         Signaler un Incident
                                       </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-stone-500">
                          Aucun service ajoutÃ© Ã  cet Ã©vÃ©nement
                        </div>
                      )}
                    </CardContent>
                    </Card>
                    );
                    })}
                    </div>
          ) : (
            <Card>
              <CardContent className="p-20 text-center">
                <CalendarCheck className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-900">Aucun Ã©vÃ©nement</h3>
                <p className="text-stone-500 mb-6">CrÃ©ez votre premier Ã©vÃ©nement en ajoutant des services Ã  votre panier.</p>
                <Button asChild>
                  <a href="/Marketplace">Explorer les Services</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="legacy_bookings">
          <Card>
            <CardContent className="p-0">
               {myBookings.filter(b => !b.event_id).length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {myBookings.filter(b => !b.event_id).map(booking => {
                    const service = services[booking.service_id];
                    const vendor = vendors[booking.planner_id];
                    
                    return (
                    <div key={booking.id} className="p-6 hover:bg-stone-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-grow">
                          {service?.image_url && (
                            <img 
                              src={service.image_url} 
                              alt={service.title}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-stone-900">
                                {service?.title || 'Service'}
                              </h4>
                              <StatusBadge status={booking.status} />
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-sm text-stone-600 flex items-center gap-2">
                                <span className="font-medium">Vendeur:</span>
                                {vendor?.business_name || 'Provider'}
                              </p>
                              <p className="text-sm text-stone-600 flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4" />
                                {format(new Date(booking.event_date), 'MMMM d, yyyy')}
                              </p>
                              {booking.total_amount > 0 && (
                                <p className="text-sm font-semibold text-green-600">
                                  {booking.total_amount?.toLocaleString()} FCFA
                                </p>
                              )}
                              {booking.notes && (
                                <p className="text-xs text-stone-400 mt-2 bg-stone-100 p-2 rounded italic">
                                  "{booking.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        

                      </div>
                    </div>
                    );
                  })}
                </div>
               ) : (
                 <div className="p-20 text-center">
                   <CalendarCheck className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-stone-900">Aucune rÃ©servation</h3>
                   <p className="text-stone-500 mb-6">Explorez la plateforme pour trouver des prestataires pour votre prochain Ã©vÃ©nement.</p>
                   <Button asChild>
                     <a href="/Marketplace">Explorer les Services</a>
                   </Button>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
