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
        media_url: "" // Optional
    });

    const handleMediaUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            setUploadingMedia(true);
            const result = await UploadFile({ file });
            setFormData({...formData, media_url: result.file_url});
            toast({ title: "Media uploaded", description: "Your media has been uploaded successfully." });
        } catch (error) {
            toast({ title: "Upload failed", description: "Failed to upload media. Please try again.", variant: "destructive" });
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.abbreviation || !formData.description) {
            toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Generate basic codes if not provided by admin
            const code = "SRV_" + formData.abbreviation.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const typeCode = "CAT_USER_REQ";

            await base44.entities.ServiceType.create({
                ...formData,
                code_service: code,
                code_typeservice: typeCode,
                status: "pending"
            });

            toast({ 
                title: "Request Submitted", 
                description: "Your service type suggestion has been sent for admin approval." 
            });
            setIsOpen(false);
            setFormData({ name: "", abbreviation: "", description: "", media_type: "image", media_url: "" });
            if(onSubmitted) onSubmitted();

        } catch (error) {
            console.error("Submission failed", error);
            toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2">
                    <PlusCircle className="w-3 h-3 mr-1" /> Suggest New
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Suggest New Service Type</DialogTitle>
                    <DialogDescription>
                        Can't find your category? Suggest a new one. It will be visible once approved by an admin.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Service Name *</Label>
                        <Input 
                            placeholder="e.g. Drone Photography" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Abbreviation (3-4 chars) *</Label>
                            <Input 
                                placeholder="e.g. DRON" 
                                maxLength={5}
                                value={formData.abbreviation}
                                onChange={(e) => setFormData({...formData, abbreviation: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Media Type</Label>
                             <Select 
                                value={formData.media_type}
                                onValueChange={val => setFormData({...formData, media_type: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="image">Image</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="audio">Audio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea 
                            placeholder="Describe what this service entails..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Illustration Media (Optional)</Label>
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
                                {uploadingMedia ? "Uploading..." : formData.media_url ? "Change Media" : "Upload Media"}
                            </Button>
                        </div>
                        {formData.media_url && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Media uploaded successfully
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-rose-600">
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}