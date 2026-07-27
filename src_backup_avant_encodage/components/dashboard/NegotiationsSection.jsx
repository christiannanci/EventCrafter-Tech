import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Video, 
  Phone, 
  MapPin, 
  Clock,
  CheckCircle2,
  Loader2,
  Calendar,
  User,
  FileText
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NegotiationsSection({ vendorId }) {
  const [negotiations, setNegotiations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'en_cours', 'approuve'
  const { toast } = useToast();

  useEffect(() => {
    loadNegotiations();
  }, [vendorId]);

  const loadNegotiations = async () => {
    if (!vendorId) return;
    
    setLoading(true);
    try {
      // Charger toutes les négociations du vendor
      const allNegotiations = await base44.entities.NegotiationLog.list();
      const vendorNegotiations = allNegotiations.filter(n => n.provider_id === vendorId);
      
      // Charger les bookings associés
      const bookingIds = [...new Set(vendorNegotiations.map(n => n.booking_id))];
      const allBookings = await base44.entities.Booking.list();
      const relatedBookings = allBookings.filter(b => bookingIds.includes(b.id));
      
      setNegotiations(vendorNegotiations);
      setBookings(relatedBookings);
    } catch (error) {
      console.error('Error loading negotiations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les négociations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNegotiationStatus = async (negotiationId, newStatus) => {
    try {
      await base44.entities.NegotiationLog.update(negotiationId, { status: newStatus });
      
      if (newStatus === 'approuve') {
        await base44.entities.NegotiationLog.update(negotiationId, { deal_concluded: true });
      }
      
      toast({
        title: "Statut mis à jour",
        description: `Négociation marquée comme ${newStatus === 'en_cours' ? 'en cours' : 'approuvée'}`
      });
      
      loadNegotiations();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const getInteractionIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Phone className="w-4 h-4" />;
      case 'visit': return <MapPin className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getInteractionLabel = (type) => {
    const labels = {
      text: 'Message',
      video: 'Visio',
      audio: 'Appel',
      visit: 'Visite'
    };
    return labels[type] || type;
  };

  const StatusBadge = ({ status }) => {
    const config = {
      en_cours: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Cours', icon: Loader2 },
      approuve: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approuvé', icon: CheckCircle2 },
      termine: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Terminé', icon: CheckCircle2 }
    };
    const { bg, text, label, icon: Icon } = config[status] || config.en_cours;
    
    return (
      <Badge className={`${bg} ${text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const filteredNegotiations = negotiations.filter(n => {
    if (filter === 'all') return n.status !== 'termine';
    return n.status === filter;
  });

  // Regrouper par booking
  const negotiationsByBooking = filteredNegotiations.reduce((acc, neg) => {
    if (!acc[neg.booking_id]) acc[neg.booking_id] = [];
    acc[neg.booking_id].push(neg);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        <span className="ml-3 text-stone-600">Chargement des négociations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Demandes en Cours de Négociation</h2>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'en_cours' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('en_cours')}
          >
            En Cours
          </Button>
          <Button
            variant={filter === 'approuve' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approuve')}
          >
            Approuvées
          </Button>
        </div>
      </div>

      {filteredNegotiations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center">
            <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-2">Aucune négociation active</h3>
            <p className="text-stone-500">
              {filter === 'all' 
                ? "Vos négociations avec les clients apparaîtront ici"
                : `Aucune négociation ${filter === 'en_cours' ? 'en cours' : 'approuvée'}`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(negotiationsByBooking).map(([bookingId, negs]) => {
            const booking = bookings.find(b => b.id === bookingId);
            const latestNeg = negs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            
            return (
              <Card key={bookingId} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-stone-600" />
                        {booking?.client_name || 'Client'}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-stone-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {booking?.event_date ? new Date(booking.event_date).toLocaleDateString('fr-FR') : 'Date non définie'}
                        </div>
                        <div className="flex items-center gap-1">
                          {getInteractionIcon(latestNeg.interaction_type)}
                          {getInteractionLabel(latestNeg.interaction_type)}
                        </div>
                        {latestNeg.duration_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {latestNeg.duration_minutes} min
                          </div>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={latestNeg.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Notes de la dernière négociation */}
                    {latestNeg.notes && (
                      <div className="bg-stone-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-stone-500 mt-0.5" />
                          <p className="text-sm text-stone-700">{latestNeg.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Historique des échanges */}
                    {negs.length > 1 && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-stone-500 mb-2">
                          {negs.length} échange{negs.length > 1 ? 's' : ''} au total
                        </p>
                        <div className="flex gap-1">
                          {negs.slice(0, 5).map((neg, idx) => (
                            <div key={idx} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs">
                              {getInteractionIcon(neg.interaction_type)}
                            </div>
                          ))}
                          {negs.length > 5 && (
                            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs text-stone-600">
                              +{negs.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {latestNeg.status === 'en_cours' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateNegotiationStatus(latestNeg.id, 'approuve')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Marquer comme Approuvé
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/Chat?bookingId=${bookingId}`}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Continuer la Discussion
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}