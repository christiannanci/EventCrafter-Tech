import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, MapPin, Shield, Wallet, Upload, FileText, Trash2, Camera, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import PhoneInput from '@/components/PhoneInput';
import { useLanguage } from '@/components/LanguageContext';

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

export default function VendorProfileForm({ user, initialProfile, onSave }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    business_name: "",
    description: "",
    city: "",
    phone: "",
    website: "",
    neighborhood_code: "",
    gps_latitude: "",
    gps_longitude: "",
    verification_documents: [],
    profile_image: "",
    ...initialProfile
  });

  useEffect(() => {
    if (initialProfile) {
        setProfile(prev => ({ ...prev, ...initialProfile }));
    }
  }, [initialProfile]);

  const handleLocationSelect = (latlng) => {
    setProfile(prev => ({
        ...prev,
        gps_latitude: latlng.lat,
        gps_longitude: latlng.lng
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const originalLoading = loading;
    setLoading(true);
    try {
        const { compressImage, isImage, formatFileSize } = await import('../ImageCompressor');
        let fileToUpload = file;

        if (isImage(file)) {
            toast.info(t('vendor.compressingImage'));
            fileToUpload = await compressImage(file, {
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.85,
                outputFormat: 'webp'
            });

            const savedPercent = Math.round((1 - fileToUpload.size / file.size) * 100);
            toast.success(`${t('vendor.imageOptimized')} (${savedPercent}% ${t('vendor.reduced')})`);
        }

        const { file_url } = await UploadFile({ file: fileToUpload });
        setProfile(prev => ({
            ...prev,
            profile_image: file_url
        }));
        toast.success(t('vendor.logoUpdatedSuccess'));
    } catch (error) {
        console.error("Upload failed", error);
        toast.error(t('vendor.logoUploadError'));
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
        setProfile(prev => ({
            ...prev,
            verification_documents: [...(prev.verification_documents || []), file_url]
        }));
        toast.success(t('vendor.imageUploadedSuccess'));
    } catch (error) {
        console.error("Upload failed", error);
        toast.error(t('vendor.uploadFailed'));
    } finally {
        if (!originalLoading) setLoading(false);
    }
  };

  const removeDocument = (index) => {
    setProfile(prev => ({
        ...prev,
        verification_documents: prev.verification_documents.filter((_, i) => i !== index)
    }));
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
            {status?.toUpperCase() || t('vendor.unverified')}
        </Badge>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let newStatus = profile.verification_status || 'unverified';
      if (profile.verification_documents?.length > 0 && (newStatus === 'unverified' || newStatus === 'rejected')) {
          newStatus = 'pending';
      }

      const payload = {
          business_name: profile.business_name,
          description: profile.description,
          city: profile.city,
          phone: profile.phone,
          website: profile.website,
          neighborhood_code: profile.neighborhood_code,
          gps_latitude: profile.gps_latitude ? parseFloat(profile.gps_latitude) : null,
          gps_longitude: profile.gps_longitude ? parseFloat(profile.gps_longitude) : null,
          verification_documents: profile.verification_documents,
          profile_image: profile.profile_image,
          verification_status: newStatus
      };

      if (initialProfile?.id) {
        await base44.entities.VendorProfile.update(initialProfile.id, payload);
      } else {
        await base44.entities.VendorProfile.create({
            ...payload,
            user_id: user.id,
            plan: 'free',
            subscription_status: 'active',
            account_balance: 0
        });
      }
      toast.success(t('vendor.serviceUpdated'));
      if (onSave) onSave();
    } catch (error) {
      console.error(error);
      toast.error(t('vendor.saveErrorDesc'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <div className="w-20 h-20 rounded-lg bg-stone-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                        {profile.profile_image ? (
                            <img src={profile.profile_image} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Store className="w-8 h-8 text-stone-300" />
                        )}
                    </div>
                    <label htmlFor="logo-upload" className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-stone-50 border border-stone-200">
                        <Camera className="w-4 h-4 text-stone-600" />
                        <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                </div>
                <div>
                    <CardTitle>{t('vendor.professionalProfile')}</CardTitle>
                    <CardDescription>{t('vendor.professionalProfileDesc')}</CardDescription>
                </div>
            </div>
            {initialProfile && (
              <Badge className={
                profile.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                profile.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                profile.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }>
                {profile.verification_status === 'verified' ? t('vendor.verified') :
                 profile.verification_status === 'pending' ? t('vendor.pending') :
                 profile.verification_status === 'rejected' ? t('vendor.rejected') : t('vendor.unverified')}
              </Badge>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-lg border border-stone-100">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full border border-stone-200">
                    <Wallet className="w-5 h-5 text-stone-500" />
                </div>
                <div>
                    <p className="text-xs text-stone-500 uppercase font-semibold">{t('vendor.walletBalanceLabel')}</p>
                    <p className="text-xl font-bold text-stone-900">
                        {profile.account_balance?.toLocaleString() || 0} FCFA
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full border border-stone-200">
                    <Shield className="w-5 h-5 text-stone-500" />
                </div>
                <div>
                    <p className="text-xs text-stone-500 uppercase font-semibold">{t('vendor.verificationLabel')}</p>
                    <p className="text-sm font-medium text-stone-900">
                        {profile.verification_status === 'verified'
                            ? t('vendor.businessVerified')
                            : t('vendor.documentsRequiredForBadge')}
                    </p>
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('vendor.businessNameLabel')}</Label>
              <Input
                value={profile.business_name || ""}
                onChange={e => setProfile({...profile, business_name: e.target.value})}
                placeholder="ex. Elite Events"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('vendor.phoneNumberLabel')}</Label>
              <PhoneInput
                value={profile.phone || ""}
                onChange={(val) => setProfile({...profile, phone: val})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>{t('vendor.cityZoneLabel')}</Label>
              <Input
                value={profile.city || ""}
                onChange={e => setProfile({...profile, city: e.target.value})}
                placeholder="ex. Douala"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('vendor.websiteLabel')}</Label>
              <Input
                value={profile.website || ""}
                onChange={e => setProfile({...profile, website: e.target.value})}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('vendor.aboutBusinessLabel')}</Label>
            <Textarea
              value={profile.description || ""}
              onChange={e => setProfile({...profile, description: e.target.value})}
              placeholder={t('vendor.presentServicePlaceholder')}
              className="h-32"
            />
          </div>

          <div className="border-t border-stone-100 pt-4">
            <h3 className="text-sm font-semibold mb-4 text-stone-900 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {t('vendor.verificationDocs')}
            </h3>
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mb-6">
                <p className="text-sm text-stone-500 mb-4">
                    {t('vendor.verificationDocsDesc')}
                </p>

                <div className="flex items-center gap-4 mb-4">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('vendor-doc-upload').click()} disabled={loading}>
                        <Upload className="w-4 h-4 mr-2" /> {t('vendor.uploadDocument')}
                    </Button>
                    <input
                        id="vendor-doc-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,audio/*,video/*,image/*"
                        onChange={handleFileUpload}
                    />
                </div>

                {profile.verification_documents?.length > 0 && (
                    <div className="space-y-2">
                        {profile.verification_documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-stone-100">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                    <a href={doc} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[200px]">
                                        {t('vendor.document')} {index + 1}
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
                <MapPin className="w-4 h-4" /> {t('vendor.locationDetails')}
            </h3>

            <div className="mb-4 h-[300px] w-full rounded-lg overflow-hidden border border-stone-200 z-0 relative">
                <MapContainer
                    center={[profile.gps_latitude || 4.0511, profile.gps_longitude || 9.7679]}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                        position={profile.gps_latitude && profile.gps_longitude ? [profile.gps_latitude, profile.gps_longitude] : null}
                        setPosition={handleLocationSelect}
                    />
                </MapContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <div className="space-y-2">
                    <Label>{t('vendor.neighborhoodCodeLabel')}</Label>
                    <Input
                        placeholder="ex. AKWA-001"
                        value={profile.neighborhood_code || ""}
                        onChange={e => setProfile({...profile, neighborhood_code: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('vendor.latitudeLabel')}</Label>
                    <Input
                        value={profile.gps_latitude || ""}
                        readOnly
                        className="bg-stone-50"
                    />
                </div>
                <div className="space-y-2">
                    <Label>{t('vendor.longitudeLabel')}</Label>
                    <Input
                        value={profile.gps_longitude || ""}
                        readOnly
                        className="bg-stone-50"
                    />
                </div>
            </div>
          </div>

          <Button type="submit" className="bg-rose-600 hover:bg-rose-700 w-full md:w-auto" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {t('vendor.saveProfileButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
