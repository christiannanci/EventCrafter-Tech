import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState("");

  const faqs = [
    {
      category: "Paiements & Remboursements",
      questions: [
        {
          q: "Comment fonctionne le système d'escrow ?",
          a: "Vos fonds sont sécurisés jusqu'à la livraison du service. Le prestataire reçoit le paiement uniquement après votre confirmation de satisfaction."
        },
        {
          q: "Puis-je obtenir un remboursement ?",
          a: "Oui, si le service n'est pas livré ou ne correspond pas au contrat. Un litige peut être ouvert et notre équipe arbitrera sous 7 jours."
        },
        {
          q: "Quels sont les délais de remboursement ?",
          a: "Après validation du litige en votre faveur, le remboursement est effectué sous 3-5 jours ouvrables sur votre compte Mobile Money."
        },
        {
          q: "Comment valider ma preuve de paiement ?",
          a: "Après transfert Mobile Money, téléchargez la capture d'écran dans le formulaire. Notre équipe valide sous 24h et active votre abonnement."
        }
      ]
    },
    {
      category: "Prestataires & Abonnements",
      questions: [
        {
          q: "Combien coûte l'abonnement Premium ?",
          a: "L'abonnement Premium coûte 5,000 FCFA/mois et offre 20 leads, visibilité prioritaire et analytics détaillés."
        },
        {
          q: "Comment devenir prestataire vérifié ?",
          a: "Soumettez vos documents (CNI, registre de commerce) dans votre dashboard. Vérification sous 48-72h. Badge Vérifié = +40% de confiance clients."
        },
        {
          q: "Puis-je changer mon abonnement ?",
          a: "Oui, vous pouvez passer de Gratuit à Premium ou Gold à tout moment. Le nouveau tarif s'applique immédiatement."
        },
        {
          q: "Que faire si je manque des leads ?",
          a: "Passez à Premium/Gold pour débloquer plus de leads. Ou achetez des packs de crédits (5 leads = 2,000 FCFA)."
        }
      ]
    },
    {
      category: "Réservations & Contrats",
      questions: [
        {
          q: "Comment réserver un prestataire ?",
          a: "Cliquez sur 'Réserver', négociez le prix, signez le contrat numérique, puis payez. Simple et sécurisé."
        },
        {
          q: "Le contrat est-il légalement valable ?",
          a: "Oui, les contrats signés électroniquement ont la même valeur légale qu'un contrat papier au Cameroun."
        },
        {
          q: "Puis-je annuler une réservation ?",
          a: "Oui, selon les conditions du contrat. Généralement : Annulation >30 jours = remboursement total. <7 jours = frais d'annulation."
        },
        {
          q: "Comment suivre l'avancement de ma réservation ?",
          a: "Dans votre Dashboard Client > Mes Réservations. Statut en temps réel : Confirmé → En cours → Livré → Complété."
        }
      ]
    },
    {
      category: "Technique & Sécurité",
      questions: [
        {
          q: "Mes données sont-elles protégées ?",
          a: "Oui, chiffrement SSL, conformité RGPD, et serveurs sécurisés. Vos informations bancaires ne sont jamais stockées."
        },
        {
          q: "Pourquoi mon paiement est bloqué ?",
          a: "Vérifiez votre solde Mobile Money, puis réessayez. Si le problème persiste, contactez le support via WhatsApp."
        },
        {
          q: "Comment signaler un problème technique ?",
          a: "Utilisez le bouton 'Support' en bas de page ou contactez-nous via WhatsApp : +237 670 93 43 78"
        }
      ]
    }
  ];

  const filteredFAQs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      item =>
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F7F3] via-white to-[#FFF0E8] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF6B35] rounded-full mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-['Poppins'] font-bold text-[#2C2C2C] mb-4">
            Questions Fréquentes
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Trouvez rapidement des réponses à vos questions. Besoin d'aide supplémentaire ? Contactez notre support.
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-8 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <Input
              placeholder="Recherchez votre question... (ex: remboursement, abonnement, paiement)"
              className="pl-10 h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>

        {/* FAQ Accordion */}
        {filteredFAQs.length > 0 ? (
          <div className="space-y-6">
            {filteredFAQs.map((category, idx) => (
              <Card key={idx} className="p-6 shadow-md">
                <h2 className="text-xl font-bold text-[#2C2C2C] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35]"></span>
                  {category.category}
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, qIdx) => (
                    <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                      <AccordionTrigger className="text-left hover:text-[#FF6B35]">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-stone-600">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500">Aucune question ne correspond à votre recherche.</p>
          </Card>
        )}

        {/* CTA */}
        <Card className="mt-12 p-8 bg-gradient-to-br from-[#FF6B35] to-[#e05a2b] text-white text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Vous ne trouvez pas votre réponse ?</h3>
          <p className="mb-6 opacity-90">Notre équipe support est disponible 24/7 sur WhatsApp</p>
          <Link to={createPageUrl('Support')}>
            <Button className="bg-white text-[#FF6B35] hover:bg-stone-100 font-semibold px-8">
              Contacter le Support
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}