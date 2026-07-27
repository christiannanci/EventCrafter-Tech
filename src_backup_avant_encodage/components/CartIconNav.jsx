import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, X, Calendar, Trash2, MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";

export default function CartIconNav() {
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

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

  const removeFromCart = (serviceId) => {
    const updated = cart.filter(item => item.id !== serviceId);
    setCart(updated);
    localStorage.setItem('contact_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const clearCart = () => {
    if (confirm('Êtes-vous sûr de vouloir vider le panier ?')) {
      setCart([]);
      localStorage.removeItem('contact_cart');
      window.dispatchEvent(new Event('storage'));
      toast({ title: "Panier vidé", description: "Tous les services ont été retirés" });
    }
  };

  const startChatWithVendor = async (service) => {
    try {
      const user = await base44.auth.me();
      
      // Check if conversation already exists between user and vendor
      const allConvs = await base44.entities.Conversation.list();
      const existingConv = allConvs.find(c => 
        c.participants && 
        c.participants.includes(user.id) && 
        c.participants.includes(service.planner_id)
      );
      
      if (existingConv) {
        window.location.href = `/Chat?conversationId=${existingConv.id}`;
        return;
      }
      
      // Create new conversation
      const conversation = await base44.entities.Conversation.create({
        participants: [user.id, service.planner_id],
        service_id: service.id,
        last_message: "Nouvelle conversation",
        last_message_at: new Date().toISOString()
      });
      
      // Create first message
      await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: `Bonjour, je suis intéressé(e) par votre service "${service.title}". Pouvons-nous discuter des détails ?`,
        read_status: "unread"
      });
      
      toast({ title: "Discussion démarrée", description: "Redirection vers la messagerie..." });
      setTimeout(() => window.location.href = `/Chat?conversationId=${conversation.id}`, 1000);
      
    } catch (error) {
      if (error.message && error.message.includes('not authenticated')) {
        toast({ 
          title: "Connexion requise", 
          description: "Connectez-vous pour contacter le prestataire" 
        });
        setTimeout(() => base44.auth.redirectToLogin('/Chat'), 1000);
      } else {
        console.error(error);
        toast({ title: "Erreur", description: "Impossible de démarrer la discussion", variant: "destructive" });
      }
    }
  };

  const createBookings = async () => {
    if (!eventDate || !eventType) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs requis", variant: "destructive" });
      return;
    }

    // Sauvegarder les données du formulaire avant vérification d'authentification
    const eventFormData = {
      eventName: eventType,
      eventDate,
      eventDescription: message,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('pending_event_form', JSON.stringify(eventFormData));

    setSending(true);
    try {
      let user;
      try {
        user = await base44.auth.me();
      } catch (error) {
        toast({ 
          title: "Connexion requise", 
          description: "Connectez-vous pour créer votre événement" 
        });
        setTimeout(() => {
          base44.auth.redirectToLogin('/ClientDashboard');
        }, 1000);
        setSending(false);
        return;
      }
      
      const event = await base44.entities.Event.create({
        client_id: user.id,
        title: eventType,
        event_type: eventType,
        start_date: eventDate,
        status: 'planning'
      });
      
      for (const service of cart) {
        await base44.entities.Booking.create({
          event_id: event.id,
          service_id: service.id,
          planner_id: service.planner_id,
          client_name: user.full_name || user.email,
          event_type: eventType,
          event_date: eventDate,
          status: 'draft',
          notes: `Service ajouté à l'événement: ${eventType}`,
          requested_unit_price: service.price_min
        });
      }

      toast({ 
        title: "Événement créé!", 
        description: `${cart.length} service${cart.length > 1 ? 's' : ''} ajouté${cart.length > 1 ? 's' : ''} à votre événement` 
      });
      
      setCart([]);
      localStorage.removeItem('contact_cart');
      localStorage.removeItem('pending_event_form');
      setMessage("");
      setEventDate("");
      setEventType("");
      
      setTimeout(() => window.location.href = '/ClientDashboard', 1500);
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Échec de création de l'événement", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-[#2C2C2C] hover:text-[#FF6B35]">
          <ShoppingCart className="h-5 w-5" />
          {cart.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-rose-600 text-white text-xs">
              {cart.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Mon Panier</SheetTitle>
              <SheetDescription>
                {cart.length} service{cart.length > 1 ? 's' : ''} sélectionné{cart.length > 1 ? 's' : ''}
              </SheetDescription>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Vider
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4 overflow-y-auto flex-1 pr-2">
          {cart.length > 0 ? (
            <>
              {cart.map((service) => (
                <div key={service.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-stone-50">
                  <div className="flex items-start gap-3">
                    <img 
                      src={service.image_url} 
                      alt={service.title}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="flex-grow">
                      <h4 className="font-medium text-sm">{service.title}</h4>
                      <p className="text-xs text-stone-500">{service.city}</p>
                      <p className="text-xs font-bold text-rose-600 mt-1">
                        À partir de {service.price_min?.toLocaleString()} FCFA
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeFromCart(service.id)}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startChatWithVendor(service)}
                    className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <MessageCircle className="w-3 h-3 mr-2" />
                    Contacter le prestataire
                  </Button>
                </div>
              ))}

              <div className="pt-4 space-y-3 border-t">
                <div className="space-y-2">
                  <Label>Nom de l'événement *</Label>
                  <Input 
                    placeholder="Ex: Mon Mariage 2025"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Date de l'événement *</Label>
                  <Input 
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Textarea 
                    placeholder="Détails sur votre événement..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                
                <Button 
                  className="w-full bg-rose-600 hover:bg-rose-700"
                  onClick={createBookings}
                  disabled={sending}
                >
                  {sending ? (
                    <>Création en cours...</>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Créer Événement
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-stone-500 mt-2">
                  Vos sélections seront conservées après connexion
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <ShoppingCart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">Votre panier est vide</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}