import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Gift, Loader2, Search, Crown, Star, Undo2 } from "lucide-react";

// Offre de lancement : Premium offert 12 mois aux 120 premiers prestataires fondateurs,
// Gold offert 12 mois aux prestataires de la phase de test.
// Une offre est une Membership active a 0 FCFA, d'une duree de 365 jours.
export const PREMIUM_OFFER_LIMIT = 120;
const OFFER_DURATION_DAYS = 365;

const isOfferMembership = (m) =>
  m &&
  m.status === 'active' &&
  Number(m.amount || 0) === 0 &&
  Number(m.duration_days) === OFFER_DURATION_DAYS &&
  ['premium', 'gold'].includes((m.membership_type_code || '').toLowerCase());

const fmtDate = (d) => {
  if (!d) return '-';
  const x = new Date(d);
  return isNaN(x) ? '-' : x.toLocaleDateString('fr-FR');
};

export default function LaunchOfferManager() {
  const [vendors, setVendors] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | none | offer
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null); // { type: 'premium'|'gold'|'revoke', vendors: [] }
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [vp, ms, us] = await Promise.all([
        base44.entities.VendorProfile.list(),
        base44.entities.Membership.list(),
        base44.entities.User.list(),
      ]);
      setVendors(vp || []);
      setMemberships(ms || []);
      setUsers(us || []);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les prestataires");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const offerByUser = useMemo(() => {
    const map = new Map();
    memberships.filter(isOfferMembership).forEach(m => map.set(m.user_id, m));
    return map;
  }, [memberships]);

  const premiumUsed = useMemo(
    () => memberships.filter(m => isOfferMembership(m) && m.membership_type_code.toLowerCase() === 'premium').length,
    [memberships]
  );
  const goldUsed = useMemo(
    () => memberships.filter(m => isOfferMembership(m) && m.membership_type_code.toLowerCase() === 'gold').length,
    [memberships]
  );
  const premiumRemaining = Math.max(0, PREMIUM_OFFER_LIMIT - premiumUsed);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors
      .map(v => {
        const u = users.find(x => x.id === v.user_id);
        const offer = offerByUser.get(v.user_id) || null;
        const paidPlan = !offer && ['premium', 'gold'].includes(v.plan);
        return { v, email: u?.email || '', offer, paidPlan };
      })
      .filter(r => {
        if (filter === 'none' && r.offer) return false;
        if (filter === 'offer' && !r.offer) return false;
        if (!q) return true;
        return (
          (r.v.business_name || '').toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.v.phone || '').toLowerCase().includes(q) ||
          (r.v.city || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.offer ? 1 : 0) - (a.offer ? 1 : 0) || (a.v.business_name || '').localeCompare(b.v.business_name || ''));
  }, [vendors, users, offerByUser, search, filter]);

  const selectable = (r) => !r.offer && !r.paidPlan;
  const selectedRows = rows.filter(r => selected.includes(r.v.id));

  const toggle = (id) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const toggleAll = () => {
    const ids = rows.filter(selectable).map(r => r.v.id);
    const allSelected = ids.length > 0 && ids.every(id => selected.includes(id));
    setSelected(allSelected ? [] : ids);
  };

  const openConfirm = (type, list) => {
    if (list.length === 0) {
      toast.error("Selectionnez au moins un compte");
      return;
    }
    if (type === 'premium' && list.length > premiumRemaining) {
      toast.error(`Limite de ${PREMIUM_OFFER_LIMIT} comptes Premium : il reste ${premiumRemaining} place(s), vous en avez selectionne ${list.length}.`);
      return;
    }
    setConfirm({ type, vendors: list });
  };

  const grant = async (type, list) => {
    // Re-verifie le plafond sur des donnees fraiches (evite un depassement si deux admins agissent en meme temps)
    const fresh = await base44.entities.Membership.list();
    const usedNow = (fresh || []).filter(m => isOfferMembership(m) && m.membership_type_code.toLowerCase() === 'premium').length;
    if (type === 'premium' && usedNow + list.length > PREMIUM_OFFER_LIMIT) {
      toast.error(`Limite de ${PREMIUM_OFFER_LIMIT} comptes Premium atteinte (${usedNow} deja attribues).`);
      await load();
      return;
    }
    const alreadyOffered = new Set((fresh || []).filter(isOfferMembership).map(m => m.user_id));
    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    let ok = 0;
    for (const r of list) {
      if (alreadyOffered.has(r.v.user_id)) continue;
      try {
        await base44.entities.Membership.create({
          user_id: r.v.user_id,
          membership_type_code: type,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          duration_days: OFFER_DURATION_DAYS,
          amount: 0,
          status: 'active',
          payment_status: 'paid',
          auto_renew: false,
        });
        await base44.entities.VendorProfile.update(r.v.id, {
          plan: type,
          subscription_status: 'active',
          subscription_end_date: end.toISOString(),
        });
        await base44.entities.Notification.create({
          user_id: r.v.user_id,
          title: type === 'gold' ? "Offre de lancement : plan Gold offert 🎉" : "Offre de lancement : plan Premium offert 🎉",
          message: `Votre plan ${type === 'gold' ? 'Gold' : 'Premium'} est offert pendant 12 mois, jusqu'au ${fmtDate(end)}.`,
          type: "payment",
          link: "/VendorDashboard",
          is_read: false,
        });
        ok++;
      } catch (e) {
        console.error(e);
        toast.error(`Echec pour ${r.v.business_name || r.email}`);
      }
    }
    if (ok > 0) toast.success(`${ok} compte(s) passe(s) en ${type === 'gold' ? 'Gold' : 'Premium'} (12 mois offerts)`);
  };

  const revoke = async (list) => {
    let ok = 0;
    for (const r of list) {
      try {
        if (r.offer) {
          await base44.entities.Membership.update(r.offer.id, { status: 'cancelled' });
        }
        await base44.entities.VendorProfile.update(r.v.id, {
          plan: 'free',
          subscription_status: 'inactive',
          subscription_end_date: null,
        });
        await base44.entities.Notification.create({
          user_id: r.v.user_id,
          title: "Statut d'abonnement mis a jour",
          message: "L'offre de lancement a ete retiree de votre compte. Vous etes maintenant sur le plan Basic.",
          type: "payment",
          link: "/VendorDashboard",
          is_read: false,
        });
        ok++;
      } catch (e) {
        console.error(e);
        toast.error(`Echec pour ${r.v.business_name || r.email}`);
      }
    }
    if (ok > 0) toast.success(`${ok} compte(s) remis au plan Basic`);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      if (confirm.type === 'revoke') await revoke(confirm.vendors);
      else await grant(confirm.type, confirm.vendors);
      setSelected([]);
      setConfirm(null);
      await load();
    } finally {
      setWorking(false);
    }
  };

  const planBadge = (plan) => {
    if (plan === 'gold') return <Badge className="bg-amber-500 text-white">Gold</Badge>;
    if (plan === 'premium') return <Badge className="bg-purple-600 text-white">Premium</Badge>;
    return <Badge variant="outline">Basic</Badge>;
  };

  const confirmLabel = confirm
    ? confirm.type === 'premium'
      ? `Offrir le plan Premium pendant 12 mois a ${confirm.vendors.length} compte(s)`
      : confirm.type === 'gold'
        ? `Offrir le plan Gold (phase de test) pendant 12 mois a ${confirm.vendors.length} compte(s)`
        : `Retirer l'offre et remettre ${confirm.vendors.length} compte(s) au plan Basic`
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-3"><Gift className="w-7 h-7 text-rose-600" /> Offre de lancement</h2>
        <p className="text-stone-600 mt-1">Premium offert 12 mois aux {PREMIUM_OFFER_LIMIT} premiers prestataires fondateurs, Gold offert 12 mois a la phase de test.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Premium offerts</CardDescription>
            <CardTitle className="text-3xl">{premiumUsed} / {PREMIUM_OFFER_LIMIT}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">Places restantes : <strong>{premiumRemaining}</strong></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gold offerts (phase de test)</CardDescription>
            <CardTitle className="text-3xl">{goldUsed}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">Valeur offerte : 300 000 FCFA par compte</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Prestataires inscrits</CardDescription>
            <CardTitle className="text-3xl">{vendors.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">Sans offre : {vendors.filter(v => !offerByUser.has(v.user_id)).length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comptes prestataires</CardTitle>
          <CardDescription>Cochez les comptes, puis choisissez l'offre. Un compte qui a deja un plan payant n'est pas selectionnable.</CardDescription>
          <div className="flex flex-col gap-3 md:flex-row md:items-center pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <Input className="pl-9" placeholder="Rechercher (nom, e-mail, telephone, ville)" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {[['all', 'Tous'], ['none', 'Sans offre'], ['offer', 'Avec offre']].map(([v, l]) => (
                <Button key={v} type="button" size="sm" variant={filter === v ? 'default' : 'outline'} onClick={() => setFilter(v)}>{l}</Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" className="bg-purple-600 hover:bg-purple-700" onClick={() => openConfirm('premium', selectedRows)} disabled={selectedRows.length === 0}>
              <Star className="w-4 h-4 mr-2" /> Offrir Premium 12 mois ({selectedRows.length})
            </Button>
            <Button type="button" className="bg-amber-500 hover:bg-amber-600" onClick={() => openConfirm('gold', selectedRows)} disabled={selectedRows.length === 0}>
              <Crown className="w-4 h-4 mr-2" /> Offrir Gold (test) 12 mois ({selectedRows.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={rows.filter(selectable).length > 0 && rows.filter(selectable).every(r => selected.includes(r.v.id))}
                        onCheckedChange={toggleAll}
                        aria-label="Tout selectionner"
                      />
                    </TableHead>
                    <TableHead>Prestataire</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Plan actuel</TableHead>
                    <TableHead>Offre de lancement</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-stone-500 py-8">Aucun prestataire</TableCell></TableRow>
                  )}
                  {rows.map(r => {
                    const expired = r.offer && new Date(r.offer.end_date) < new Date();
                    return (
                      <TableRow key={r.v.id}>
                        <TableCell>
                          <Checkbox checked={selected.includes(r.v.id)} disabled={!selectable(r)} onCheckedChange={() => toggle(r.v.id)} aria-label={`Selectionner ${r.v.business_name || r.email}`} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.v.business_name || 'Sans nom'}</div>
                          <div className="text-xs text-stone-500">{r.v.city || ''}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{r.email || '-'}</div>
                          <div className="text-xs text-stone-500">{r.v.phone || ''}</div>
                        </TableCell>
                        <TableCell>
                          {planBadge(r.v.plan)}
                          {r.paidPlan && <div className="text-xs text-stone-500 mt-1">Plan existant</div>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.offer ? (
                            <div>
                              <Badge className={r.offer.membership_type_code.toLowerCase() === 'gold' ? 'bg-amber-500 text-white' : 'bg-purple-600 text-white'}>
                                {r.offer.membership_type_code.toLowerCase() === 'gold' ? 'Gold test' : 'Premium fondateur'}
                              </Badge>
                              <div className={`text-xs mt-1 ${expired ? 'text-red-600' : 'text-stone-500'}`}>
                                {expired ? 'Expire le ' : "Jusqu'au "}{fmtDate(r.offer.end_date)}
                              </div>
                            </div>
                          ) : <span className="text-stone-400">-</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.offer ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => openConfirm('revoke', [r])}>
                              <Undo2 className="w-4 h-4 mr-1" /> Retirer
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o && !working) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer</DialogTitle>
            <DialogDescription>{confirmLabel}</DialogDescription>
          </DialogHeader>
          {confirm && (
            <ul className="text-sm max-h-48 overflow-y-auto list-disc ml-5 text-stone-700">
              {confirm.vendors.map(r => <li key={r.v.id}>{r.v.business_name || 'Sans nom'} {r.email ? `(${r.email})` : ''}</li>)}
            </ul>
          )}
          {confirm && confirm.type === 'premium' && (
            <p className="text-xs text-stone-500">Places restantes apres cette operation : {premiumRemaining - confirm.vendors.length} sur {PREMIUM_OFFER_LIMIT}.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={working}>Annuler</Button>
            <Button onClick={runConfirm} disabled={working}>
              {working && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
