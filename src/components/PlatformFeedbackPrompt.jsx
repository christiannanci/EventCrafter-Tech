import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PlatformFeedbackPrompt({ user, userRole }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
  const [completedBookingsCount, setCompletedBookingsCount] = useState(0);
  const [rating, setRating] = useState(0);
  const [npsScore, setNpsScore] = useState(null);
  const [comment, setComment] = useState('');
  const [benefits, setBenefits] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user) return;

      try {
        // Vérifier si l'utilisateur a déjà donné un feedback
        const existingFeedback = await base44.entities.PlatformFeedback.filter({ user_id: user.id });
        if (existingFeedback.length > 0) {
          setHasGivenFeedback(true);
          return;
        }

        // Compter les bookings complétés
        const allBookings = await base44.entities.Booking.list();
        const userBookings = allBookings.filter(b => 
          (userRole === 'client' ? b.created_by === user.id : b.planner_id === user.id) &&
          b.status === 'completed'
        );

        setCompletedBookingsCount(userBookings.length);

        // Afficher le prompt si >= 3 bookings complétés
        if (userBookings.length >= 3 && !hasGivenFeedback) {
          setShowPrompt(true);
        }
      } catch (error) {
        console.error('Error checking feedback eligibility:', error);
      }
    };

    checkEligibility();
  }, [user, userRole, hasGivenFeedback]);

  const handleSubmit = async () => {
    if (rating === 0 || !comment.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez donner une note et un commentaire",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      await base44.entities.PlatformFeedback.create({
        user_id: user.id,
        user_role: userRole,
        feedback_type: "satisfaction",
        rating,
        nps_score: npsScore,
        comment,
        benefits_experienced: benefits,
        performance_rating: rating,
        is_public: false,
        status: "new",
        moderation_status: "pending"
      });

      toast({
        title: "✨ Merci pour votre retour !",
        description: "Votre avis nous aide à améliorer la plateforme"
      });

      setHasGivenFeedback(true);
      setShowPrompt(false);
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre feedback",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!showPrompt || hasGivenFeedback) return null;

  return (
    <>
      <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-stone-900">Votre avis compte !</h3>
              </div>
              <p className="text-sm text-stone-700 mb-3">
                Vous avez utilisé notre plateforme pour {completedBookingsCount} service{completedBookingsCount > 1 ? 's' : ''} réussi{completedBookingsCount > 1 ? 's' : ''}. 
                Partagez votre expérience et aidez-nous à nous améliorer !
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => setIsDialogOpen(true)}
                >
                  Donner mon avis
                </Button>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPrompt(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partagez votre expérience sur EventCrafter</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Rating */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Comment évaluez-vous votre expérience globale ? *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* NPS Score */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Recommanderiez-vous EventCrafter à vos proches ? (0 = Non, 10 = Absolument)
              </label>
              <div className="grid grid-cols-11 gap-1">
                {[...Array(11)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setNpsScore(i)}
                    className={`h-10 rounded text-sm font-medium transition-all ${
                      npsScore === i
                        ? 'bg-amber-600 text-white scale-110'
                        : 'bg-stone-100 hover:bg-stone-200'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Parlez-nous de votre expérience *
              </label>
              <Textarea
                placeholder="Qu'avez-vous apprécié ? Qu'est-ce qui pourrait être amélioré ?"
                className="h-32"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Benefits */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Quels bénéfices avez-vous tirés de notre plateforme ?
              </label>
              <Textarea
                placeholder="Ex: Gain de temps, économies, qualité des prestataires, facilité d'utilisation..."
                className="h-24"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Envoi...' : 'Envoyer mon avis'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}