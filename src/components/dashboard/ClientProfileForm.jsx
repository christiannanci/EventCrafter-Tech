import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { MapPin, User, Phone, Mail, Wallet, Shield, FileText, Upload, Trash2, Video, Music } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import ClientVerificationDialog from './ClientVerificationDialog';

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export default function ClientProfileForm({ user, initialProfile, onSave }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        last_name: "",
        first_name: "",
        neighborhood_code: "",
        gps_longitude: "",
        gps_latitude: "",
        phone: "",
        whatsapp: "",
        contact_email: "",
        profile_image: "",
        verification_documents: []
    });

    useEffect(() => {
        if (initialProfile) {
            setFormData({
                last_name: initialProfile.last_name || "",
                first_name: initialProfile.first_name || "",
                neighborhood_code: initialProfile.neighborhood_code || "",
                gps_longitude: initialProfile.gps_longitude || "",
                gps_latitude: initialProfile.gps_latitude || "",
                phone: initialProfile.phone || "",
                whatsapp: initialProfile.whatsapp || "",
                contact_email: initialProfile.contact_email || user.email || "",
                profile_image: initialProfile.profile_image || "",
                verification_documents: initialProfile.verification_documents || []
            });
        } else if (user) {
            // Pre-fill from user object if no profile exists
            setFormData(prev => ({
                ...prev,
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                contact_email: user.email || ""
            }));
        }
    }, [initialProfile, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationSelect = (latlng) => {
        setFormData(prev => ({
            ...prev,
            gps_latitude: latlng.lat,
            gps_longitude: latlng.lng
        }));
    };

    const handleProfileImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const originalLoading = loading;
        setLoading(true);
        try {
            const { file_url } = await UploadFile({ file: file });
            setFormData(prev => ({
                ...prev,
                profile_image: file_url
            }));
            toast({ title: "Success", description: "Profile photo updated." });
        } catch (error) {
            console.error("Upload failed", error);
            toast({ title: "Error", description: "Failed to upload photo.", variant: "destructive" });
        } finally {
            if (!originalLoading) setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const originalLoading = loading;
        setLoading(true);
        try {
            const { file_url } = await UploadFile({ file: file });
            setFormData(prev => ({
                ...prev,
                verification_documents: [...(prev.verification_documents || []), file_url]
            }));
            toast({ title: "Success", description: "Document uploaded successfully." });
        } catch (error) {
            console.error("Upload failed", error);
            toast({ title: "Error", description: "Failed to upload document.", variant: "destructive" });
        } finally {
            setLoading(originalLoading); // Restore previous loading state if any, or just false. 
            // Actually loading state in this component is used for "Saving..." button. 
            // I should probably verify if I should use a separate state, but for now this works to block save while uploading.
            if (!originalLoading) setLoading(false);
        }
    };

    const removeDocument = (index) => {
        setFormData(prev => ({
            ...prev,
            verification_documents: prev.verification_documents.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Determine status
            let newStatus = initialProfile?.verification_status || 'unverified';
            // If docs are provided and we are unverified (or rejected), move to pending
            if (formData.verification_documents?.length > 0 && (newStatus === 'unverified' || newStatus === 'rejected')) {
                newStatus = 'pending';
            }

            const dataToSave = {
                ...formData,
                user_id: user.id,
                // Ensure numbers are numbers
                gps_longitude: formData.gps_longitude ? parseFloat(formData.gps_longitude) : null,
                gps_latitude: formData.gps_latitude ? parseFloat(formData.gps_latitude) : null,
                verification_status: newStatus
            };

            if (initialProfile) {
                await base44.entities.ClientProfile.update(initialProfile.id, dataToSave);
            } else {
                await base44.entities.ClientProfile.create(dataToSave);
            }

            toast({
                title: "Profile Updated",
                description: "Your client information has been saved successfully.",
            });
            
            if (onSave) onSave();
        } catch (error) {
            console.error("Error saving profile:", error);
            toast({
                title: "Error",
                description: "Failed to save profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getVerificationBadge = (status) => {
        const styles = {
            verified: "bg-green-100 text-green-800",
            pending: "bg-yellow-100 text-yellow-800",
            rejected: "bg-red-100 text-red-800",
            unverified: "bg-gray-100 text-gray-800"
        };
        return (
            <Badge className={styles[status] || styles.unverified}>
                {status?.toUpperCase() || "UNVERIFIED"}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-full bg-stone-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                                {formData.profile_image ? (
                                    <img src={formData.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-stone-300" />
                                )}
                            </div>
                            <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md cursor-pointer hover:bg-stone-50 border border-stone-200">
                                <Upload className="w-3 h-3 text-stone-600" />
                                <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleProfileImageUpload} />
                            </label>
                        </div>
                        <div>
                            <CardTitle>Client Profile</CardTitle>
                            <CardDescription>Manage your personal information.</CardDescription>
                        </div>
                    </div>
                    {initialProfile && <ClientVerificationDialog profile={initialProfile} user={user} onUpdate={onSave} />}
                </div>
            </CardHeader>
            <CardContent>
                {initialProfile && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full border border-stone-200">
                                <Wallet className="w-5 h-5 text-stone-500" />
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 uppercase font-semibold">Account Balance</p>
                                <p className="text-xl font-bold text-stone-900">
                                    {initialProfile.account_balance?.toLocaleString()} FCFA
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full border border-stone-200">
                                <Shield className="w-5 h-5 text-stone-500" />
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 uppercase font-semibold">Verification Status</p>
                                <p className="text-sm font-medium text-stone-900">
                                    {initialProfile.verification_status === 'verified' 
                                        ? 'Identity Verified' 
                                        : 'Identity Verification Required'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name (Nom) *</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                                <Input 
                                    id="last_name" 
                                    name="last_name" 
                                    placeholder="Doe" 
                                    className="pl-9"
                                    value={formData.last_name} 
                                    onChange={handleChange} 
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name (Prénom) *</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                                <Input 
                                    id="first_name" 
                                    name="first_name" 
                                    placeholder="John" 
                                    className="pl-9"
                                    value={formData.first_name} 
                                    onChange={handleChange} 
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contact_email">Contact Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                            <Input 
                                id="contact_email" 
                                name="contact_email" 
                                type="email"
                                placeholder="john.doe@example.com" 
                                className="pl-9"
                                value={formData.contact_email} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                                <Input 
                                    id="phone" 
                                    name="phone" 
                                    placeholder="+237 6..." 
                                    className="pl-9"
                                    value={formData.phone} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp">WhatsApp Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                                <Input 
                                    id="whatsapp" 
                                    name="whatsapp" 
                                    placeholder="+237 6..." 
                                    className="pl-9"
                                    value={formData.whatsapp} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4">
                        <h3 className="text-sm font-semibold mb-4 text-stone-900 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Verification Documents
                        </h3>
                        <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mb-6">
                            <p className="text-sm text-stone-500 mb-4">
                                Upload ID cards, proof of address, or video introductions (PDF, Word, Audio, Video supported). 
                                Your account will be reviewed by an administrator.
                            </p>
                            
                            <div className="flex items-center gap-4 mb-4">
                                <Button type="button" variant="outline" onClick={() => document.getElementById('doc-upload').click()} disabled={loading}>
                                    <Upload className="w-4 h-4 mr-2" /> Upload Document
                                </Button>
                                <input 
                                    id="doc-upload" 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.doc,.docx,audio/*,video/*,image/*"
                                    onChange={handleFileUpload}
                                />
                                {loading && <span className="text-xs text-stone-500 animate-pulse">Uploading...</span>}
                            </div>

                            {formData.verification_documents?.length > 0 && (
                                <div className="space-y-2">
                                    {formData.verification_documents.map((doc, index) => (
                                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-stone-100">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                                <a href={doc} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[200px]">
                                                    Document {index + 1}
                                                </a>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-red-500" onClick={() => removeDocument(index)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4">
                        <h3 className="text-sm font-semibold mb-4 text-stone-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Location Details
                        </h3>
                        
                        <div className="mb-4 h-[300px] w-full rounded-lg overflow-hidden border border-stone-200 z-0 relative">
                            <MapContainer 
                                center={[formData.gps_latitude || 4.0511, formData.gps_longitude || 9.7679]} 
                                zoom={13} 
                                scrollWheelZoom={false}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <LocationMarker 
                                    position={formData.gps_latitude && formData.gps_longitude ? [formData.gps_latitude, formData.gps_longitude] : null} 
                                    setPosition={handleLocationSelect} 
                                />
                            </MapContainer>
                        </div>
                        <p className="text-xs text-stone-500 mb-4 text-center">
                            Tap on the map to set your exact location.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="neighborhood_code">Neighborhood Code</Label>
                                <Input 
                                    id="neighborhood_code" 
                                    name="neighborhood_code" 
                                    placeholder="e.g. AKWA-001" 
                                    value={formData.neighborhood_code} 
                                    onChange={handleChange} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gps_latitude">Latitude</Label>
                                <Input 
                                    id="gps_latitude" 
                                    name="gps_latitude" 
                                    type="number" 
                                    step="any"
                                    placeholder="4.0511" 
                                    value={formData.gps_latitude} 
                                    onChange={handleChange}
                                    readOnly
                                    className="bg-stone-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gps_longitude">Longitude</Label>
                                <Input 
                                    id="gps_longitude" 
                                    name="gps_longitude" 
                                    type="number" 
                                    step="any"
                                    placeholder="9.7679" 
                                    value={formData.gps_longitude} 
                                    onChange={handleChange}
                                    readOnly
                                    className="bg-stone-50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" className="bg-rose-600 hover:bg-rose-700" disabled={loading}>
                            {loading ? "Saving..." : "Save Profile Changes"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
