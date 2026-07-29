import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/apiClient";
import { History } from "lucide-react";

export default function LogInteractionDialog({ booking, currentUser }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        interaction_type: "text",
        duration_minutes: "",
        deal_concluded: false,
        notes: "",
        date: new Date().toISOString().slice(0, 16)
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const clientId = booking.client_id || booking.created_by; 
            const providerId = booking.planner_id;

            await base44.entities.NegotiationLog.create({
                booking_id: booking.id,
                client_id: clientId,
                provider_id: providerId,
                timestamp: new Date(formData.date).toISOString(),
                interaction_type: formData.interaction_type,
                duration_minutes: parseInt(formData.duration_minutes) || 0,
                deal_concluded: formData.deal_concluded,
                notes: formData.notes
            });

            setOpen(false);
            setFormData({
                interaction_type: "text",
                duration_minutes: "",
                deal_concluded: false,
                notes: "",
                date: new Date().toISOString().slice(0, 16)
            });
        } catch (error) {
            console.error("Failed to log interaction", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-stone-500 hover:text-stone-700 hover:bg-stone-100">
                    <History className="w-4 h-4 mr-2" /> Journaliser une Activité
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Journaliser une Interaction / Activité</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date & Heure</Label>
                            <Input 
                                type="datetime-local" 
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select 
                                value={formData.interaction_type} 
                                onValueChange={v => setFormData({...formData, interaction_type: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Message / Texte</SelectItem>
                                    <SelectItem value="audio">Appel Audio</SelectItem>
                                    <SelectItem value="video">Appel Vidéo</SelectItem>
                                    <SelectItem value="visit">Visite Physique</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                         <Label>Durée (minutes)</Label>
                         <Input 
                            type="number" 
                            placeholder="ex. 15"
                            value={formData.duration_minutes}
                            onChange={e => setFormData({...formData, duration_minutes: e.target.value})}
                         />
                    </div>

                    <div className="flex items-center space-x-2 border p-3 rounded bg-stone-50">
                        <Checkbox 
                            id="deal" 
                            checked={formData.deal_concluded}
                            onCheckedChange={c => setFormData({...formData, deal_concluded: c})}
                        />
                        <Label htmlFor="deal" className="cursor-pointer text-sm font-medium">
                            Cette interaction a-t-elle abouti à un accord ?
                        </Label>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea 
                            placeholder="Résumé de la conversation..."
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
