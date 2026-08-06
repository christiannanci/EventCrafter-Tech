import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Shield, ShieldOff, ShieldAlert, Search, AlertTriangle } from "lucide-react";

export default function ServiceModeration() {
  const { toast } = useToast();
  const [services, setServices] = useState([]);
  const [vendorProfiles, setVendorProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // all, active, suspended

  const [suspendDialog, setSuspendDialog] = useState({ open: false, service: null });
  const [suspensionNote, setSuspensionNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allServices, allVendors] = await Promise.all([
        base44.entities.Service.list('-created_date', 500),
        base44.entities.VendorProfile.list()
      ]);
      setServices(allServices || []);
      setVendorProfiles(allVendors || []);
    } catch (error) {
      console.error("Failed to load services", error);
      toast({ title: "Erreur", description: "Impossible de charger les services", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getVendorName = (service) => {
    const profile = vendorProfiles.find(v => v.user_id === (service.planner_id || service.created_by));
    return profile?.business_name || 'Vendeur inconnu';
  };

  const openSuspendDialog = (service) => {
    setSuspendDialog({ open: true, service });
    setSuspensionNote("");
  };

  const handleSuspend = async () => {
    if (!suspensionNote.trim()) {
      toast({ title: "Note requise", description: "Vous devez expliquer le motif de la suspension", variant: "destructive" });
      return;
    }

    const service = suspendDialog.service;
    setProcessing(true);
    try {
      await base44.entities.Service.update(service.id, {
        is_suspended: true,
        suspension_note: suspensionNote.trim(),
        suspended_at: new Date().toISOString()
      });

      // Notifier le vendeur
      const plannerId = service.planner_id || service.created_by;
      await base44.entities.Notification.create({
        user_id: plannerId,
        title: "Offre suspendue",
        message: `Votre offre "${service.title}" a été suspendue par l'administration. Motif : ${suspensionNote.trim()}`,
        type: "admin_alert",
        link: "/VendorDashboard",
        is_read: false
      });

      toast({ title: "Service suspendu", description: "Le vendeur a été notifié avec le motif." });
      setSuspendDialog({ open: false, service: null });
      loadData();
    } catch (error) {
      console.error("Suspend error", error);
      toast({ title: "Erreur", description: "Impossible de suspendre le service", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async (service) => {
    if (!confirm(`Réactiver l'offre "${service.title}" ?`)) return;
    try {
      await base44.entities.Service.update(service.id, {
        is_suspended: false,
        suspension_note: null,
        suspended_at: null
      });

      const plannerId = service.planner_id || service.created_by;
      await base44.entities.Notification.create({
        user_id: plannerId,
        title: "Offre réactivée",
        message: `Votre offre "${service.title}" a été réactivée et est de nouveau visible sur la plateforme.`,
        type: "admin_alert",
        link: "/VendorDashboard",
        is_read: false
      });

      toast({ title: "Service réactivé", description: "Le vendeur a été notifié." });
      loadData();
    } catch (error) {
      console.error("Reactivate error", error);
      toast({ title: "Erreur", description: "Impossible de réactiver le service", variant: "destructive" });
    }
  };

  const filteredServices = services.filter(s => {
    if (filter === 'active' && s.is_suspended) return false;
    if (filter === 'suspended' && !s.is_suspended) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const vendorName = getVendorName(s).toLowerCase();
      if (!s.title?.toLowerCase().includes(term) && !vendorName.includes(term)) return false;
    }
    return true;
  });

  const suspendedCount = services.filter(s => s.is_suspended).length;

  return (
    <div className="space-y-6">
      <Dialog open={suspendDialog.open} onOpenChange={(val) => setSuspendDialog(prev => ({ ...prev, open: val }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Suspendre l'offre
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Offre : <strong>{suspendDialog.service?.title}</strong><br />
              Vendeur : <strong>{suspendDialog.service && getVendorName(suspendDialog.service)}</strong>
            </p>
            <div className="space-y-2">
              <Label>Motif de la suspension (visible par le vendeur) *</Label>
              <Textarea
                placeholder="Expliquez clairement la raison de la suspension..."
                value={suspensionNote}
                onChange={(e) => setSuspensionNote(e.target.value)}
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, service: null })}>Annuler</Button>
            <Button
              onClick={handleSuspend}
              disabled={processing || !suspensionNote.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {processing ? "Suspension..." : "Confirmer la Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-rose-600" />
                Modération des Services
              </CardTitle>
              <CardDescription>
                {suspendedCount > 0 ? `${suspendedCount} offre(s) actuellement suspendue(s)` : "Toutes les offres sont actives"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  placeholder="Rechercher (titre, vendeur)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Toutes ({services.length})</Button>
            <Button size="sm" variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Actives ({services.length - suspendedCount})</Button>
            <Button size="sm" variant={filter === 'suspended' ? 'default' : 'outline'} onClick={() => setFilter('suspended')} className={filter === 'suspended' ? 'bg-amber-600 hover:bg-amber-700' : ''}>Suspendues ({suspendedCount})</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-stone-400 py-12">Chargement...</p>
          ) : filteredServices.length === 0 ? (
            <p className="text-center text-stone-400 py-12">Aucun service trouvé</p>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg border ${
                    service.is_suspended ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-stone-900">{service.title}</h4>
                      {service.is_suspended && (
                        <Badge className="bg-amber-500 text-white">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Suspendue
                        </Badge>
                      )}
                      {service.is_hidden && (
                        <Badge variant="outline" className="text-stone-500">Masquée par le vendeur</Badge>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">
                      Vendeur : {getVendorName(service)} · Catégorie : {service.category || 'N/A'}
                    </p>
                    {service.is_suspended && service.suspension_note && (
                      <p className="text-xs text-amber-700 mt-2 bg-amber-100 p-2 rounded">
                        <strong>Motif :</strong> {service.suspension_note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {service.is_suspended ? (
                      <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50" onClick={() => handleReactivate(service)}>
                        <Shield className="w-4 h-4 mr-2" /> Réactiver
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50" onClick={() => openSuspendDialog(service)}>
                        <ShieldOff className="w-4 h-4 mr-2" /> Suspendre
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
