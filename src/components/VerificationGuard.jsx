/**
 * RN1: Garde de vérification - Redirige les vendeurs non vérifiés
 */

import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { createPageUrl } from '../utils';

export default function VerificationGuard({ user, children }) {
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerificationStatus();
  }, [user]);

  const checkVerificationStatus = async () => {
    if (!user) return;

    try {
      const profiles = await base44.entities.VendorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setVendorProfile(profiles[0]);
      }
    } catch (error) {
      console.error('Verification check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  // RN1: Si pas de profil ou statut unverified/rejected, bloquer l'accès
  if (!vendorProfile || ['unverified', 'rejected'].includes(vendorProfile.verification_status)) {
    return (
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-2xl mx-auto border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              Vérification Requise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-stone-700 mb-4">
                <span className="font-bold text-amber-800">🔒 Spiritual Integrity:</span> Pour protéger la réputation de notre plateforme et la confiance de nos clients, 
                tous les prestataires doivent être vérifiés avant de pouvoir créer des services et recevoir des demandes.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-stone-900">Documents requis pour la vérification:</h3>
              <ul className="space-y-2 text-stone-600">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>CNI (Carte Nationale d'Identité)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>NUI (Numéro Unique d'Identification)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Enregistrement de l'entreprise / RCCM</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>ACF valide (Attestation de Conformité Fiscale)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Numéro de téléphone vérifié</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Photos de l'activité / Portfolio</span>
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <Button 
                onClick={() => window.location.href = createPageUrl('VendorProfile')}
                className="w-full bg-rose-600 hover:bg-rose-700"
                size="lg"
              >
                Commencer la Vérification
              </Button>
            </div>

            {vendorProfile?.verification_status === 'rejected' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 text-sm">
                  <span className="font-bold">❌ Vérification rejetée:</span> Veuillez soumettre de nouveaux documents conformes aux exigences.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si en attente de vérification
  if (vendorProfile.verification_status === 'pending') {
    return (
      <div className="container mx-auto px-4 py-20">
        <Card className="max-w-2xl mx-auto border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              Vérification en Cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-stone-700">
                Vos documents sont en cours de vérification par notre équipe. Ce processus prend généralement 24-48 heures.
                Vous recevrez une notification dès que votre compte sera vérifié.
              </p>
            </div>

            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-12 h-12 text-blue-600 animate-pulse" />
                </div>
                <p className="text-stone-600">En attente de validation...</p>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = createPageUrl('VendorProfile')}
              variant="outline"
              className="w-full"
            >
              Voir mon Profil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si vérifié, afficher le contenu normal
  return children;
}