import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export default function ServiceTypeModeration() {
  const { toast } = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.ServiceType.list('-created_date', 200);
      setTypes(all || []);
    } catch (error) {
      console.error("Failed to load service types", error);
      toast({ title: "Erreur", description: "Impossible de charger les suggestions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (type) => {
    setProcessing(type.id);
    try {
      await base44.entities.ServiceType.update(type.id, { status: 'active' });
      toast({ title: "Categorie approuvee", description: `"${type.name}" est maintenant disponible pour tous les vendeurs.` });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible d'approuver la categorie", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (type) => {
    setProcessing(type.id);
    try {
      await base44.entities.ServiceType.update(type.id, { status: 'rejected' });
      toast({ title: "Suggestion rejetee", description: `"${type.name}" ne sera pas ajoutee.` });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible de rejeter la suggestion", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const filteredTypes = types.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return t.status === 'active';
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'rejected') return t.status === 'rejected';
    return true;
  });

  const pendingCount = types.filter(t => t.status === 'pending').length;

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-800' },
      active: { label: 'Approuve', cls: 'bg-green-100 text-green-800' },
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
              <Tag className="w-5 h-5 text-rose-600" />
              Suggestions de Categories de Service
            </CardTitle>
            <CardDescription>
              {pendingCount > 0 ? `${pendingCount} suggestion(s) en attente de validation` : "Aucune suggestion en attente"}
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')} className={filter === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : ''}>
            En attente ({pendingCount})
          </Button>
          <Button size="sm" variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>
            Approuvees ({types.filter(t => t.status === 'active').length})
          </Button>
          <Button size="sm" variant={filter === 'rejected' ? 'default' : 'outline'} onClick={() => setFilter('rejected')}>
            Rejetees ({types.filter(t => t.status === 'rejected').length})
          </Button>
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
            Toutes ({types.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-stone-400 py-12">Chargement...</p>
        ) : filteredTypes.length === 0 ? (
          <p className="text-center text-stone-400 py-12">Aucune categorie trouvee</p>
        ) : (
          <div className="space-y-4">
            {filteredTypes.map((type) => (
              <div key={type.id} className="p-4 rounded-lg border border-stone-200 bg-white">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    {type.media_url ? (
                      <img src={type.media_url} alt={type.name} className="w-12 h-12 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center border">
                        <ImageIcon className="w-5 h-5 text-stone-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{type.name}</span>
                        {statusBadge(type.status)}
                      </div>
                      <p className="text-xs text-stone-400">
                        Code: {type.code_service} · {type.created_date ? format(new Date(type.created_date), 'dd/MM/yyyy') : ''}
                      </p>
                    </div>
                  </div>
                </div>
                {type.description && (
                  <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded mb-3">{type.description}</p>
                )}
                {type.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={processing === type.id}
                      onClick={() => handleApprove(type)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      disabled={processing === type.id}
                      onClick={() => handleReject(type)}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Rejeter
                    </Button>
                  </div>
                )}
                {type.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    disabled={processing === type.id}
                    onClick={() => handleReject(type)}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Desactiver
                  </Button>
                )}
                {type.status === 'rejected' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={processing === type.id}
                    onClick={() => handleApprove(type)}
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
