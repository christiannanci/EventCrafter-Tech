import React, { useState } from 'react';
import { InvokeLLM, SendEmail, UploadFile, SendSMS, GenerateImage, ExtractDataFromUploadedFile } from '@/api/integrations';
import { base44 } from "@/api/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Upload, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DisputeDialog({ open, onOpenChange, booking, userType, onSuccess }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    motif: 'non_respect_prestation',
    description: '',
    attente: 'finalisation',
    preuveUrls: []
  });

  const motifs = [
    { value: 'retard', label: 'Retard', desc: 'Prestation en retard ou non livrée à temps' },
    { value: 'non_respect_prestation', label: 'Non-respect de la prestation', desc: 'Service non conforme aux attentes' },
    { value: 'comportement', label: 'Comportement', desc: 'Comportement inapproprié' },
    { value: 'non_respect_codes_culturels', label: 'Non-respect des codes culturels', desc: 'Traditions ou rites non respectés' },
    { value: 'non_paiement', label: 'Non-paiement', desc: 'Client n\'a pas payé (prestataires uniquement)' },
  ];

  const attentes = [
    { value: 'remboursement', label: '💸 Remboursement', desc: 'Demander un remboursement total ou partiel' },
    { value: 'excuses', label: '🙏 Excuses', desc: 'Demander des excuses formelles' },
    { value: 'finalisation', label: '✅ Finalisation du travail', desc: 'Demander l\'achèvement de la prestation' },
  ];

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setFormData(prev => ({
        ...prev,
        preuveUrls: [...prev.preuveUrls, ...uploadedUrls]
      }));
      toast({ title: 'Fichiers téléchargés', description: `${files.length} fichier(s) ajouté(s)` });
    } catch (error) {
      toast({ 
        title: 'Erreur de téléchargement',
        description: 'Impossible de télécharger les fichiers',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (url) => {
    setFormData(prev => ({
      ...prev,
      preuveUrls: prev.preuveUrls.filter(u => u !== url)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast({ 
        title: 'Description requise',
        description: 'Veuillez décrire le problème',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      // Récupérer le contrat associé
      const contracts = await base44.entities.Contract.filter({ booking_id: booking.id });
      const contract = contracts[0];

      if (!contract) {
        toast({ 
          title: 'Pas de contrat',
          description: 'Aucun contrat trouvé pour cette réservation',
          variant: 'destructive'
        });
        return;
      }

      // Générer un code unique
      const disputeCode = `DSP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Créer le litige
      const dispute = await base44.entities.Dispute.create({
        dispute_code: disputeCode,
        booking_id: booking.id,
        contract_id: contract.id,
        nature: formData.motif === 'non_respect_codes_culturels' ? 'client_dissatisfaction' : 'other',
        initiator: userType === 'client' ? 'client' : 'provider',
        description: `[${motifs.find(m => m.value === formData.motif)?.label}]\n\n${formData.description}\n\nAttente: ${attentes.find(a => a.value === formData.attente)?.label}`,
        is_resolved: false,
        is_closed: false
      });

      // Sauvegarder les preuves en tant que métadonnées (dans un champ texte)
      if (formData.preuveUrls.length > 0) {
        await base44.entities.Dispute.update(dispute.id, {
          report_url: formData.preuveUrls.join(',')
        });
      }

      // OUVERTURE: Statut passe à "En Litige" et BLOCAGE des paiements
      await base44.entities.Booking.update(booking.id, {
        status: 'disputed'
      });

      // BLACKLISTE AUTOMATIQUE: Bloquer tous les paiements vers le prestataire
      const vendorId = booking.planner_id;
      const transactions = await base44.entities.Transaction.list();
      const vendorTransactions = transactions.filter(
        tx => tx.to_user_id === vendorId && tx.status === 'escrow_held'
      );
      
      for (const tx of vendorTransactions) {
        await base44.entities.Transaction.update(tx.id, {
          status: 'blocked',
          description: tx.description + ' [BLOQUÉ - LITIGE EN COURS]'
        });
      }

      // ALERTE FLASH: Notification prioritaire immédiate aux admins
      const allUsers = await base44.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        await base44.entities.Notification.create({
          user_id: admin.id,
          title: '🚨 ALERTE FLASH - NOUVEAU LITIGE',
          message: `${disputeCode} - ${motifs.find(m => m.value === formData.motif)?.label}. Paiements BLOQUÉS. Arbitrage requis immédiatement.`,
          type: 'dispute_alert_flash',
          link: '/AdminDashboard?tab=disputes',
          is_read: false
        });

        // Email : alerte prioritaire nécessitant un arbitrage immédiat
        if (admin.email) {
          await SendEmail({
            to: admin.email,
            subject: `🚨 ALERTE FLASH - Nouveau litige ${disputeCode}`,
            body: `Un nouveau litige requiert un arbitrage immédiat.\n\nCode: ${disputeCode}\nMotif: ${motifs.find(m => m.value === formData.motif)?.label}\n\nLes paiements ont été bloqués en attendant la résolution.\n\nAccédez au dossier: ${window.location.origin}/AdminDashboard?tab=disputes\n\nCordialement,\nL'équipe EventCrafter`
          });
        }
      }

      // Notifier l'autre partie
      const otherPartyId = userType === 'client' ? booking.planner_id : booking.client_id;
      if (otherPartyId) {
        await base44.entities.Notification.create({
          user_id: otherPartyId,
          title: '⚠️ Litige Signalé',
          message: `Un litige a été ouvert concernant votre prestation. Code: ${disputeCode}`,
          type: 'dispute',
          link: userType === 'client' ? '/VendorDashboard?tab=dossiers' : '/ClientDashboard?tab=events',
          is_read: false
        });

        // Email à l'autre partie : un litige la concerne directement, information urgente
        const otherPartyUser = allUsers.find(u => u.id === otherPartyId);
        if (otherPartyUser?.email) {
          await SendEmail({
            to: otherPartyUser.email,
            subject: `⚠️ Un litige a été signalé - ${disputeCode}`,
            body: `Bonjour ${otherPartyUser.full_name || ''},\n\nUn litige a été ouvert concernant votre réservation.\n\nCode: ${disputeCode}\n\nLes paiements associés sont temporairement bloqués le temps de l'arbitrage. Notre équipe va examiner le dossier.\n\nCordialement,\nL'équipe EventCrafter`
          });
        }
      }

      toast({
        title: 'Litige signalé',
        description: `Code: ${disputeCode}. Notre équipe va examiner votre demande.`
      });

      setFormData({
        motif: 'non_respect_prestation',
        description: '',
        attente: 'finalisation',
        preuveUrls: []
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erreur création litige:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de signaler le litige',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            Signaler un Incident
          </DialogTitle>
          <DialogDescription>
            Décrivez le problème rencontré. Notre équipe examinera votre demande sous 24-48h.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Motif */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">1. Motif du litige *</Label>
            <RadioGroup value={formData.motif} onValueChange={(value) => setFormData(prev => ({ ...prev, motif: value }))}>
              {motifs.map((motif) => (
                <div key={motif.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-stone-50 cursor-pointer">
                  <RadioGroupItem value={motif.value} id={motif.value} />
                  <Label htmlFor={motif.value} className="flex-1 cursor-pointer">
                    <p className="font-medium text-stone-900">{motif.label}</p>
                    <p className="text-xs text-stone-500 mt-1">{motif.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">2. Description détaillée *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez précisément ce qui s'est passé, quand, et pourquoi cela pose problème..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-stone-500">
              Soyez aussi précis que possible pour aider notre équipe à comprendre la situation
            </p>
          </div>

          {/* Preuves */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">3. Preuves (photos, captures d'écran)</Label>
            <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 text-center hover:border-stone-400 transition-colors">
              <input
                type="file"
                id="proofs"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor="proofs" className="cursor-pointer flex flex-col items-center gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
                    <p className="text-sm text-stone-600">Téléchargement...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-stone-400" />
                    <p className="text-sm text-stone-600">
                      Cliquez pour télécharger des fichiers
                    </p>
                    <p className="text-xs text-stone-500">
                      Images uniquement, max 10 fichiers
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* Liste des preuves uploadées */}
            {formData.preuveUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.preuveUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt={`Preuve ${idx + 1}`} 
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(url)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attente */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">4. Que souhaitez-vous ? *</Label>
            <RadioGroup value={formData.attente} onValueChange={(value) => setFormData(prev => ({ ...prev, attente: value }))}>
              {attentes.map((attente) => (
                <div key={attente.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-stone-50 cursor-pointer">
                  <RadioGroupItem value={attente.value} id={attente.value} />
                  <Label htmlFor={attente.value} className="flex-1 cursor-pointer">
                    <p className="font-medium text-stone-900">{attente.label}</p>
                    <p className="text-xs text-stone-500 mt-1">{attente.desc}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Avertissement culturel */}
          {formData.motif === 'non_respect_codes_culturels' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Litige Culturel Sensible
                  </p>
                  <p className="text-xs text-amber-700">
                    Ce type de signalement sera traité avec une attention particulière par notre équipe. 
                    Les prestataires ayant des badges culturels vérifiés seront notifiés de l'impact sur leur certification.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !formData.description.trim()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Signaler le Litige
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
