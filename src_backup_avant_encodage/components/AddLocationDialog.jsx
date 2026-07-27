import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus } from "lucide-react";

export default function AddLocationDialog({ level, parentContext, open, onOpenChange, onSuccess }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        parent_id: "" // Stores the required parent code (e.g., departement_code for ville)
    });
    
    // Dynamic lists for parent selection if needed
    const [parentOptions, setParentOptions] = useState([]);
    const [parentLoading, setParentLoading] = useState(false);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setFormData({ name: "", code: "", parent_id: "" });
            loadParents();
        }
    }, [open, level, parentContext]);

    const loadParents = async () => {
        // If we need to select a parent (e.g. adding City requires Department)
        // And we might have some context (e.g. Region is selected).
        // If level is Ville, parent is Departement. 
        // If Region is known (parentContext.region), filter Departments by Region.
        
        setParentLoading(true);
        try {
            if (level === 'ville') {
                // Fetch departments
                // If parentContext.region is set, filter by it
                let depts = await base44.entities.Departement.list();
                if (parentContext?.region) {
                    depts = depts.filter(d => d.region_code === parentContext.region);
                }
                setParentOptions(depts);
            } else if (level === 'quartier') {
                // Parent is Ville
                let villes = await base44.entities.Ville.list();
                if (parentContext?.ville) {
                     // If we are adding a quartier, usually we selected a city.
                     // If city is selected, we can pre-fill or just show that one.
                     villes = villes.filter(v => v.code === parentContext.ville || v.name === parentContext.ville);
                     if (villes.length === 1) {
                         setFormData(prev => ({ ...prev, parent_id: villes[0].code }));
                     }
                } else if (parentContext?.region) {
                     // Filter cities by region -> requires fetching departments... a bit complex chain.
                     // Let's just list all cities for simplicity or assume context is good.
                }
                setParentOptions(villes);
            } else if (level === 'departement') {
                // Parent is Region
                let regions = await base44.entities.Region.list();
                if (parentContext?.country) {
                    regions = regions.filter(r => r.country_code === parentContext.country);
                }
                setParentOptions(regions);
                 // Pre-fill if region known
                if (parentContext?.region) {
                    const r = regions.find(x => x.code === parentContext.region || x.name === parentContext.region);
                    if (r) setFormData(prev => ({ ...prev, parent_id: r.code }));
                }
            } else if (level === 'arrondissement') {
                // Parent is Departement
                 let depts = await base44.entities.Departement.list();
                 setParentOptions(depts);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setParentLoading(false);
        }
    };

    const generateCode = (name) => {
        // Simple code generation: UPPERCASE, remove spaces, first 3-5 chars + random
        // Or acronym.
        if (!name) return "";
        const clean = name.toUpperCase().replace(/[^A-Z]/g, '');
        return clean.substring(0, 4) + Math.floor(Math.random() * 1000);
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setFormData(prev => ({ 
            ...prev, 
            name,
            code: prev.code || generateCode(name) // Auto-gen code if empty
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const commonFields = {
                name: formData.name,
                code: formData.code,
                status: 'pending'
            };

            if (level === 'continent') {
                await base44.entities.Continent.create(commonFields);
            } else if (level === 'country') {
                await base44.entities.Country.create({ ...commonFields, continent_code: formData.parent_id || 'AF' }); // Default AF
            } else if (level === 'region') {
                await base44.entities.Region.create({ ...commonFields, country_code: formData.parent_id || 'CM' }); // Default CM
            } else if (level === 'departement') {
                await base44.entities.Departement.create({ ...commonFields, region_code: formData.parent_id });
            } else if (level === 'ville') {
                await base44.entities.Ville.create({ ...commonFields, departement_code: formData.parent_id });
            } else if (level === 'arrondissement') {
                await base44.entities.Arrondissement.create({ ...commonFields, departement_code: formData.parent_id });
            } else if (level === 'quartier') {
                await base44.entities.Quartier.create({ ...commonFields, ville_code: formData.parent_id });
            }

            toast({ 
                title: "Submitted for Approval", 
                description: "Your location has been added and is pending admin approval." 
            });
            
            if (onSuccess) onSuccess();
            onOpenChange(false);

        } catch (error) {
            console.error("Failed to add location", error);
            toast({ title: "Error", description: "Failed to add location. Check inputs.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getParentLabel = () => {
        switch(level) {
            case 'country': return 'Continent';
            case 'region': return 'Country';
            case 'departement': return 'Region';
            case 'ville': return 'Department'; // Ville belongs to Department
            case 'arrondissement': return 'Department';
            case 'quartier': return 'City';
            default: return 'Parent';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="capitalize">Add New {level}</DialogTitle>
                    <DialogDescription>
                        Details will be verified by an admin before becoming public.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input 
                            value={formData.name}
                            onChange={handleNameChange}
                            placeholder={`Name of ${level}`}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Code (Unique Identifier)</Label>
                        <Input 
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                            placeholder="e.g. DLA-01"
                            required
                        />
                    </div>

                    {level !== 'continent' && (
                        <div className="space-y-2">
                            <Label>{getParentLabel()}</Label>
                            <Select 
                                value={formData.parent_id} 
                                onValueChange={val => setFormData({...formData, parent_id: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select ${getParentLabel()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {parentLoading ? (
                                        <div className="p-2 flex justify-center"><Loader2 className="animate-spin h-4 w-4" /></div>
                                    ) : parentOptions.length > 0 ? (
                                        parentOptions.map(p => (
                                            <SelectItem key={p.id} value={p.code}>{p.name}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>No parents found. Please add parent first.</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {/* If we are adding a city, and no department exists, we're stuck. 
                                Ideally we should allow adding parent here too, but that's recursive.
                                For now, assume parents exist or user goes up a level. */}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-rose-600">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Submit Location
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}