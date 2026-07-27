import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/apiClient';
import { CheckCircle2, Star, Award, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { NotificationService } from '@/components/NotificationService';

export default function ServiceCompletionPrompt({ dossier, userType, onComplete }) {
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [culturalRating, setCulturalRating] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Vérifier si l'événement est passé et le service pas encore marqué comme terminé
    if (!dossier.eventDate) return;
    
    const eventDate = new Date(dossier.eventDate);
    const now = new Date();
    const isEventPassed = eventDate < now;
    const isNotCompleted = dossier.bookingStatus !== 'completed' && dossier.bookingStatus !== 'cancelled';
    
    setShowPrompt(isEventPassed && isNotCompleted && dossier.bookingStatus === 'in_progress');
  }, [dossier]);

  const handleMarkComplete = async () => {
    setLoading(true);
    try {
      const booking = await base44.entities.Booking.list();
      const currentBooking = booking.find(b => b.id === dossier.bookingId);
      
      if (!currentBooking) {
        throw new Error('Booking not found');
      }

      // Mettre à jour le statut
      await base44.entities.Booking.update(dossier.bookingId, {
        status: 'completed',
        payment_status: 'fully_paid'
      });

      // Libérer les fonds si en escrow
      const transactions = await base44.entities.Transaction.filter({ booking_id: dossier.bookingId });
      const escrowTx = transactions.find(t => t.status === 'escrow_held');
      
      if (escrowTx) {
        await base44.entities.Transaction.update(escrowTx.id, {
          status: 'released',
          description: escrowTx.description + ' (Released on completion)'
        });
      }

      // Notification à l'admin
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      for (const admin of adminUsers) {
        await base44.entities.Notification.create({
          user_id: admin.id,
          title: '🏁 Service Terminé Confirmé',
          message: `Le dossier ${dossier.bookingId.substring(0, 8)} a été marqué comme terminé par ${userType === 'vendor' ? 'le prestataire' : 'le client'}`,
          type: 'admin_alert',
          link: '/AdminDashboard',
          is_read: false
        });
      }

      // Notification à l'autre partie
      if (userType === 'vendor') {
        // Notifier le client
        const allUsers = await base44.entities.User.list();
        const clientUser = allUsers.find(u => u.email === currentBooking.created_by);
        if (clientUser) {
          await base44.entities.Notification.create({
            user_id: clientUser.id,
            title: '✅ Service Marqué Terminé',
            message: `Le prestataire a confirmé la fin du service. Laissez votre avis !`,
            type: 'completion',
            link: '/ClientDashboard',
            is_read: false
          });
        }
      } else {
        // Notifier le vendeur
        await NotificationService.sendToVendor({
          vendorId: currentBooking.planner_id,
          title: '✅ Service Confirmé Terminé',
          message: `Le client a confirmé la fin du service. Les fonds ont été libérés.`,
          type: 'completion',
          link: '/VendorDashboard?tab=dossiers'
        });
      }

      toast({
        title: '🎉 Service Marqué Terminé',
        description: 'Le dossier a été archivé avec succès'
      });

      // Si c'est le client, ouvrir le formulaire d'évaluation
      if (userType === 'client') {
        setTimeout(() => {
          setShowReviewDialog(true);
        }, 500);
      }

      if (onComplete) onComplete();

    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer le service comme terminé',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast({
        title: 'Note requise',
        description: 'Veuillez donner une note avant de soumettre',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const booking = await base44.entities.Booking.list();
      const currentBooking = booking.find(b => b.id === dossier.bookingId);

      // Créer l'avis
      await base44.entities.ClientReview.create({
        booking_id: dossier.bookingId,
        service_id: currentBooking?.service_id,
        vendor_id: currentBooking?.planner_id,
        rating: rating,
        comment: comment,
        cultural_integrity_rating: culturalRating || rating,
        verified_booking: true
      });

      // Mettre à jour la note moyenne du vendeur
      const allReviews = await base44.entities.ClientReview.filter({ 
        vendor_id: currentBooking?.planner_id 
      });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      
      const vendorProfiles = await base44.entities.VendorProfile.filter({ 
        user_id: currentBooking?.planner_id 
      });
      
      if (vendorProfiles.length > 0) {
        // Note: Il faudrait ajouter un champ rating sur VendorProfile
        // Pour l'instant on stocke dans les services
        const services = await base44.entities.Service.filter({ 
          planner_id: currentBooking?.planner_id 
        });
        
        for (const service of services) {
          await base44.entities.Service.update(service.id, {
            rating: avgRating,
            review_count: allReviews.length
          });
        }
      }

      toast({
        title: '⭐ Merci pour votre avis !',
        description: 'Votre évaluation a été enregistrée'
      });

      setShowReviewDialog(false);

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre votre avis',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <>
      <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                🔔 Service terminé ?
              </h3>
              <p className="text-sm text-amber-800 mb-4">
                {userType === 'vendor' 
                  ? "Avez-vous terminé votre mission ? Confirmez pour clôturer le dossier et recevoir vos fonds."
                  : "Le prestataire a-t-il terminé sa mission ? Confirmez pour libérer les fonds et laisser votre avis."
                }
              </p>
              <Button 
                onClick={handleMarkComplete}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {loading ? 'Traitement...' : 'Oui, Service Terminé'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'évaluation (pour clients) */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Évaluez votre expérience
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Note générale */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Note générale</label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= rating 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Note intégrité culturelle */}
            <div className="space-y-2 border-t pt-4">
              <label className="text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                Respect de l'Intégrité Culturelle
              </label>
              <p className="text-xs text-stone-500 mb-2">
                Le prestataire a-t-il respecté vos traditions et valeurs culturelles ?
              </p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setCulturalRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Award
                      className={`w-8 h-8 ${
                        star <= culturalRating 
                          ? 'fill-purple-400 text-purple-400' 
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Commentaire */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Commentaire (optionnel)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience avec les futurs clients..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
                className="flex-1"
              >
                Plus tard
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={loading || rating === 0}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {loading ? 'Envoi...' : 'Publier mon Avis'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}