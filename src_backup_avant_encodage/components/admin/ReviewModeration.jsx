import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle, XCircle, User, Building2, Package, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { NotificationService } from "@/components/NotificationService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Blacklist de mots-clés suspects pour pré-modération
const BLACKLIST_KEYWORDS = [
  'merde', 'connard', 'salaud', 'putain', 'enfoiré', 'idiot', 'con',
  'raciste', 'voleur', 'arnaque', 'scam', 'fraud', 'fake',
  '@', 'gmail.com', 'yahoo.com', '+237', '+33', 'whatsapp',
  'http://', 'https://', 'www.'
];

const detectSuspiciousContent = (text) => {
  if (!text) return { isSuspicious: false, reasons: [] };
  const lowerText = text.toLowerCase();
  const reasons = [];
  
  BLACKLIST_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      reasons.push(`Contient: "${keyword}"`);
    }
  });
  
  return { isSuspicious: reasons.length > 0, reasons };
};

export default function ReviewModeration() {
  const [serviceReviews, setServiceReviews] = useState([]);
  const [vendorReviews, setVendorReviews] = useState([]);
  const [clientReviews, setClientReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [moderationNote, setModerationNote] = useState("");
  const [actionType, setActionType] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const [services, vendors, clients] = await Promise.all([
        base44.entities.Review.list(),
        base44.entities.VendorReview.list(),
        base44.entities.ClientReview.list(),
      ]);

      setServiceReviews(services.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setVendorReviews(vendors.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setClientReviews(clients.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de charger les avis", variant: "destructive", duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  const handleModeration = async () => {
    if (!selectedReview || !actionType) return;

    const newStatus = actionType === 'approve' ? 'approved' : 'rejected';
    const entityName = selectedReview.entityType;

    try {
      // 1. Mettre à jour le statut de l'avis
      await base44.entities[entityName].update(selectedReview.id, {
        status: newStatus,
        moderation_note: moderationNote || undefined
      });

      // 2. Recalculer les moyennes si approuvé (pour Service/Vendor)
      if (newStatus === 'approved') {
        await recalculateRatings(selectedReview, entityName);
      }

      // 3. Envoyer notification email à l'auteur de l'avis
      await sendModerationNotification(selectedReview, newStatus);

      // 4. Si approuvé, notifier la personne évaluée
      if (newStatus === 'approved') {
        await notifyReviewedEntity(selectedReview, entityName);
      }

      toast({ 
        title: actionType === 'approve' ? "Avis approuvé ✓" : "Avis rejeté",
        description: newStatus === 'approved' 
          ? "L'avis est maintenant public et la note a été mise à jour"
          : "L'avis a été rejeté. L'auteur a été informé.",
        duration: 4000
      });

      setSelectedReview(null);
      setModerationNote("");
      setActionType(null);
      fetchReviews();
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de modifier l'avis", variant: "destructive", duration: 4000 });
    }
  };

  // Recalcule la moyenne uniquement sur les avis approuvés
  const recalculateRatings = async (review, entityName) => {
    try {
      if (entityName === 'Review' && review.service_id) {
        const allReviews = await base44.entities.Review.filter({ 
          service_id: review.service_id,
          status: 'approved'
        });
        
        if (allReviews.length > 0) {
          const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
          await base44.entities.Service.update(review.service_id, {
            rating: Math.round(avgRating * 10) / 10,
            review_count: allReviews.length
          });
        }
      } else if (entityName === 'VendorReview' && review.provider_id) {
        const allReviews = await base44.entities.VendorReview.filter({ 
          provider_id: review.provider_id,
          status: 'approved'
        });
        
        if (allReviews.length > 0) {
          const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
          const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: review.provider_id });
          if (vendorProfiles.length > 0) {
            // Stocker dans une métadonnée ou créer un champ rating dans VendorProfile si besoin
          }
        }
      }
    } catch (e) {
      console.error('Erreur recalcul ratings:', e);
    }
  };

  // Notification à l'auteur de l'avis
  const sendModerationNotification = async (review, status) => {
    try {
      const authorId = review.created_by || review.client_id;
      if (!authorId) return;

      const message = status === 'approved'
        ? `Votre avis a été approuvé et est maintenant visible publiquement. Merci pour votre contribution !`
        : `Votre avis a été rejeté. ${moderationNote ? `Raison: ${moderationNote}` : 'Il ne respecte pas nos conditions d\'utilisation.'}`;

      await NotificationService.send({
        userId: authorId,
        title: status === 'approved' ? '✓ Avis approuvé' : 'Avis rejeté',
        message,
        type: 'system',
        link: ''
      });
    } catch (e) {
      console.error('Erreur notification auteur:', e);
    }
  };

  // Notification à la personne/service évalué
  const notifyReviewedEntity = async (review, entityName) => {
    try {
      let recipientId = null;
      let entityType = '';

      if (entityName === 'Review' && review.service_id) {
        const services = await base44.entities.Service.filter({ id: review.service_id });
        if (services.length > 0) {
          recipientId = services[0].planner_id;
          entityType = 'service';
        }
      } else if (entityName === 'VendorReview' && review.provider_id) {
        recipientId = review.provider_id;
        entityType = 'profil vendeur';
      } else if (entityName === 'ClientReview' && review.client_id) {
        recipientId = review.client_id;
        entityType = 'profil client';
      }

      if (recipientId) {
        await NotificationService.send({
          userId: recipientId,
          title: `Nouvel avis publié - ${review.rating}⭐`,
          message: `Un client a laissé un avis ${review.rating}/5 sur votre ${entityType}. Vous pouvez y répondre pour montrer votre professionnalisme.`,
          type: 'system',
          link: entityName === 'Review' ? `/ServiceDetails?id=${review.service_id}` : ''
        });
      }
    } catch (e) {
      console.error('Erreur notification entité évaluée:', e);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} 
      />
    ));
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status] || "bg-stone-100"}>{status}</Badge>;
  };

  const ReviewCard = ({ review, entityType, icon: Icon }) => {
    const suspiciousCheck = detectSuspiciousContent(review.comment);
    
    return (
      <Card className={suspiciousCheck.isSuspicious ? 'border-2 border-amber-400' : ''}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-full">
                <Icon className="w-4 h-4 text-stone-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex">{renderStars(review.rating)}</div>
                  <span className="text-sm font-medium">{review.rating}/5</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {format(new Date(review.created_date), 'dd/MM/yyyy à HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {suspiciousCheck.isSuspicious && (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              <StatusBadge status={review.status || 'pending'} />
            </div>
          </div>

          {suspiciousCheck.isSuspicious && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <div className="flex items-center gap-2 text-amber-800 font-semibold mb-1">
                <AlertTriangle className="w-3 h-3" />
                Contenu suspect détecté
              </div>
              <ul className="text-amber-700 text-[10px] space-y-1">
                {suspiciousCheck.reasons.map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-stone-700 mb-3 line-clamp-3">{review.comment}</p>

          {review.moderation_note && (
            <div className="mb-3 p-2 bg-stone-50 rounded text-xs text-stone-600">
              <strong>Note admin:</strong> {review.moderation_note}
            </div>
          )}

          {(!review.status || review.status === 'pending') && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedReview({ ...review, entityType });
                  setActionType('approve');
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setSelectedReview({ ...review, entityType });
                  setActionType('reject');
                }}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const filterByStatus = (reviews, status) => 
    reviews.filter(r => (r.status || 'pending') === status);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
        <p className="text-stone-600">Chargement des avis...</p>
      </div>
    );
  }

  const pendingCount = 
    filterByStatus(serviceReviews, 'pending').length +
    filterByStatus(vendorReviews, 'pending').length +
    filterByStatus(clientReviews, 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Modération des Avis</h2>
        <p className="text-stone-600">Gérez et modérez les avis des utilisateurs</p>
      </div>

      {pendingCount > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-1" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  {pendingCount} avis en attente de modération
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Vérifiez et approuvez les nouveaux avis
                </p>
                <div className="mt-3 p-3 bg-white rounded text-xs text-stone-700 space-y-1">
                  <p className="font-semibold text-stone-900">📋 Obligations légales (RGPD):</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Ne pas modifier le sens de l'avis</li>
                    <li>Informer l'utilisateur en cas de rejet avec justification</li>
                    <li>Vérifier l'absence de données personnelles (email, tél, adresse)</li>
                    <li>Seuls les avis approuvés comptent dans la moyenne</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">
            Avis Services ({filterByStatus(serviceReviews, 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="vendors">
            Avis Vendors ({filterByStatus(vendorReviews, 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="clients">
            Avis Clients ({filterByStatus(clientReviews, 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">En attente ({filterByStatus(serviceReviews, 'pending').length})</TabsTrigger>
              <TabsTrigger value="approved">Approuvés ({filterByStatus(serviceReviews, 'approved').length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés ({filterByStatus(serviceReviews, 'rejected').length})</TabsTrigger>
            </TabsList>

            {['pending', 'approved', 'rejected'].map(status => (
              <TabsContent key={status} value={status} className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {filterByStatus(serviceReviews, status).length > 0 ? (
                    filterByStatus(serviceReviews, status).map(review => (
                      <ReviewCard key={review.id} review={review} entityType="Review" icon={Package} />
                    ))
                  ) : (
                    <p className="col-span-2 text-center py-8 text-stone-500">Aucun avis {status}</p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="vendors" className="mt-6">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">En attente ({filterByStatus(vendorReviews, 'pending').length})</TabsTrigger>
              <TabsTrigger value="approved">Approuvés ({filterByStatus(vendorReviews, 'approved').length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés ({filterByStatus(vendorReviews, 'rejected').length})</TabsTrigger>
            </TabsList>

            {['pending', 'approved', 'rejected'].map(status => (
              <TabsContent key={status} value={status} className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {filterByStatus(vendorReviews, status).length > 0 ? (
                    filterByStatus(vendorReviews, status).map(review => (
                      <ReviewCard key={review.id} review={review} entityType="VendorReview" icon={Building2} />
                    ))
                  ) : (
                    <p className="col-span-2 text-center py-8 text-stone-500">Aucun avis {status}</p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">En attente ({filterByStatus(clientReviews, 'pending').length})</TabsTrigger>
              <TabsTrigger value="approved">Approuvés ({filterByStatus(clientReviews, 'approved').length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés ({filterByStatus(clientReviews, 'rejected').length})</TabsTrigger>
            </TabsList>

            {['pending', 'approved', 'rejected'].map(status => (
              <TabsContent key={status} value={status} className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {filterByStatus(clientReviews, status).length > 0 ? (
                    filterByStatus(clientReviews, status).map(review => (
                      <ReviewCard key={review.id} review={review} entityType="ClientReview" icon={User} />
                    ))
                  ) : (
                    <p className="col-span-2 text-center py-8 text-stone-500">Aucun avis {status}</p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approuver' : 'Rejeter'} l'avis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Note optionnelle pour expliquer votre décision:
            </p>
            <Textarea
              placeholder="Raison de l'approbation/rejet (optionnel)..."
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              className="h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleModeration}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {actionType === 'approve' ? 'Approuver' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}