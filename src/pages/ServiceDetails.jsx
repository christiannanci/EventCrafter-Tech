import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44, supabase } from "@/api/apiClient";
import { SendEmail } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Star,
  User,
  Check,
  Calendar as CalendarIcon,
  CreditCard,
  ShieldCheck,
  MessageSquare,
  Share2,
  Heart,
  Globe,
  BookOpen,
  Plane,
  ShoppingCart
} from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import ReviewsSection from '@/components/ReviewsSection';
import { useLanguage } from '@/components/LanguageContext';
import { useCurrency } from '@/components/CurrencyContext';

export default function ServiceDetails() {
  const [service, setService] = useState(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { language: currentLang } = useLanguage();

  const displayTitle = (currentLang === 'en' && service?.title_en) ? service.title_en : service?.title;
  const displayDescription = (currentLang === 'en' && service?.description_en) ? service.description_en : service?.description;
  const displayDescriptionDetails = (currentLang === 'en' && service?.description_details_en) ? service.description_details_en : service?.description_details;
  const displayDescriptionTerms = (currentLang === 'en' && service?.description_terms_en) ? service.description_terms_en : service?.description_terms;

  // Fourchette de prix : n'affiche une fourchette que si price_max existe ET est strictement
  // superieur a price_min (sinon un seul prix suffit, comportement inchange). Meme logique que ServiceCard.jsx.
  const hasPriceRange = service?.price_max != null && service.price_max > (service?.price_min || 0);

  const [planner, setPlanner] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isInCart, setIsInCart] = useState(false);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const serviceId = searchParams.get('id');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!serviceId) return;

      const data = await base44.entities.Service.list();
      const found = data.find(s => s.id === serviceId);
      // Bloque l'acces direct par lien a une offre masquee ou suspendue
      if (found && (found.is_hidden || found.is_suspended)) {
        setService(null);
        setServiceUnavailable(true);
        return;
      }
      setService(found);

      if (found) {
          const profiles = await base44.entities.VendorProfile.list();
          const profile = profiles.find(p => p.user_id === (found.planner_id || found.created_by));
          setPlanner(profile);

          try {
             const plannerId = found.planner_id || found.created_by;
             const slots = await base44.entities.AvailabilitySlot.filter({ planner_id: plannerId });
             setAvailableSlots(slots);
          } catch(e) { console.error("Error fetching slots", e); }

          await base44.entities.Service.update(found.id, {
              views: (found.views || 0) + 1
          });
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);
      } catch (e) {
        console.error('Erreur chargement utilisateur:', e);
      }
    };
    fetchDetails();
  }, [serviceId]);

  useEffect(() => {
    const checkCart = () => {
      const cart = JSON.parse(localStorage.getItem('contact_cart') || '[]');
      setIsInCart(cart.some(item => item.id === serviceId));
    };

    checkCart();

    window.addEventListener('storage', checkCart);

    return () => {
      window.removeEventListener('storage', checkCart);
    };
  }, [serviceId]);

  const toggleCart = () => {
    const cart = JSON.parse(localStorage.getItem('contact_cart') || '[]');

    if (isInCart) {
      const newCart = cart.filter(item => item.id !== serviceId);
      localStorage.setItem('contact_cart', JSON.stringify(newCart));
      setIsInCart(false);
    } else {
      const newCart = [...cart, service];
      localStorage.setItem('contact_cart', JSON.stringify(newCart));
      setIsInCart(true);
    }

    window.dispatchEvent(new Event('storage'));
  };

  const handleBooking = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      base44.auth.redirectToLogin();
      return;
    }
    if (!bookingDate) return;

    setIsBooking(true);
    try {
      const plannerId = service.planner_id || service.created_by;

      let finalDate = bookingDate;
      if (selectedSlot) {
          finalDate = parseISO(selectedSlot.start_time);
      }

      const newBooking = await base44.entities.Booking.create({
        service_id: service.id,
        planner_id: plannerId,
        client_name: session.user.email,
        event_date: finalDate.toISOString(),
        status: "pending",
        notes: selectedSlot
            ? `${t('serviceDetails.slotLabel')} : ${format(finalDate, 'HH:mm')} - ${format(parseISO(selectedSlot.end_time), 'HH:mm')}\n\n${bookingNotes}`
            : bookingNotes
      });

      await base44.entities.Notification.create({
          user_id: plannerId,
          title: t('serviceDetails.newBookingReqTitle'),
          message: `${t('serviceDetails.newBookingReqMessagePrefix')} ${service.title} ${t('serviceDetails.newBookingReqMessageSuffix')} ${format(bookingDate, 'PPP')}.`,
          type: "booking",
          link: "/Dashboard",
          is_read: false
      });

      try {
        const allUsersForEmail = await base44.entities.User.list();
        const vendorUserForEmail = allUsersForEmail.find(u => u.id === plannerId);
        if (vendorUserForEmail) {
          await SendEmail({
            to: vendorUserForEmail.email,
            subject: "Nouvelle demande de reservation",
            body: `Bonjour ${vendorUserForEmail.full_name || ''},\n\nVous avez une nouvelle demande de reservation pour "${service.title}" le ${format(bookingDate, 'PPP')}.\n\nConnectez-vous a votre tableau de bord pour repondre.\n\nCordialement,\nL'equipe EventCrafter`
          });
        }
      } catch (emailError) {
        console.error("Erreur envoi email (non bloquant):", emailError);
      }

      setBookingSuccess(true);
    } catch (error) {
      console.error("Booking failed", error);
    } finally {
      setIsBooking(false);
    }
  };

  if (serviceUnavailable) return (
    <div className="p-20 text-center">
      <h2 className="text-2xl font-bold text-stone-900 mb-3">Service indisponible</h2>
      <p className="text-stone-500">Cette offre n'est plus disponible pour le moment.</p>
    </div>
  );
  if (!service) return <div className="p-20 text-center animate-pulse">{t('serviceDetails.loadingDetails')}</div>;

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Hero Header */}
      <div className="relative h-[50vh] min-h-[400px] bg-stone-900">
        {service.image_url && (service.image_url.endsWith('.mp4') || service.image_url.endsWith('.webm') || service.image_url.includes('video')) ? (
          <video
            src={service.image_url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            controls
          >
            <source src={service.image_url} type="video/mp4" />
            {t('serviceDetails.videoNotSupported')}
          </video>
        ) : (
          <img
            src={service.image_url}
            alt={service.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
          <div className="container mx-auto">
             <Badge className="bg-rose-600 hover:bg-rose-700 text-white mb-4 border-0">
               {service.category}
             </Badge>
             <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{displayTitle}</h1>
             <div className="flex items-center text-stone-200 text-lg">
               <MapPin className="w-5 h-5 mr-2" /> {service.location}
             </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Video Presentation */}
            {service.video_url && (
              <section className="bg-stone-900 rounded-2xl overflow-hidden">
                <video
                  src={service.video_url}
                  className="w-full aspect-video"
                  controls
                  playsInline
                >
                  <source src={service.video_url} type="video/mp4" />
                  {t('serviceDetails.videoNotSupported')}
                </video>
              </section>
            )}

            {/* Description */}
            <section>
              <h2 className="text-2xl font-bold text-stone-900 mb-4">{t('serviceDetails.about')}</h2>
              <div className="space-y-6">
                  {service.description && (
                    <div>
                        <h3 className="text-lg font-semibold text-stone-800 mb-2">{t('serviceDetails.overview')}</h3>
                        <div className="prose prose-stone max-w-none text-stone-600 leading-relaxed whitespace-pre-line">
                            {displayDescription}
                        </div>
                    </div>
                  )}

                  {service.description_details && (
                    <div>
                        <h3 className="text-lg font-semibold text-stone-800 mb-2">{t('serviceDetails.methodologyTitle')}</h3>
                        <div className="prose prose-stone max-w-none text-stone-600 leading-relaxed whitespace-pre-line">
                            {displayDescriptionDetails}
                        </div>
                    </div>
                  )}

                  {service.description_terms && (
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                        <h3 className="text-lg font-semibold text-amber-900 mb-2">{t('serviceDetails.termsRequirements')}</h3>
                        <div className="prose prose-sm max-w-none text-amber-900/80 leading-relaxed whitespace-pre-line">
                            {displayDescriptionTerms}
                        </div>
                    </div>
                  )}

                  {/* Additional Indicators Section */}
                  {(service.cultural_zones?.length > 0 || service.spoken_languages?.length > 0 || service.diaspora_ready) && (
                      <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 space-y-6">

                          {/* Cultural */}
                          {(service.cultural_zones?.length > 0 || service.cultural_compliance_details) && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <h3 className="font-bold text-stone-900">{t('serviceDetails.culturalTraditional')}</h3>
                                </div>
                                {service.cultural_zones?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {service.cultural_zones.map((zone, i) => (
                                            <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-800 border-amber-200">
                                                {zone}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {service.cultural_compliance_details && (
                                    <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                                        {service.cultural_compliance_details}
                                    </p>
                                )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200">
                                {/* Languages */}
                                {service.spoken_languages?.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Globe className="w-4 h-4 text-blue-600" />
                                            <h4 className="font-semibold text-sm text-stone-800">{t('serviceDetails.languagesLabel')}</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {service.spoken_languages.map((lang, i) => (
                                                <Badge key={i} variant="outline" className="bg-white text-stone-600">
                                                    {lang}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Religion */}
                                {service.religious_compatibility?.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <BookOpen className="w-4 h-4 text-purple-600" />
                                            <h4 className="font-semibold text-sm text-stone-800">{t('serviceDetails.religiousCompatibilityLabel')}</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {service.religious_compatibility.map((rel, i) => (
                                                <Badge key={i} variant="outline" className="bg-white text-stone-600">
                                                    {rel}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                          </div>

                          {/* Diaspora */}
                          {service.diaspora_ready && (
                              <div className="pt-4 border-t border-stone-200">
                                  <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-100">
                                      <Plane className="w-5 h-5 text-green-600" />
                                      <div>
                                          <span className="block font-bold text-green-800 text-sm">{t('serviceDetails.diasporaReadyLabel')}</span>
                                          <span className="text-xs text-green-700">{t('serviceDetails.diasporaReadyLongDesc')}</span>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
            </section>

            {/* Features (Static for demo) */}
            <section className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <h3 className="font-semibold text-lg mb-4">{t('serviceDetails.whatsIncluded')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  t('serviceDetails.feature1'),
                  t('serviceDetails.feature2'),
                  t('serviceDetails.feature3'),
                  t('serviceDetails.feature4'),
                  t('serviceDetails.feature5')
                ].map((item, i) => (
                  <div key={i} className="flex items-center text-stone-600">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    {item}
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews Section */}
            <ReviewsSection
              serviceId={service.id}
              serviceTitle={service.title}
              onReviewAdded={() => {
                const fetchUpdated = async () => {
                  const data = await base44.entities.Service.list();
                  const found = data.find(s => s.id === serviceId);
                  if (found) setService(found);
                };
                fetchUpdated();
              }}
            />
          </div>

          {/* Sidebar Booking Card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <Card className="border-stone-200 shadow-xl shadow-stone-200/50 overflow-hidden">
                <div className="bg-rose-600 h-2 w-full" />
                <CardContent className="p-6">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <span className="text-stone-400 text-sm">
                        {hasPriceRange ? t('serviceCard.priceRangeLabel') : t('serviceDetails.startingAt')}
                      </span>
                      <div className="text-3xl font-bold text-stone-900">
                        {hasPriceRange
                          ? `${formatPrice(service.price_min)} - ${formatPrice(service.price_max)}`
                          : formatPrice(service.price_min)}
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="block text-stone-500 text-xs mb-1">{t('serviceDetails.perEvent')}</span>
                    </div>
                  </div>

                  {!bookingSuccess ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('serviceDetails.selectDate')}</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !bookingDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {bookingDate ? format(bookingDate, "PPP") : <span>{t('serviceDetails.pickDate')}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={bookingDate}
                              onSelect={(d) => { setBookingDate(d); setSelectedSlot(null); }}
                              initialFocus
                              disabled={(date) => date < new Date()}
                              modifiers={{
                                  hasSlots: (d) => availableSlots.some(s => s.type === 'available' && isSameDay(parseISO(s.start_time), d))
                              }}
                              modifiersStyles={{
                                  hasSlots: { fontWeight: 'bold', color: '#16a34a', textDecoration: 'underline' }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Available Slots Display */}
                      {bookingDate && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                             {(() => {
                                 const daysSlots = availableSlots
                                    .filter(s => s.type === 'available' && isSameDay(parseISO(s.start_time), bookingDate))
                                    .sort((a,b) => new Date(a.start_time) - new Date(b.start_time));

                                 if (daysSlots.length > 0) {
                                     return (
                                         <div className="grid grid-cols-2 gap-2 mb-2">
                                             {daysSlots.map(slot => (
                                                 <div
                                                    key={slot.id}
                                                    onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                                                    className={cn(
                                                        "text-sm border rounded p-2 text-center cursor-pointer transition-colors",
                                                        selectedSlot?.id === slot.id
                                                            ? "bg-rose-600 text-white border-rose-600"
                                                            : "bg-white hover:border-rose-300 text-stone-700"
                                                    )}
                                                 >
                                                     {format(parseISO(slot.start_time), 'HH:mm')}
                                                 </div>
                                             ))}
                                         </div>
                                     );
                                 } else {
                                     return <p className="text-xs text-stone-500 italic mb-2">{t('serviceDetails.fullDayAvailability')}</p>;
                                 }
                             })()}
                          </div>
                      )}

                      <div className="space-y-2">
                        <Label>{t('serviceDetails.messageToProviderLabel')}</Label>
                        <Textarea
                          placeholder={t('serviceDetails.messagePlaceholder')}
                          className="resize-none"
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                        />
                      </div>

                      <Button
                        className="w-full bg-rose-600 hover:bg-rose-700 h-12 text-lg"
                        onClick={handleBooking}
                        disabled={isBooking || !bookingDate}
                      >
                        {isBooking ? t('serviceDetails.sending') : t('serviceDetails.requestBook')}
                      </Button>

                      {!currentUser && (
                         <p className="text-xs text-center text-stone-400">{t('serviceDetails.signInPrompt')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 animate-in fade-in zoom-in">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-stone-900 mb-2">{t('serviceDetails.requestSent')}</h3>
                      <p className="text-stone-500 mb-6">{t('serviceDetails.requestSentDesc')}</p>
                      <Button variant="outline" className="w-full" onClick={() => setBookingSuccess(false)}>
                        {t('serviceDetails.sendAnother')}
                      </Button>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-stone-100 space-y-3">
                    <div className="flex items-center text-stone-500 text-sm gap-2">
                       <ShieldCheck className="w-4 h-4 text-rose-500" /> {t('serviceDetails.securePayment')}
                    </div>
                    <div className="flex items-center text-stone-500 text-sm gap-2">
                       <MessageSquare className="w-4 h-4 text-rose-500" /> {t('serviceDetails.fastResponse')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 flex flex-col gap-2">
                 <Button
                   variant="outline"
                   className="w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                   onClick={async () => {
                     const { data: { session } } = await supabase.auth.getSession();
                     if (!session) {
                       base44.auth.redirectToLogin();
                       return;
                     }
                     const allConvs = await base44.entities.Conversation.list();
                     const existing = allConvs.find(c =>
                       c.participants.includes(session.user.id) &&
                       c.participants.includes(service.planner_id)
                     );

                     if (existing) {
                       window.location.href = `/Chat?conversationId=${existing.id}`;
                     } else {
                       const newConv = await base44.entities.Conversation.create({
                         participants: [String(session.user.id), String(service.planner_id)],
                         last_message: t('serviceDetails.conversationStarted'),
                         last_message_at: new Date().toISOString()
                       });
                       window.location.href = `/Chat?conversationId=${newConv.id}`;
                     }
                   }}
                 >
                   <MessageSquare className="w-4 h-4 mr-2" /> {t('serviceDetails.messageVendor')}
                 </Button>
                 {planner?.phone && (
                   <Button
                     variant="outline"
                     className="w-full border-green-500 text-green-600 hover:bg-green-50"
                     onClick={() => window.open(`https://wa.me/${planner.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                   >
                     <MessageSquare className="w-4 h-4 mr-2" /> {t('serviceDetails.whatsappChat')}
                   </Button>
                 )}
                 <Button
                   variant={isInCart ? "default" : "outline"}
                   className={isInCart
                     ? "w-full bg-green-600 hover:bg-green-700 text-white"
                     : "w-full border-rose-200 text-rose-600 hover:bg-rose-50"
                   }
                   onClick={toggleCart}
                 >
                   <ShoppingCart className="w-4 h-4 mr-2" />
                   {isInCart ? t('serviceDetails.inCart') : t('serviceDetails.addToCart')}
                 </Button>
                 <div className="flex gap-2 justify-center">
                  <Button variant="ghost" size="sm" className="text-stone-500 flex-1">
                    <Share2 className="w-4 h-4 mr-2" /> {t('serviceDetails.share')}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-stone-500 flex-1">
                    <Heart className="w-4 h-4 mr-2" /> {t('serviceDetails.save')}
                  </Button>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
