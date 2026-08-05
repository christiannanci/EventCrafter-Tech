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
import { useLanguage } from '@/components/LanguageContext';

export default function CartIconNav() {
  const { t } = useLanguage();
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
    if (confirm(t('cart.confirmClear'))) {
      setCart([]);
      localStorage.removeItem('contact_cart');
      window.dispatchEvent(new Event('storage'));
      toast({ title: t('cart.clearedTitle'), description: t('cart.clearedDesc') });
    }
  };

  const startChatWithVendor = async (service) => {
    try {
      const user = await base44.auth.me();
      
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
      
      const conversation = await base44.entities.Conversation.create({
        participants: [user.id, service.planner_id],
        service_id: service.id,
        last_message: t('cart.newConversation'),
        last_message_at: new Date().toISOString()
      });
      
      await base44.entities.Message.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: `${t('cart.interestedMessagePrefix')} "${service.title}". ${t('cart.interestedMessageSuffix')}`,
        read_status: "unread"
      });
      
      toast({ title: t('cart.chatStartedTitle'), description: t('cart.chatStartedDesc') });
      setTimeout(() => window.location.href = `/Chat?conversationId=${conversation.id}`, 1000);
      
    } catch (error) {
      if (error.message && error.message.includes('not authenticated')) {
        toast({ 
          title: t('cart.loginRequiredTitle'), 
          description: t('cart.loginRequiredContactDesc') 
        });
        setTimeout(() => base44.auth.redirectToLogin('/Chat'), 1000);
      } else {
        console.error(error);
        toast({ title: t('vendor.genericError'), description: t('cart.chatStartError'), variant: "destructive" });
      }
    }
  };

  const createBookings = async () => {
    if (!eventDate || !eventType) {
      toast({ title: t('vendor.genericError'), description: t('cart.fillRequiredFields'), variant: "destructive" });
      return;
    }

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
          title: t('cart.loginRequiredTitle'), 
          description: t('cart.loginRequiredEventDesc') 
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
          notes: `${t('cart.serviceAddedToEvent')}: ${eventType}`,
          requested_unit_price: service.price_min
        });
      }

      toast({ 
        title: t('cart.eventCreatedTitle'), 
        description: `${cart.length} ${cart.length > 1 ? t('cart.servicesPlural') : t('cart.serviceSingular')} ${t('cart.addedToYourEvent')}` 
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
      toast({ title: t('vendor.genericError'), description: t('cart.eventCreationError'), variant: "destructive" });
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
              <SheetTitle>{t('cart.myCartTitle')}</SheetTitle>
              <SheetDescription>
                {cart.length} {cart.length > 1 ? t('cart.servicesPlural') : t('cart.serviceSingular')} {t('cart.selected')}
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
                {t('cart.clearButton')}
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
                        {t('cart.startingFrom')} {service.price_min?.toLocaleString()} FCFA
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
                    {t('cart.contactProvider')}
                  </Button>
                </div>
              ))}

              <div className="pt-4 space-y-3 border-t">
                <div className="space-y-2">
                  <Label>{t('cart.eventNameLabel')}</Label>
                  <Input 
                    placeholder={t('cart.eventNamePlaceholder')}
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('cart.eventDateLabel')}</Label>
                  <Input 
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('cart.descriptionLabel')}</Label>
                  <Textarea 
                    placeholder={t('cart.descriptionPlaceholder')}
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
                    <>{t('cart.creatingInProgress')}</>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('cart.createEventButton')}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-stone-500 mt-2">
                  {t('cart.selectionsSaved')}
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <ShoppingCart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">{t('cart.emptyCart')}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
