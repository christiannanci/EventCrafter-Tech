import React, { useState, useEffect } from 'react';
import { InvokeLLM, SendEmail, UploadFile, SendSMS, GenerateImage, ExtractDataFromUploadedFile } from '@/api/integrations';
import { base44 } from "@/api/apiClient";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Shield, Upload, X, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * DisputeReplyDialog — Permet à la partie adverse (vendor ou client) 
 * de soumettre son contre-argument face à un litige ouvert contre elle.
 * 
 * Props:
 *  - open: boolean
 *  - onOpenChange: fn
 *  - booking: object
 *  - userType: 'client' | 'vendor'
 *  - onSuccess: fn
 */
export default function DisputeReplyDialog({ open, onOpenChange, booking, userType, onSuccess }) {
  const { toast } = useToast();
  const [dispute, setDispute] = useState(null);
  const [loadingDispute, setLoadingDispute] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [preuveUrls, setPreuveUrls] = useState([]);

  useEffect(() => {
    if (open && booking?.id) {
      loadDispute();
    }
  }, [open, booking?.id]);

  const loadDispute = async () => {
    setLoadingDispute(true);
    try {
      const disputes = await base44.entities.Dispute.filter({ booking_id: booking.id });
      const openDispute = disputes.find(d => !d.is_closed);
      setDispute(openDispute || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDispute(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        urls.push(file_url);
      }
      setPreuveUrls(prev => [...prev, ...urls]);
      toast({ title: `${files.length} fichier(s) ajouté(s)` });
    } catch {
      toast({ title: 'Erreur de téléchargement', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({ title: 'Description requise', variant: 'destructive' });
      return;
    }
    if (!dispute) {
      toast({ title: 'Aucun litige actif trouvé', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const party = userType === 'vendor' ? 'PRESTATAIRE' : 'CLIENT';
      const currentReply = dispute.description || '';
      const updatedDescription = `${currentReply}\n\n---\n[RÉPONSE ${party}]\n${description}`;

      const currentEvidences = dispute.report_url ? dispute.report_url.split(',') : [];
      const allEvidences = [...currentEvidences, ...preuveUrls].filter(Boolean);

      await base44.entities.Dispute.update(dispute.id, {
        description: updatedDescription,
        report_url: allEvidences.join(',')
      });

      // Notifier les admins
      const allUsers = await base44.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_id: admin.id,
          title: `?? Réponse au Litige ${dispute.dispute_code}`,
          message: `La partie adverse (${party}) a soumis son contre-argument. Dossier à revoir.`,
          type: 'system',
          link: '/AdminDashboard?tab=disputes',
          is_read: false
        });
      }

      toast({ title: 'Réponse soumise', description: 'L\'administration a été notifiée.' });
      setDescription('');
      setPreuveUrls([]);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de soumettre la réponse', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-blue-600" />
            Soumettre votre Réponse au Litige
          </DialogTitle>
          <DialogDescription>
            Un litige a été ouvert contre vous. Donnez votre version des faits et fournissez des preuves.
          </DialogDescription>
        </DialogHeader>

        {loadingDispute ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-stone-400" />
          </div>
        ) : !dispute ? (
          <div className="py-8 text-center text-stone-500 bg-stone-50 rounded-lg">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <p>Aucun litige actif trouvé pour cette réservation.</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Litige original */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-100 text-red-800">{dispute.dispute_code}</Badge>
                <span className="text-xs text-red-600">Initié par : {dispute.initiator === 'client' ? 'le Client' : 'le Prestataire'}</span>
              </div>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{dispute.description?.split('\n\n---\n')[0]}</p>
            </div>

            {/* Votre réponse */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Votre version des faits *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Expliquez votre point de vue, ce qui s'est réellement passé, et pourquoi vous n'êtes pas en tort..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-stone-500">
                Soyez précis et factuel. Évitez les accusations sans preuves.
              </p>
            </div>

            {/* Preuves */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Vos preuves (photos, captures)</Label>
              <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 text-center hover:border-stone-400 transition-colors">
                <input
                  type="file"
                  id="reply-proofs"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <label htmlFor="reply-proofs" className="cursor-pointer flex flex-col items-center gap-2">
                  {uploading ? (
                    <><Loader2 className="w-8 h-8 text-stone-400 animate-spin" /><p className="text-sm">Téléchargement...</p></>
                  ) : (
                    <><Upload className="w-8 h-8 text-stone-400" /><p className="text-sm text-stone-600">Cliquez pour ajouter des fichiers</p></>
                  )}
                </label>
              </div>
              {preuveUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {preuveUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Preuve ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setPreuveUrls(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !description.trim() || !dispute || loadingDispute}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" />Soumettre ma Réponse</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}