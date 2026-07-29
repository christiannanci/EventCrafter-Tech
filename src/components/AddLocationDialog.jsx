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
        parent_id: ""
    });
    
    const [parentOptions, setParentOptions] = useState([]);
    const [parentLoading, setParentLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setFormData({ name: "", code: "", parent_id: "" });
            loadParents();
        }
    }, [open, level, parentContext]);

    const loadParents = async () => {
        setParentLoading(true);
        try {
            if (level === 'ville') {
                let depts = await base44.entities.Departement.list();
                if (parentContext?.region) {
                    depts = depts.filter(d => d.region_code === parentContext.region);
                }
                setParentOptions(depts);
            } else if (level === 'quartier') {
                let villes = await base44.entities.Ville.list();
                if (parentContext?.ville) {
                     villes = villes.filter(v => v.code === parentContext.ville || v.name === parentContext.ville);
                     if (villes.length === 1) {
                         setFormData(prev => ({ ...prev, parent_id: villes[0].code }));
                     }
                } else if (parentContext?.region) {
                     // Filtrer les villes par region necessiterait de recuperer les departements... chaine un peu complexe.
                }
                setParentOptions(villes);
            } else if (level === 'departement') {
                let regions = await base44.entities.Region.list();
                if (parentContext?.country) {
                    regions = regions.filter(r => r.country_code === parentContext.country);
                }
                setParentOptions(regions);
                if (parentContext?.region) {
                    const r = regions.find(x => x.code === parentContext.region || x.name === parentContext.region);
                    if (r) setFormData(prev => ({ ...prev, parent_id: r.code }));
                }
            } else if (level === 'arrondissement') {
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
        if (!name) return "";
        const clean = name.toUpperCase().replace(/[^A-Z]/g, '');
        return clean.substring(0, 4) + Math.floor(Math.random() * 1000);
    };

    const handleNameChange = (e) => {
        const name = e.target.value;
        setFormData(prev => ({ 
            ...prev, 
            name,
            code: prev.code || generateCode(name)
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
                await base44.entities.Country.create({ ...commonFields, continent_code: formData.parent_id || 'AF' });
            } else if (level === 'region') {
                await base44.entities.Region.create({ ...commonFields, country_code: formData.parent_id || 'CM' });
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
                title: "Soumis pour Approbation", 
                description: "Votre lieu a été ajouté et est en attente d'approbation par un administrateur." 
            });
            
            if (onSuccess) onSuccess();
            onOpenChange(false);

        } catch (error) {
            console.error("Failed to add location", error);
            toast({ title: "Erreur", description: "Échec de l'ajout du lieu. Vérifiez les champs.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getParentLabel = () => {
        switch(level) {
            case 'country': return 'Continent';
            case 'region': return 'Pays';
            case 'departement': return 'Région';
            case 'ville': return 'Département';
            case 'arrondissement': return 'Département';
            case 'quartier': return 'Ville';
            default: return 'Parent';
        }
    };

    const getLevelLabel = (lvl) => {
        const labels = {
            continent: 'continent',
            country: 'pays',
            region: 'région',
            departement: 'département',
            ville: 'ville',
            arrondissement: 'arrondissement',
            quartier: 'quartier'
        };
        return labels[lvl] || lvl;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="capitalize">Ajouter un(e) {getLevelLabel(level)}</DialogTitle>
                    <DialogDescription>
                        Les détails seront vérifiés par un administrateur avant de devenir publics.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input 
                            value={formData.name}
                            onChange={handleNameChange}
                            placeholder={`Nom du/de la ${getLevelLabel(level)}`}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Code (Identifiant Unique)</Label>
                        <Input 
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                            placeholder="ex. DLA-01"
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
                                    <SelectValue placeholder={`Sélectionner ${getParentLabel()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {parentLoading ? (
                                        <div className="p-2 flex justify-center"><Loader2 className="animate-spin h-4 w-4" /></div>
                                    ) : parentOptions.length > 0 ? (
                                        parentOptions.map(p => (
                                            <SelectItem key={p.id} value={p.code}>{p.name}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>Aucun parent trouvé. Veuillez d'abord ajouter le parent.</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-rose-600">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Soumettre le Lieu
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
