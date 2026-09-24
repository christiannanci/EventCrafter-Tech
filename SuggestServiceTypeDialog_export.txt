import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { PlusCircle, Loader2, CheckCircle2 } from "lucide-react";

export default function SuggestServiceTypeDialog({ onSubmitted }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        abbreviation: "",
        description: "",
        media_type: "image",
        media_url: ""
    });

    const handleMediaUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            setUploadingMedia(true);
            const result = await UploadFile({ file });
            setFormData({...formData, media_url: result.file_url});
            toast({ title: "Média téléchargé", description: "Votre média a été téléchargé avec succès." });
        } catch (error) {
            toast({ title: "Échec du téléchargement", description: "Le média n'a pas pu être téléchargé. Réessayez.", variant: "destructive" });
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.abbreviation || !formData.description) {
            toast({ title: "Erreur", description: "Veuillez remplir tous les champs requis", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const code = "SRV_" + formData.abbreviation.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const typeCode = "CAT_USER_REQ";

            await base44.entities.ServiceType.create({
                ...formData,
                code_service: code,
                code_typeservice: typeCode,
                status: "pending"
            });

            toast({ 
                title: "Demande Soumise", 
                description: "Votre suggestion de type de service a été envoyée pour approbation par un administrateur." 
            });
            setIsOpen(false);
            setFormData({ name: "", abbreviation: "", description: "", media_type: "image", media_url: "" });
            if(onSubmitted) onSubmitted();

        } catch (error) {
            console.error("Submission failed", error);
            toast({ title: "Erreur", description: "Échec de la soumission de la demande.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2">
                    <PlusCircle className="w-3 h-3 mr-1" /> Suggérer un Nouveau Type
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Suggérer un Nouveau Type de Service</DialogTitle>
                    <DialogDescription>
                        Vous ne trouvez pas votre catégorie ? Suggérez-en une nouvelle. Elle sera visible une fois approuvée par un administrateur.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nom du Service *</Label>
                        <Input 
                            placeholder="ex. Photographie par Drone" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Abréviation (3-4 caractères) *</Label>
                            <Input 
                                placeholder="ex. DRON" 
                                maxLength={5}
                                value={formData.abbreviation}
                                onChange={(e) => setFormData({...formData, abbreviation: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type de Média</Label>
                             <Select 
                                value={formData.media_type}
                                onValueChange={val => setFormData({...formData, media_type: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="image">Image</SelectItem>
                                    <SelectItem value="video">Vidéo</SelectItem>
                                    <SelectItem value="audio">Audio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea 
                            placeholder="Décrivez en quoi consiste ce service..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Média d'Illustration (Optionnel)</Label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="file" 
                                id="servicetype-media-upload"
                                accept="image/*,video/*,audio/*"
                                onChange={handleMediaUpload}
                                className="hidden"
                            />
                            <Button 
                                type="button"
                                variant="outline" 
                                className="w-full"
                                onClick={() => document.getElementById('servicetype-media-upload').click()}
                                disabled={uploadingMedia}
                            >
                                {uploadingMedia ? "Téléchargement..." : formData.media_url ? "Changer le Média" : "Télécharger un Média"}
                            </Button>
                        </div>
                        {formData.media_url && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Média téléchargé avec succès
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-rose-600">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Soumettre la Demande
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
