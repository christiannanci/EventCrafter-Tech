import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/apiClient";
import { createPageUrl } from '@/utils';
import { 
  User, Mail, Phone, Calendar, MapPin, Users, Wallet, 
  FileText, Hash, CreditCard, CheckCircle2, StickyNote,
  MessageSquare, Loader2
} from "lucide-react";

export default function DossierDetailDialog({ dossier, open, onOpenChange }) {
  const [booking, setBooking] = useState(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !dossier) return;

    const loadDetails = async () => {
      setLoading(true);
      try {
        const [bookingResult, leadResult] = await Promise.all([
          dossier.bookingId 
            ? base44.entities.Booking.get(dossier.bookingId).catch(() => null) 
            : Promise.resolve(null),
          dossier.type === 'lead' 
            ? base44.entities.Lead.get(dossier.id).catch(() => null) 
            : Promise.resolve(null)
        ]);
        setBooking(bookingResult);
        setLead(leadResult);
      } catch (error) {
        console.error('Error loading dossier details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [open, dossier]);

  if (!dossier) return null;

  // Fusion dossier > booking > lead (priorité décroissante)
  const clientName = dossier.clientName || lead?.client_name || 'Client';
  const clientEmail = dossier.clientEmail || lead?.client_email || booking?.client_email || '';
  const clientPhone = dossier.clientPhone || lead?.client_phone || booking?.client_phone || '';
  const eventType = dossier.eventType || lead?.event_type || booking?.event_type || '';
  const eventDate = dossier.eventDate || lead?.event_date || booking?.event_date || null;
  const location = dossier.location || lead?.location || booking?.location || '';
  const guestCount = lead?.guest_count || booking?.guest_count || '';
  const serviceCategory = lead?.service_category || booking?.service_category || '';
  const budget = dossier.budget || lead?.budget || '';
  const description = dossier.description || lead?.description || '';

  const bookingCode = booking?.booking_code || '';
  const bookingStatus = booking?.status || dossier.bookingStatus || '';
  const paymentStatus = booking?.payment_status || '';
  const quantity = booking?.quantity || '';
  const unit = booking?.unit || '';
  const unitPrice = booking?.unit_price;
  const totalAmount = booking?.total_amount ?? dossier.amount;
  const amountPaid = booking?.amount_paid;
  const requestDate = booking?.created_date || dossier.lastUpdate;

  const conditions = [booking?.condition_1, booking?.condition_2, booking?.condition_3, booking?.condition_4]
    .filter(Boolean);

  const notes = booking?.notes || '';

  const handleOpenChat = () => {
    if (dossier.conversationId) {
      window.location.href = createPageUrl(`Chat?conversationId=${dossier.conversationId}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-600" />
            Détail du dossier
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Client */}
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Informations Client
              </h4>
              <div className="space-y-1.5 text-sm text-stone-700">
                <p className="font-medium">{clientName}</p>
                {clientEmail && (
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-stone-400" /> {clientEmail}</p>
                )}
                {clientPhone && (
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-stone-400" /> {clientPhone}</p>
                )}
              </div>
            </div>

            {/* Événement */}
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Détails de l'Événement
              </h4>
              <div className="grid md:grid-cols-2 gap-2 text-sm text-stone-700">
                {eventType && <p><span className="text-stone-500">Type :</span> {eventType}</p>}
                {serviceCategory && <p><span className="text-stone-500">Catégorie :</span> {serviceCategory}</p>}
                {eventDate && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    {new Date(eventDate).toLocaleDateString('fr-FR')}
                  </p>
                )}
                {location && (
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-stone-400" /> {location}</p>
                )}
                {guestCount && (
                  <p className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-stone-400" /> {guestCount} invités</p>
                )}
                {budget && (
                  <p className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-stone-400" /> Budget : {budget}</p>
                )}
              </div>
            </div>

            {/* Description du besoin */}
            {description && (
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <h4 className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Description du Besoin
                </h4>
                <p className="text-sm text-stone-700 bg-white p-3 rounded border">{description}</p>
              </div>
            )}

            {/* Réservation */}
            {booking && (
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4" /> Détails de la Réservation
                </h4>
                <div className="grid md:grid-cols-2 gap-2 text-sm text-stone-700">
                  {bookingCode && <p><span className="text-stone-500">Code :</span> {bookingCode}</p>}
                  {bookingStatus && <p><span className="text-stone-500">Statut :</span> <Badge variant="outline" className="text-xs">{bookingStatus}</Badge></p>}
                  {paymentStatus && (
                    <p className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-stone-400" />
                      Paiement : {paymentStatus}
                    </p>
                  )}
                  {quantity && <p><span className="text-stone-500">Quantité :</span> {quantity}{unit ? ` ${unit}` : ''}</p>}
                  {unitPrice != null && <p><span className="text-stone-500">Prix unitaire :</span> {Number(unitPrice).toLocaleString()} FCFA</p>}
                  {totalAmount != null && (
                    <p className="font-semibold text-green-700"><span className="text-stone-500 font-normal">Total :</span> {Number(totalAmount).toLocaleString()} FCFA</p>
                  )}
                  {amountPaid != null && <p><span className="text-stone-500">Déjà payé :</span> {Number(amountPaid).toLocaleString()} FCFA</p>}
                  {requestDate && (
                    <p><span className="text-stone-500">Date demande :</span> {new Date(requestDate).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Conditions négociées */}
            {conditions.length > 0 && (
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <h4 className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Conditions Négociées
                </h4>
                <ul className="space-y-1 text-sm text-stone-700">
                  {conditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <h4 className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-2">
                  <StickyNote className="w-4 h-4" /> Notes
                </h4>
                <p className="text-sm text-stone-700">{notes}</p>
              </div>
            )}

            {/* Action rapide */}
            {dossier.conversationId && (
              <Button onClick={handleOpenChat} className="w-full bg-rose-600 hover:bg-rose-700">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ouvrir la discussion
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
