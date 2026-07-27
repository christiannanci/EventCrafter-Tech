import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ArrowRight, Trophy, Sparkles, Award, Heart } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useLanguage } from '@/components/LanguageContext';
import { useLocationContext } from '@/components/LocationContext';
import { useCurrency } from '@/components/CurrencyContext';
import { base44 } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";

export default function ServiceCard({ service, eventId, isTopRated, position }) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [isInCart, setIsInCart] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();
  
  // RN5: Vérifier si le service a un boost "Coup de Coeur"
  const hasCoupDeCoeurBoost = service?.featured_until && new Date(service.featured_until) > new Date();
  
  // Badge "New" pour services créés il y a moins de 7 jours
  const isNewService = () => {
    if (!service?.created_date) return false;
    try {
      const createdDate = new Date(service.created_date);
      const now = new Date();
      const daysSinceCreation = (now - createdDate) / (1000 * 60 * 60 * 24);
      return daysSinceCreation <= 7;
    } catch {
      return false;
    }
  };
  
  // Badge "Active" si vendeur actif (contrats conclus, échanges réguliers, réponses)
  const isActiveVendor = service._isActiveVendor || false;

  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem('contact_cart') || '[]');
      setIsInCart(cart.some(item => item?.id === service?.id));
    } catch {
      setIsInCart(false);
    }
  }, [service?.id]);

  const toggleCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Si un event_id est présent, ajouter directement à l'événement
    if (eventId) {
      setAdding(true);
      try {
        const user = await base44.auth.me();
        const event = await base44.entities.Event.filter({ id: eventId });
        
        if (!event || !Array.isArray(event) || event.length === 0) {
          toast({ title: "Erreur", description: "Événement introuvable", variant: "destructive" });
          return;
        }

        // Créer une réservation pour cet événement
        await base44.entities.Booking.create({
          event_id: eventId,
          service_id: service.id,
          planner_id: service.planner_id,
          client_name: user.full_name || user.email,
          event_type: event[0].event_type || 'Other',
          event_date: event[0].start_date,
          status: 'pending',
          notes: `Service ajouté à l'événement: ${event[0].title}`,
          requested_unit_price: service.price_min || 0,
          payment_status: 'unpaid',
          total_amount: 0
        });

        // Notifier le vendeur
        await base44.entities.Notification.create({
          user_id: service.planner_id,
          title: "📋 Nouvelle demande de réservation",
          message: `${user.full_name || user.email} souhaite réserver votre service "${service.title}" pour ${event[0].title}`,
          type: "booking",
          link: "/VendorDashboard",
          is_read: false
        });

        toast({ title: "Service ajouté!", description: "Le service a été ajouté à votre événement" });
        
        // Rediriger vers le dashboard client
        setTimeout(() => {
          window.location.href = '/ClientDashboard';
        }, 1000);
      } catch (error) {
        console.error("Erreur ajout service:", error);
        toast({ 
          title: "Erreur d'ajout", 
          description: "Impossible d'ajouter le service. Vérifiez votre connexion.",
          variant: "destructive" 
        });
      } finally {
        setAdding(false);
      }
      return;
    }

    // Comportement normal du panier
    try {
      const cart = JSON.parse(localStorage.getItem('contact_cart') || '[]');
      
      if (isInCart) {
        const updated = cart.filter(item => item?.id !== service?.id);
        localStorage.setItem('contact_cart', JSON.stringify(updated));
        setIsInCart(false);
      } else {
        cart.push(service);
        localStorage.setItem('contact_cart', JSON.stringify(cart));
        setIsInCart(true);
      }
      
      // Déclencher l'événement storage pour mettre à jour le badge du panier
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Erreur panier:', error);
    }
  };

  // Afficher badge "Top Rated" si c'est le cas
  const showTopRatedBadge = isTopRated && position <= 3;
  const vendorPlan = service._vendorPlan || 'free';
  const hasNewBoost = service._hasNewBoost || false;
  
  // Couleurs selon le plan
  const planColors = {
    gold: 'from-yellow-400 via-yellow-500 to-yellow-600',
    premium: 'from-purple-500 via-purple-600 to-purple-700',
    free: 'from-stone-400 via-stone-500 to-stone-600'
  };
  
  return (
    <Link to={`${createPageUrl('ServiceDetails')}?id=${service.id}`}>
      <Card className={`group overflow-hidden transition-all duration-300 h-full flex flex-col cursor-pointer bg-white ${
        hasCoupDeCoeurBoost 
          ? 'border-2 shadow-2xl ring-4 ring-rose-200 border-rose-400 animate-pulse' :
        showTopRatedBadge 
          ? 'border-2 shadow-2xl ring-2 ring-offset-2' + 
            (vendorPlan === 'gold' ? ' border-yellow-400 ring-yellow-200' : 
             vendorPlan === 'premium' ? ' border-purple-400 ring-purple-200' : 
             ' border-stone-400 ring-stone-200')
          : 'border-stone-200 hover:shadow-xl'
      }`}>
        {/* RN5: Badge Coup de Coeur (prioritaire sur Top Rated) */}
        {hasCoupDeCoeurBoost ? (
          <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 fill-white animate-pulse" />
            ❤️ Coup de Coeur
          </div>
        ) : showTopRatedBadge && (
          <div className={`bg-gradient-to-r ${planColors[vendorPlan]} text-white text-center py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2`}>
            <Trophy className="w-4 h-4 fill-white" />
            {vendorPlan === 'gold' ? '👑 Top Rated Gold' : 
             vendorPlan === 'premium' ? '⭐ Top Rated Premium' : 
             '🏆 Top Rated'}
            {position === 1 && ' #1'}
          </div>
        )}
        
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          {service.image_url && (service.image_url.endsWith('.mp4') || service.image_url.endsWith('.webm') || service.image_url.includes('video')) ? (
            <video 
              src={service.image_url}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.target.play()}
              onMouseLeave={(e) => e.target.pause()}
            />
          ) : (
            <img 
              src={service.image_url || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
              alt={service.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          )}
          {eventId && (
            <div className="absolute top-3 left-3">
              <Button
                size="sm"
                variant="default"
                onClick={toggleCart}
                disabled={adding}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {adding ? "..." : "+ Ajouter"}
              </Button>
            </div>
          )}
          <div className="absolute top-3 right-3 flex flex-wrap gap-2 justify-end max-w-[80%]">
            {/* Badge New Service (< 7 jours) */}
            {isNewService() && (
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg flex items-center gap-1 font-bold animate-pulse">
                <Sparkles className="w-3 h-3" /> NEW
              </Badge>
            )}
            
            {/* Badge Active Vendor */}
            {isActiveVendor && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg flex items-center gap-1 font-bold">
                ✓ ACTIF
              </Badge>
            )}
            
            {/* Badge Nouveau Membre avec Boost */}
            {hasNewBoost && (
              <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 shadow-lg flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3 h-3" /> Nouveau
              </Badge>
            )}
            
            {/* Badge Plan Vendeur */}
            {vendorPlan === 'gold' && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 shadow-lg flex items-center gap-1 font-bold">
                <Award className="w-3 h-3 fill-white" /> GOLD
              </Badge>
            )}
            {vendorPlan === 'premium' && (
              <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 shadow-lg flex items-center gap-1 font-bold">
                ⭐ PREMIUM
              </Badge>
            )}
            
            {service.is_featured && (
              <Badge className="bg-[#F4C542] hover:bg-[#e5b73e] text-[#2C2C2C] border-0 shadow-sm flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {t('marketplace.sort.featured')}
              </Badge>
            )}
            {service.vendor_verified ? (
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm flex items-center gap-1 font-semibold">
                ✓ VÉRIFIÉ
              </Badge>
            ) : (
              <Badge className="bg-stone-400 hover:bg-stone-500 text-white border-0 shadow-sm flex items-center gap-1 text-[10px]">
                NON VÉRIFIÉ
              </Badge>
            )}
            <Badge className="bg-white/90 text-[#2C2C2C] hover:bg-white backdrop-blur-sm border-0 shadow-sm">
              {service.category}
            </Badge>
          </div>
        </div>
        
        <CardContent className="p-5 flex-grow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg text-stone-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                {service?.title || 'Service'}
              </h3>
              <div className="flex items-center text-stone-500 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                {service?.location || 'Location non spécifiée'}
              </div>
            </div>
          </div>
          
          <p className="text-stone-500 text-sm line-clamp-2 mb-4">
            {service?.description || ''}
          </p>
          
          <div className="flex items-center gap-2 mb-2">
            {(service.review_count || 0) === 0 ? (
              /* Affichage gris pour services sans avis */
              <div className="flex items-center gap-1 opacity-50">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className="w-4 h-4 text-stone-300" 
                  />
                ))}
                <span className="text-xs text-stone-400 ml-1 italic">
                  Nouveau (0 avis)
                </span>
              </div>
            ) : (
              /* Affichage normal avec couleur pour services avec avis */
              <>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-4 h-4 ${star <= (service.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300'}`} 
                    />
                  ))}
                  <span className="text-xs text-stone-600 font-medium ml-1">
                    {(service.rating || 0).toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-stone-400">
                  ({service.review_count} avis)
                </span>
                {service._reputationScore && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-stone-300">
                    Score: {service._reputationScore.toFixed(2)}
                  </Badge>
                )}
              </>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-gray-100 mt-auto bg-[#F9F7F3]/50">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t('serviceDetails.startingAt')}</span>
            <div className="text-[#FF6B35] font-['Poppins'] font-bold text-lg">{formatPrice(service.price_min)}</div>
          </div>
          <Button size="sm" variant="ghost" className="text-[#FF6B35] hover:text-[#e05a2b] hover:bg-[#FFF0E8] p-0 font-medium">
            {t('serviceDetails.viewDetails')} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}