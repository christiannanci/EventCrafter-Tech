import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { SendEmail } from '@/api/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Clock, AlertTriangle, CheckCircle2, XCircle, Save, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function RefundPolicyManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    waiting_period_days: 7,
    reminder_after_days: 4,
    auto_refund_after_days: 10,
    auto_refund_enabled: false,
    fraud_detection_threshold: 3,
  });

  // Charger la config
  const { data: configs } = useQuery({
    queryKey: ['refund-policy-config'],
    queryFn: async () => {
      const data = await base44.entities.RefundPolicyConfig.filter({ config_key: 'default' });
      return data;
    },
  });

  // Charger les demandes de remboursement
  const { data: refundRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['refund-requests'],
    queryFn: async () => {
      const data = await base44.entities.LeadRefundRequest.list('-created_date', 100);
      return data;
    },
  });

  useEffect(() => {
    if (configs && configs[0]) {
      setConfig(configs[0]);
    }
  }, [configs]);

  // Mutation pour sauvegarder config
  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      if (configs && configs[0]) {
        return await base44.entities.RefundPolicyConfig.update(configs[0].id, configData);
      } else {
        return await base44.entities.RefundPolicyConfig.create({
          config_key: 'default',
          ...configData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refund-policy-config'] });
      toast({
        title: "✅ Configuration sauvegardée",
        description: "La politique de remboursement est à jour",
      });
    },
  });

  // Mutation pour approuver/rejeter remboursement
  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }) => {
      const request = refundRequests.find(r => r.id === requestId);
      await base44.entities.LeadRefundRequest.update(requestId, {
        status,
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
        refund_processed: status === 'approved'
      });

      // Si approuvé, traiter le remboursement
      if (status === 'approved') {
        const vendor = await base44.entities.VendorProfile.filter({ user_id: request.vendor_id });
        if (vendor[0]) {
          if (request.unlock_type === 'pay_per_lead') {
            // Créditer le portefeuille
            await base44.entities.VendorProfile.update(vendor[0].id, {
              purchased_leads_allowance: (vendor[0].purchased_leads_allowance || 0) + 1
            });
          } else if (request.unlock_type === 'reward_credit') {
            // Restaurer le crédit bonus
            await base44.entities.VendorProfile.update(vendor[0].id, {
              reward_credits: (vendor[0].reward_credits || 0) + 1
            });
          }

          // Notification au prestataire
          await base44.entities.Notification.create({
            user_id: request.vendor_id,
            title: "💰 Remboursement Approuvé",
            message: `Votre demande de remboursement pour le lead a été approuvée. Votre ${request.unlock_type === 'reward_credit' ? 'crédit bonus a été restauré' : 'portefeuille a été crédité'}.`,
            type: "system",
            is_read: false
          });

          // Email : confirmation financière importante
          const allUsers = await base44.entities.User.list();
          const vendorUser = allUsers.find(u => u.id === request.vendor_id);
          if (vendorUser) {
            await SendEmail({
              to: vendorUser.email,
              subject: "💰 Remboursement approuvé",
              body: `Bonjour ${vendorUser.full_name},\n\nVotre demande de remboursement concernant un lead a été approuvée.\n\n${request.unlock_type === 'reward_credit' ? 'Votre crédit bonus a été restauré.' : 'Votre portefeuille a été crédité.'}\n\nCordialement,\nL'équipe EventCrafter`
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
      toast({
        title: "✅ Demande traitée",
        description: "Le remboursement a été traité",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleReview = (requestId, status, notes) => {
    reviewMutation.mutate({ requestId, status, notes });
  };

  const pendingRequests = refundRequests?.filter(r => r.status === 'pending') || [];
  const approvedRequests = refundRequests?.filter(r => r.status === 'approved' || r.status === 'auto_approved') || [];
  const rejectedRequests = refundRequests?.filter(r => r.status === 'rejected') || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Politique "Zéro Perte"
          </h2>
          <p className="text-stone-500 mt-1">
            Gestion des remboursements et protection des prestataires
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder Config
        </Button>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">⚙️ Configuration</TabsTrigger>
          <TabsTrigger value="pending">
            🔔 En Attente
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-orange-500">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">📋 Historique</TabsTrigger>
        </TabsList>

        {/* CONFIGURATION */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Paramétrage des Délais */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Paramétrage des Délais
                </CardTitle>
                <CardDescription>Définissez les périodes d'attente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label>Délai avant réclamation (jours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.waiting_period_days}
                    onChange={(e) => setConfig({...config, waiting_period_days: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Temps avant que le bouton "Demander remboursement" apparaisse
                  </p>
                </div>

                <div>
                  <Label>Relance client après (jours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.reminder_after_days}
                    onChange={(e) => setConfig({...config, reminder_after_days: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Push automatique au client pour répondre
                  </p>
                </div>

                <div>
                  <Label>Auto-remboursement après (jours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.auto_refund_after_days}
                    onChange={(e) => setConfig({...config, auto_refund_after_days: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Si client n'ouvre pas le message
                  </p>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Checkbox
                    id="auto-refund"
                    checked={config.auto_refund_enabled}
                    onCheckedChange={(checked) => setConfig({...config, auto_refund_enabled: checked})}
                  />
                  <label htmlFor="auto-refund" className="text-sm font-medium cursor-pointer">
                    Activer remboursement automatique
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Anti-Fraude */}
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Système Anti-Fraude
                </CardTitle>
                <CardDescription>Protection de la qualité des leads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label>Seuil de signalements clients</Label>
                  <Input
                    type="number"
                    min="2"
                    value={config.fraud_detection_threshold}
                    onChange={(e) => setConfig({...config, fraud_detection_threshold: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Nombre de signalements avant alerte fraude sur un client
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-sm text-orange-900 mb-2">
                    🛡️ Protections en Place
                  </h4>
                  <ul className="text-xs text-orange-800 space-y-1">
                    <li>• Vérification des conversations avant validation</li>
                    <li>• Détection de messages "vides" (ex: ".")</li>
                    <li>• Tracking des clients problématiques</li>
                    <li>• Historique complet pour arbitrage</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>💡 Méthodes de Remboursement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Paiement à l'unité</h4>
                  <p className="text-sm text-green-800">💰 Crédit sur portefeuille virtuel</p>
                  <p className="text-xs text-green-700 mt-2">Utilisable pour prochain lead</p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-900 mb-2">Crédit Bonus</h4>
                  <p className="text-sm text-amber-800">⭐ Restauration du crédit</p>
                  <p className="text-xs text-amber-700 mt-2">Solde bonus +1</p>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Abonnés Gold/Premium</h4>
                  <p className="text-sm text-purple-800">👑 Badge Priorité temporaire</p>
                  <p className="text-xs text-purple-700 mt-2">Compensation non monétaire</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEMANDES EN ATTENTE */}
        <TabsContent value="pending" className="space-y-4">
          {requestsLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-stone-600">Aucune demande en attente</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map(request => (
              <RefundRequestCard
                key={request.id}
                request={request}
                onReview={handleReview}
              />
            ))
          )}
        </TabsContent>

        {/* HISTORIQUE */}
        <TabsContent value="history" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200">
              <CardHeader className="bg-green-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Approuvées ({approvedRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {approvedRequests.map(r => (
                    <div key={r.id} className="p-3 bg-green-50 rounded border border-green-200 text-sm">
                      <p className="font-medium">Lead: {r.lead_id.substring(0, 8)}</p>
                      <p className="text-xs text-stone-600">{new Date(r.created_date).toLocaleDateString()}</p>
                      {r.admin_notes && (
                        <p className="text-xs text-green-700 mt-1">"{r.admin_notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Rejetées ({rejectedRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {rejectedRequests.map(r => (
                    <div key={r.id} className="p-3 bg-red-50 rounded border border-red-200 text-sm">
                      <p className="font-medium">Lead: {r.lead_id.substring(0, 8)}</p>
                      <p className="text-xs text-stone-600">{new Date(r.created_date).toLocaleDateString()}</p>
                      {r.admin_notes && (
                        <p className="text-xs text-red-700 mt-1">"{r.admin_notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RefundRequestCard({ request, onReview }) {
  const [notes, setNotes] = useState('');
  const [showConversation, setShowConversation] = useState(false);

  const daysSinceUnlock = Math.floor(
    (new Date() - new Date(request.created_date)) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="border-orange-200">
      <CardHeader className="bg-orange-50">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Demande de Remboursement
            </CardTitle>
            <p className="text-xs text-stone-600 mt-1">
              Créée il y a {daysSinceUnlock} jour{daysSinceUnlock > 1 ? 's' : ''}
            </p>
          </div>
          <Badge className={
            request.unlock_type === 'reward_credit' ? 'bg-amber-500' : 'bg-blue-500'
          }>
            {request.unlock_type === 'reward_credit' ? 'Crédit Bonus' : `${request.amount_paid?.toLocaleString()} FCFA`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-600">Lead ID</p>
            <p className="font-mono text-xs">{request.lead_id.substring(0, 12)}...</p>
          </div>
          <div>
            <p className="text-stone-600">Prestataire ID</p>
            <p className="font-mono text-xs">{request.vendor_id.substring(0, 12)}...</p>
          </div>
        </div>

        {request.reason && (
          <div className="p-3 bg-stone-50 rounded border">
            <p className="text-xs text-stone-600 mb-1">Raison:</p>
            <p className="text-sm">{request.reason}</p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConversation(!showConversation)}
          className="w-full"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {showConversation ? 'Masquer' : 'Vérifier'} Conversation
        </Button>

        {showConversation && (
          <div className="p-3 bg-blue-50 rounded border border-blue-200 text-xs">
            <p className="text-stone-600">Conversation ID: {request.conversation_id || 'Non disponible'}</p>
            <p className="text-stone-500 mt-2">
              Vérifiez dans le module Chat si le prestataire a envoyé un message sérieux.
            </p>
          </div>
        )}

        <div>
          <Label>Notes d'arbitrage</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Raison de votre décision..."
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onReview(request.id, 'approved', notes)}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approuver
          </Button>
          <Button
            onClick={() => onReview(request.id, 'rejected', notes)}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rejeter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
