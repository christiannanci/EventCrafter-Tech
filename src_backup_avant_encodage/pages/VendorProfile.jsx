import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/apiClient";
import { UploadFile } from "@/api/integrations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, FileSignature, CheckCircle2 } from "lucide-react";
import VendorProfileForm from "@/components/dashboard/VendorProfileForm";
import VendorBankAccountManager from "@/components/dashboard/VendorBankAccountManager";
import VendorReviewsDisplay from "@/components/dashboard/VendorReviewsDisplay";
import { NotificationService } from '@/components/NotificationService';

export default function VendorProfile() {
  const [user, setUser] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const profiles = await base44.entities.VendorProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0) {
          setVendorProfile(profiles[0]);
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refetchProfile = async () => {
    if (!user) return;
    const profiles = await base44.entities.VendorProfile.filter({ user_id: user.id });
    if (profiles.length > 0) {
      setVendorProfile(profiles[0]);
    }
  };

  if (loading || !user) {
    return <div className="p-20 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Mon Profil Business</h1>
        <p className="text-stone-500">Gérez votre identité commerciale et vérification</p>
      </div>

      <VendorProfileForm 
        user={user} 
        initialProfile={vendorProfile} 
        onSave={refetchProfile} 
      />
      
      {vendorProfile?.verification_status === 'pending' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Verification Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-600">
              Téléchargez l'enregistrement commercial, pièce d'identité ou portfolio (PDF, Word, Audio, Vidéo acceptés).
            </p>
            
            <input 
              type="file" 
              id="verification-docs"
              multiple
              accept=".pdf,.doc,.docx,audio/*,video/*,image/*"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                
                try {
                  toast({ title: "Uploading documents..." });
                  const uploadPromises = files.map(file => 
                    UploadFile({ file })
                  );
                  const results = await Promise.all(uploadPromises);
                  const urls = results.map(r => r.file_url);
                  
                  const currentDocs = vendorProfile.verification_docs || [];
                  await base44.entities.VendorProfile.update(vendorProfile.id, {
                    verification_docs: [...currentDocs, ...urls]
                  });
                  
                  toast({ title: "Documents téléchargés avec succès" });
                  refetchProfile();
                } catch (error) {
                  toast({ 
                    title: "Échec du téléchargement", 
                    description: "Les documents n'ont pas pu être téléchargés.",
                    variant: "destructive" 
                  });
                }
              }}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => document.getElementById('verification-docs').click()}
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Télécharger Document
              </Button>
              
              <Button 
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                disabled={!vendorProfile?.verification_docs?.length}
                onClick={async () => {
                  try {
                    const requests = await base44.entities.VerificationRequest.filter({
                      client_id: user.id,
                      profile_id: vendorProfile.id,
                      status: 'pending'
                    });
                    
                    if (requests.length > 0) {
                      await base44.entities.VerificationRequest.update(requests[0].id, {
                        status: 'documents_received'
                      });
                      
                      await NotificationService.sendToAdmins({
                        title: "Documents de vérification reçus",
                        message: `${vendorProfile.business_name || user.full_name} a soumis ses documents de vérification`,
                        type: "system",
                        link: "/AdminDashboard"
                      });
                      
                      toast({ title: "Documents envoyés à l'administrateur" });
                      refetchProfile();
                    }
                  } catch (error) {
                    toast({ 
                      title: "Erreur lors de l'envoi", 
                      description: "Impossible d'envoyer les documents à l'admin.",
                      variant: "destructive" 
                    });
                  }
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Envoyer à l'admin
              </Button>
            </div>
            
            {vendorProfile?.verification_docs?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-stone-500">Documents Téléchargés :</p>
                {vendorProfile.verification_docs.map((doc, i) => (
                  <a 
                    key={i} 
                    href={doc} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-stone-50 rounded hover:bg-stone-100 text-sm"
                  >
                    <FileSignature className="w-4 h-4 text-rose-600" />
                    Document {i + 1}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <VendorBankAccountManager user={user} />
      
      <div className="mt-6">
        <VendorReviewsDisplay vendorUserId={user.id} />
      </div>
    </div>
  );
}