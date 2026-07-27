import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Loader } from "lucide-react";
import { migrateVendorProfiles } from "@/components/utils/VendorProfileMigration";

export default function AdminMigration() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);

  const handleMigrate = async () => {
    setMigrating(true);
    const migrationResult = await migrateVendorProfiles();
    setResult(migrationResult);
    setMigrating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Migration des Données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Attention:</strong> Cette opération met à jour tous les profils de prestataires avec les champs manquants.
              </p>
              <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc">
                <li>free_leads_count = 1 (Golden Lead)</li>
                <li>reward_credits = 0</li>
                <li>last_quota_reset = maintenant</li>
                <li>verification_status = pending</li>
              </ul>
            </div>

            <Button 
              onClick={handleMigrate}
              disabled={migrating}
              className="w-full bg-rose-600 hover:bg-rose-700"
            >
              {migrating ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Migration en cours...
                </>
              ) : (
                "Démarrer la Migration"
              )}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {result.success ? (
                  <>
                    <div className="flex items-center gap-2 text-green-800 font-semibold">
                      <CheckCircle className="h-5 w-5" />
                      Migration réussie
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      {result.updated} prestataires mis à jour sur {result.total}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-red-800 font-semibold">
                      <AlertTriangle className="h-5 w-5" />
                      Erreur
                    </div>
                    <p className="text-sm text-red-700 mt-2">{result.error}</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}