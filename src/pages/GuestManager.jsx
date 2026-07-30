import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Users, Utensils, Mail, MapPin } from "lucide-react";
import { useLocationContext } from '@/components/LocationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EVENT_TYPE_LABELS = {
  Wedding: 'Mariage',
  Birthday: 'Anniversaire',
  Corporate: 'Événement d\'Entreprise',
  Conference: 'Conférence',
  'Baby Shower': 'Baby Shower',
  Graduation: 'Remise de Diplôme',
  Religious: 'Cérémonie Religieuse',
  Other: 'Autre'
};

const GROUP_LABELS = {
  'Bride Family': 'Famille de la Mariée',
  'Groom Family': 'Famille du Marié',
  'Bride Friends': 'Amis de la Mariée',
  'Groom Friends': 'Amis du Marié',
  'Colleagues': 'Collègues',
  'Other': 'Autre'
};

export default function GuestManager() {
  const { currency, currencySymbol } = useLocationContext();
  const [guests, setGuests] = useState([]);
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    event_type: "Wedding", 
    start_date: "",
    location_city: "",
    address: "",
    currency: currency
  });
  const [newGuest, setNewGuest] = useState({
    full_name: "",
    email: "",
    group: "Bride Family",
    rsvp_status: "Pending",
    table_number: ""
  });

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const allEvents = await base44.entities.Event.list();
        const myEvents = allEvents.filter(e => e.client_id === currentUser.id);
        setEvents(myEvents);
        
        if (myEvents.length > 0) {
          setSelectedEvent(myEvents[0]);
        }
      } catch (e) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadGuests = async () => {
      if (!selectedEvent) {
        setGuests([]);
        return;
      }
      const data = await base44.entities.Guest.list();
      const eventGuests = data.filter(g => g.event_id === selectedEvent.id);
      setGuests(eventGuests);
    };
    loadGuests();
  }, [selectedEvent]);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.start_date) return;
    try {
      const created = await base44.entities.Event.create({
        ...newEvent,
        client_id: user.id,
        status: "planning",
        currency: newEvent.currency || currency
      });
      setEvents([...events, created]);
      setSelectedEvent(created);
      setNewEvent({ 
        title: "", 
        event_type: "Wedding", 
        start_date: "",
        location_city: "",
        address: "",
        currency: currency
      });
      setIsEventDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddGuest = async () => {
    if (!newGuest.full_name || !selectedEvent) return;
    try {
      const created = await base44.entities.Guest.create({
        ...newGuest,
        event_id: selectedEvent.id
      });
      setGuests([...guests, created]);
      setNewGuest({ full_name: "", email: "", group: "Bride Family", rsvp_status: "Pending", table_number: "" });
      setIsAddOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteGuest = async (id) => {
    await base44.entities.Guest.delete(id);
    setGuests(guests.filter(g => g.id !== id));
  };

  const updateGuest = async (id, data) => {
    await base44.entities.Guest.update(id, data);
    setGuests(guests.map(g => g.id === id ? { ...g, ...data } : g));
  };

  const stats = {
    total: guests.length,
    accepted: guests.filter(g => g.rsvp_status === 'Accepted').length,
    declined: guests.filter(g => g.rsvp_status === 'Declined').length,
    pending: guests.filter(g => g.rsvp_status === 'Pending').length,
  };

  if (loading) return <div className="p-20 text-center">Chargement des Invités...</div>;
  if (!user) return <div className="p-20 text-center">Veuillez vous connecter pour gérer vos invités.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Liste des Invités</h1>
          {selectedEvent && (
            <p className="text-stone-500 text-sm mt-1">{selectedEvent.title}</p>
          )}
        </div>
        <div className="flex gap-2">
          {events.length > 0 && (
            <Select value={selectedEvent?.id} onValueChange={(id) => setSelectedEvent(events.find(e => e.id === id))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sélectionner un Événement" />
              </SelectTrigger>
              <SelectContent>
                {events.map(evt => (
                  <SelectItem key={evt.id} value={evt.id}>{evt.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-rose-200 text-rose-600">
                <Plus className="w-4 h-4 mr-2" /> Nouvel Événement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un Événement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input 
                  placeholder="Titre de l'événement" 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
                <Select 
                  value={newEvent.event_type}
                  onValueChange={val => setNewEvent({...newEvent, event_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type d'événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Wedding", "Birthday", "Corporate", "Conference", "Baby Shower", "Graduation", "Religious", "Other"].map(t => (
                      <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t] || t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  type="date" 
                  value={newEvent.start_date}
                  onChange={e => setNewEvent({...newEvent, start_date: e.target.value})}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Lieu de l'événement
                  </label>
                  <Input 
                    placeholder="Ville" 
                    value={newEvent.location_city}
                    onChange={e => setNewEvent({...newEvent, location_city: e.target.value})}
                  />
                  <Input 
                    placeholder="Adresse complète (optionnel)" 
                    value={newEvent.address}
                    onChange={e => setNewEvent({...newEvent, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Devise du budget</label>
                  <Select 
                    value={newEvent.currency}
                    onValueChange={val => setNewEvent({...newEvent, currency: val})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XAF">FCFA (XAF)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="USD">Dollar US (USD)</SelectItem>
                      <SelectItem value="GBP">Livre Sterling (GBP)</SelectItem>
                      <SelectItem value="NGN">Naira (NGN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-rose-600" onClick={handleCreateEvent}>Créer l'Événement</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-rose-600 hover:bg-rose-700" disabled={!selectedEvent}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter un Invité
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un Nouvel Invité</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input 
                placeholder="Nom Complet" 
                value={newGuest.full_name}
                onChange={e => setNewGuest({...newGuest, full_name: e.target.value})}
              />
              <Input 
                placeholder="Email (Optionnel)" 
                value={newGuest.email}
                onChange={e => setNewGuest({...newGuest, email: e.target.value})}
              />
              <Select 
                value={newGuest.group}
                onValueChange={val => setNewGuest({...newGuest, group: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Groupe" />
                </SelectTrigger>
                <SelectContent>
                  {["Bride Family", "Groom Family", "Bride Friends", "Groom Friends", "Colleagues", "Other"].map(g => (
                    <SelectItem key={g} value={g}>{GROUP_LABELS[g] || g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="w-full bg-rose-600" onClick={handleAddGuest}>Enregistrer l'Invité</Button>
            </div>
          </DialogContent>
          </Dialog>
          </div>
          </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
          <div className="text-2xl font-bold text-stone-900">{stats.total}</div>
          <div className="text-xs text-stone-500 uppercase font-medium">Total Invités</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
          <div className="text-xs text-green-600 uppercase font-medium">Présents</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-xs text-yellow-600 uppercase font-medium">En Attente</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.declined}</div>
          <div className="text-xs text-red-600 uppercase font-medium">Déclinés</div>
        </div>
      </div>

      {!selectedEvent ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <p className="text-stone-500 mb-4">Veuillez créer ou sélectionner un événement pour gérer les invités.</p>
            <Button onClick={() => setIsEventDialogOpen(true)} className="bg-rose-600">
              <Plus className="w-4 h-4 mr-2" /> Créer un Événement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left p-4 font-medium text-stone-500">Nom</th>
                <th className="text-left p-4 font-medium text-stone-500">Groupe</th>
                <th className="text-left p-4 font-medium text-stone-500">RSVP</th>
                <th className="text-left p-4 font-medium text-stone-500">Table</th>
                <th className="text-right p-4 font-medium text-stone-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {guests.map(guest => (
                <tr key={guest.id} className="group hover:bg-stone-50/50">
                  <td className="p-4">
                    <div className="font-medium text-stone-900">{guest.full_name}</div>
                    {guest.email && <div className="text-stone-400 text-xs">{guest.email}</div>}
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="font-normal text-stone-600 bg-stone-100">
                      {GROUP_LABELS[guest.group] || guest.group}
                    </Badge>
                  </td>
                  <td className="p-4">
                     <Select 
                      defaultValue={guest.rsvp_status} 
                      onValueChange={(val) => updateGuest(guest.id, { rsvp_status: val })}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">En Attente</SelectItem>
                        <SelectItem value="Accepted">Accepté</SelectItem>
                        <SelectItem value="Declined">Décliné</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <Input 
                      className="w-16 h-8 text-center" 
                      placeholder="-" 
                      defaultValue={guest.table_number}
                      onBlur={(e) => updateGuest(guest.id, { table_number: e.target.value })}
                    />
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" className="text-stone-400 hover:text-red-500" onClick={() => deleteGuest(guest.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {guests.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Users className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-500">Aucun invité ajouté pour le moment.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
