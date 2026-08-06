import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, XCircle, MessageSquareText, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export default function PlatformReviewModeration() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending, approved, rejected, all
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.PlatformFeedback.list('-created_date', 200);
      setFeedbacks(all || []);
    } catch (error) {
      console.error("Failed to load platform feedbacks", error);
      toast({ title: "Erreur", description: "Impossible de charger les avis", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (feedback) => {
    setProcessing(feedback.id);
    try {
      await base44.entities.PlatformFeedback.update(feedback.id, {
        is_public: true,
        moderation_status: 'approved',
        status: 'reviewed'
      });
      toast({ title: "Avis approuve", description: "L'avis est maintenant visible sur le site." });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible d'approuver l'avis", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (feedback) => {
    setProcessing(feedback.id);
    try {
      await base44.entities.PlatformFeedback.update(feedback.id, {
        is_public: false,
        moderation_status: 'rejected',
        status: 'reviewed'
      });
      toast({ title: "Avis rejete", description: "L'avis ne sera pas affiche sur le site." });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible de rejeter l'avis", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const getStatus = (f) => f.moderation_status || 'pending';

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filter === 'all') return true;
    return getStatus(f) === filter;
  });

  const pendingCount = feedbacks.filter(f => getStatus(f) === 'pending').length;

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-800' },
      approved: { label: 'Approuve', cls: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejete', cls: 'bg-red-100 text-red-800' }
    };
    const s = map[status] || map.pending;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-rose-600" />
              Moderation des Avis Plateforme
            </CardTitle>
            <CardDescription>
              {pendingCount > 0 ? `${pendingCount} avis en attente de moderation` : "Aucun avis en attente"}
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')} className={filter === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : ''}>
            En attente ({pendingCount})
          </Button>
          <Button size="sm" variant={filter === 'approved' ? 'default' : 'outline'} onClick={() => setFilter('approved')}>
            Approuves ({feedbacks.filter(f => getStatus(f) === 'approved').length})
          </Button>
          <Button size="sm" variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>
            Rejetes ({feedbacks.filter(f => getStatus(f) === 'rejected').length})
          </Button>
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
            Tous ({feedbacks.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-stone-400 py-12">Chargement...</p>
        ) : filteredFeedbacks.length === 0 ? (
          <p className="text-center text-stone-400 py-12">Aucun avis trouve</p>
        ) : (
          <div className="space-y-4">
            {filteredFeedbacks.map((f) => (
              <div key={f.id} className="p-4 rounded-lg border border-stone-200 bg-white">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-stone-100 rounded-full">
                      <User className="w-4 h-4 text-stone-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-900 text-sm">
                          {f.user_role === 'provider' ? 'Prestataire' : f.user_role === 'client' ? 'Client' : 'Utilisateur'}
                        </span>
                        {statusBadge(getStatus(f))}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3.5 h-3.5 ${star <= (f.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-stone-200'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-stone-400">
                          NPS: {f.nps_score ?? 'N/A'}/10 · {f.feedback_type || 'satisfaction'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-stone-400 flex-shrink-0">
                    {f.created_date ? format(new Date(f.created_date), 'dd/MM/yyyy') : ''}
                  </span>
                </div>
                <p className="text-sm text-stone-700 italic bg-stone-50 p-3 rounded mb-3">"{f.comment}"</p>
                {getStatus(f) === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={processing === f.id}
                      onClick={() => handleApprove(f)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      disabled={processing === f.id}
                      onClick={() => handleReject(f)}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Rejeter
                    </Button>
                  </div>
                )}
                {getStatus(f) === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    disabled={processing === f.id}
                    onClick={() => handleReject(f)}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Retirer du site
                  </Button>
                )}
                {getStatus(f) === 'rejected' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={processing === f.id}
                    onClick={() => handleApprove(f)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver quand meme
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
