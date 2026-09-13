import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const isSuccess = status === 'success';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center p-8">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">
          {isSuccess ? 'Paiement Confirme' : 'Paiement Echoue'}
        </h2>
        <p className="text-stone-500 mb-8">
          {isSuccess
            ? 'Votre paiement a ete traite avec succes. Votre reservation ou abonnement sera mis a jour dans quelques instants.'
            : "Le paiement n'a pas pu etre finalise. Aucun montant n'a ete debite. Vous pouvez reessayer depuis votre tableau de bord."}
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/')} variant="outline">Accueil</Button>
          <Button onClick={() => navigate('/ClientDashboard')} className="bg-rose-600 hover:bg-rose-700">
            Mon Tableau de Bord
          </Button>
        </div>
      </Card>
    </div>
  );
}
