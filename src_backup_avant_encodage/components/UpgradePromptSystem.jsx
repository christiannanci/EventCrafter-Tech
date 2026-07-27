/**
 * RN6: Système de prompts automatiques pour encourager l'upgrade
 */

import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, TrendingUp, AlertCircle, X } from "lucide-react";

export default function UpgradePromptSystem({ vendorProfile, onUpgradeClick }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [missedLeadsThisWeek, setMissedLeadsThisWeek] = useState(0);

  useEffect(() => {
    if (!vendorProfile || vendorProfile.plan !== 'free') return;

    checkForUpgradePrompts();
  }, [vendorProfile]);

  const checkForUpgradePrompts = async () => {
    try {
      // Vérifier les demandes manquées cette semaine
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const allLeads = await base44.entities.Lead.list();
      const relevantLeads = allLeads.filter(lead => {
        const leadDate = new Date(lead.created_date);
        return leadDate >= weekAgo && lead.status === 'open';
      });

      // Calculer combien de leads ont été manqués (limite free dépassée)
      const missedCount = Math.max(0, relevantLeads.length - 10);
      setMissedLeadsThisWeek(missedCount);

      // Déclencher le prompt si conditions remplies
      if (missedCount >= 3) {
        setPromptMessage(`Vous avez manqué ${missedCount} demandes cette semaine. Passez au Premium pour ne plus rien rater !`);
        setShowPrompt(true);
      } else if (vendorProfile.missed_leads_count >= 5) {
        setPromptMessage(`Vous avez manqué ${vendorProfile.missed_leads_count} demandes ce mois. Débloquez des opportunités illimitées avec Premium !`);
        setShowPrompt(true);
      } else if (vendorProfile.free_leads_count >= 8) {
        setPromptMessage(`Plus que ${10 - vendorProfile.free_leads_count} demandes gratuites ce mois. Passez à Premium pour des prospects illimités !`);
        setShowPrompt(true);
      }
    } catch (error) {
      console.error('Upgrade prompt check error:', error);
    }
  };

  if (!showPrompt) return null;

  return (
    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg mb-6 animate-in slide-in-from-top-5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-stone-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Opportunités Manquées
            </h3>
            <p className="text-stone-700 mb-4">{promptMessage}</p>
            
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={onUpgradeClick}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                <Crown className="w-4 h-4 mr-2" />
                Passer Premium Maintenant
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPrompt(false)}
                className="text-stone-600"
              >
                Plus tard
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-white/80 rounded-lg text-sm text-stone-600">
              <span className="font-bold text-amber-700">💡 Avec Premium:</span> Prospects illimités, notifications instantanées, badge vérifié, et bien plus !
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPrompt(false)}
            className="flex-shrink-0 text-stone-400 hover:text-stone-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}