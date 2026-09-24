import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Clock, Calendar as CalendarIcon, Ban, CheckCircle2 } from "lucide-react";
import { format, addHours, startOfDay, isSameDay, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function AvailabilityManager({ user }) {
    const [date, setDate] = useState(new Date());
    const [slots, setSlots] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // New Slot Form
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [startTime, setStartTime] = useState("09:00");
    const [duration, setDuration] = useState("1");
    const [slotType, setSlotType] = useState("available");
    const [recurrence, setRecurrence] = useState("none");

    useEffect(() => {
        fetchData();
    }, [user.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedSlots, fetchedBookings] = await Promise.all([
                base44.entities.AvailabilitySlot.filter({ planner_id: user.id }),
                base44.entities.Booking.filter({ planner_id: user.id })
            ]);
            setSlots(fetchedSlots);
            setBookings(fetchedBookings);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSlot = async () => {
        try {
            // Construct datetime
            const [hours, minutes] = startTime.split(':');
            const start = new Date(date);
            start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const end = addHours(start, parseFloat(duration));

            await base44.entities.AvailabilitySlot.create({
                planner_id: user.id,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                type: slotType,
                recurrence: recurrence
            });

            toast({ title: "Créneau Créé", description: `Créneau ${slotType === 'available' ? 'disponible' : 'bloqué'} ajouté.` });
            setIsDialogOpen(false);
            fetchData();
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de créer le créneau", variant: "destructive" });
        }
    };

    const handleDeleteSlot = async (id) => {
        if(confirm("Supprimer ce créneau ?")) {
            await base44.entities.AvailabilitySlot.delete(id);
            fetchData();
        }
    };

    const getSlotTypeLabel = (type) => type === 'blocked' ? 'Bloqué' : 'Disponible';

    const getRecurrenceLabel = (rec) => {
        const labels = { none: 'Une fois', daily: 'Quotidien', weekly: 'Hebdomadaire' };
        return labels[rec] || rec;
    };

    // Filter slots for selected date
    const daySlots = slots.filter(s => isSameDay(parseISO(s.start_time), date));
    const dayBookings = bookings.filter(b => isSameDay(parseISO(b.event_date), date));

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <Card className="md:col-span-5 lg:col-span-4">
                <CardHeader>
                    <CardTitle>Calendrier</CardTitle>
                </CardHeader>
                <CardContent>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={d => d && setDate(d)}
                        className="rounded-md border shadow-sm mx-auto"
                        modifiers={{
                            hasSlots: (d) => slots.some(s => isSameDay(parseISO(s.start_time), d)),
                            hasBooking: (d) => bookings.some(b => isSameDay(parseISO(b.event_date), d)),
                        }}
                        modifiersStyles={{
                            hasSlots: { fontWeight: 'bold', textDecoration: 'underline decoration-green-500' },
                            hasBooking: { fontWeight: 'bold', textDecoration: 'underline decoration-blue-500' }
                        }}
                    />
                    <div className="mt-4 text-xs text-stone-500 space-y-2">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"/> Créneaux Disponibles</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"/> Événements Réservés</div>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-7 lg:col-span-8">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-stone-500" />
                        Planning du {format(date, 'd MMM yyyy')}
                    </CardTitle>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-rose-600 hover:bg-rose-700">
                                <Plus className="w-4 h-4 mr-2" /> Ajouter un Créneau
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Ajouter une Disponibilité / Bloquer un Créneau</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Type</label>
                                        <Select value={slotType} onValueChange={setSlotType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="available">Créneau Disponible</SelectItem>
                                                <SelectItem value="blocked">Créneau Bloqué</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Récurrence</label>
                                        <Select value={recurrence} onValueChange={setRecurrence}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Une fois</SelectItem>
                                                <SelectItem value="daily">Quotidien</SelectItem>
                                                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Heure de Début</label>
                                        <Input 
                                            type="time" 
                                            value={startTime} 
                                            onChange={e => setStartTime(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Durée (Heures)</label>
                                        <Input 
                                            type="number" 
                                            step="0.5" 
                                            value={duration} 
                                            onChange={e => setDuration(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <Button className="w-full bg-rose-600" onClick={handleCreateSlot}>
                                    Enregistrer le Créneau
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Show Bookings First */}
                        {dayBookings.map(booking => (
                            <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                        <CalendarIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-900">Réservation : {booking.title || booking.client_name}</p>
                                        <p className="text-xs text-blue-700">Statut : {booking.status}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Slots */}
                        {daySlots.length > 0 ? daySlots.sort((a,b) => new Date(a.start_time) - new Date(b.start_time)).map(slot => (
                            <div key={slot.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                                slot.type === 'blocked' ? 'border-red-100 bg-red-50' : 'border-green-100 bg-green-50'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${slot.type === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {slot.type === 'blocked' ? <Ban className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className={`font-semibold ${slot.type === 'blocked' ? 'text-red-900' : 'text-green-900'}`}>
                                            {format(parseISO(slot.start_time), 'HH:mm')} - {format(parseISO(slot.end_time), 'HH:mm')}
                                        </p>
                                        <p className="text-xs opacity-70">
                                            {getSlotTypeLabel(slot.type)} {slot.recurrence !== 'none' && `• ${getRecurrenceLabel(slot.recurrence)}`}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="text-stone-400 hover:text-red-600" onClick={() => handleDeleteSlot(slot.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )) : (
                            dayBookings.length === 0 && (
                                <div className="text-center py-10 text-stone-400">
                                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p>Aucun créneau ni réservation pour ce jour</p>
                                </div>
                            )
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
