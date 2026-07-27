import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-stone-900">
              Conditions Générales d'Utilisation (CGU)
            </CardTitle>
            <p className="text-sm text-stone-500 mt-2">
              Dernière mise à jour : 17 février 2026
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-6 text-stone-700">
                
                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">1. Objet</h2>
                  <p className="mb-2">
                    Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'utilisation de la plateforme EventCrafter (ci-après « la Plateforme »), accessible à l'adresse [URL du site].
                  </p>
                  <p>
                    La Plateforme met en relation des prestataires de services événementiels (ci-après « Vendeurs » ou « Prestataires ») avec des clients souhaitant organiser des événements (ci-après « Clients » ou « Utilisateurs »).
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">2. Acceptation des CGU</h2>
                  <p className="mb-2">
                    L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. En vous inscrivant ou en naviguant sur EventCrafter, vous acceptez d'être lié par ces conditions.
                  </p>
                  <p>
                    Si vous n'acceptez pas ces CGU, veuillez ne pas utiliser la Plateforme.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">3. Inscription et Comptes Utilisateurs</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">3.1 Création de Compte</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Vous devez créer un compte pour accéder aux fonctionnalités de la Plateforme</li>
                    <li>Les informations fournies doivent être exactes et à jour</li>
                    <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
                    <li>Vous devez avoir au moins 18 ans pour créer un compte</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">3.2 Vérification des Prestataires</h3>
                  <p className="mb-2">
                    Les Vendeurs doivent passer par un processus de vérification obligatoire avant de pouvoir proposer leurs services. Ce processus inclut :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Vérification de l'identité et des documents d'entreprise</li>
                    <li>Validation des qualifications professionnelles</li>
                    <li>Approbation par l'équipe administrative d'EventCrafter</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">4. Services Proposés</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">4.1 Pour les Clients</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Recherche et découverte de prestataires événementiels</li>
                    <li>Demande de devis et réservation de services</li>
                    <li>Gestion de budget et d'invités</li>
                    <li>Publication de demandes de services (Leads)</li>
                    <li>Système de messagerie sécurisé</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">4.2 Pour les Prestataires</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Création et gestion de profil professionnel</li>
                    <li>Publication de services</li>
                    <li>Accès aux demandes de clients (système de leads payants)</li>
                    <li>Gestion des réservations et contrats</li>
                    <li>Réception de paiements sécurisés via système d'escrow</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">5. Système de Paiement et Escrow</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">5.1 Paiements Clients</h3>
                  <p className="mb-2">
                    Les paiements s'effectuent selon le cycle suivant :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Acompte (30-50%)</strong> : Versé à la réservation, bloqué en escrow</li>
                    <li><strong>Solde (50-70%)</strong> : Versé avant ou à la livraison du service</li>
                    <li><strong>Libération</strong> : Les fonds sont libérés au prestataire après confirmation de réception par le client</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">5.2 Système d'Escrow</h3>
                  <p className="mb-2">
                    EventCrafter utilise un système d'escrow (séquestre) pour sécuriser les transactions :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Les paiements sont conservés en séquestre jusqu'à la livraison du service</li>
                    <li>En cas de litige, les fonds restent bloqués jusqu'à résolution</li>
                    <li>Aucun remboursement sans validation administrative</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">5.3 Commissions de la Plateforme</h3>
                  <p>
                    EventCrafter prélève une commission sur chaque transaction réalisée via la Plateforme. Les taux de commission varient selon le type de prestation et le plan d'abonnement du Vendeur.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">6. Système de Leads et Abonnements Vendeurs</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">6.1 Plans d'Abonnement</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Free</strong> : Accès limité à 10 leads gratuits par mois</li>
                    <li><strong>Premium</strong> : Accès illimité aux leads + fonctionnalités avancées</li>
                    <li><strong>Gold</strong> : Tous les avantages Premium + priorité dans les résultats</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">6.2 Déblocage de Leads</h3>
                  <p className="mb-2">
                    Les Vendeurs paient pour débloquer les coordonnées des clients intéressés. Le prix varie selon :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>La taille du budget événement (small: 2000 FCFA, medium: 4000 FCFA, large: 8000-10000 FCFA)</li>
                    <li>Les crédits gratuits peuvent être utilisés pour débloquer sans payer</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">6.3 Politique de Remboursement des Leads</h3>
                  <p className="mb-2">
                    Un Vendeur peut demander un remboursement dans les cas suivants :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Coordonnées incorrectes ou non fonctionnelles</li>
                    <li>Client injoignable après 3 tentatives de contact documentées</li>
                    <li>Demande de service non conforme à la catégorie du prestataire</li>
                  </ul>
                  <p className="mt-2">
                    Les demandes de remboursement sont examinées par l'équipe administrative sous 48h.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">7. Litiges et Résolution</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">7.1 Ouverture d'un Litige</h3>
                  <p className="mb-2">
                    Un litige peut être ouvert par le Client ou le Prestataire en cas de :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Non-respect du contrat</li>
                    <li>Qualité de service insatisfaisante</li>
                    <li>Non-paiement ou retard de paiement</li>
                    <li>Annulation abusive</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">7.2 Processus de Résolution</h3>
                  <p className="mb-2">
                    EventCrafter agit comme médiateur neutre :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Phase de négociation entre les parties (7 jours)</li>
                    <li>Intervention de l'équipe administrative si aucun accord</li>
                    <li>Décision finale basée sur les preuves fournies</li>
                    <li>Libération des fonds ou remboursement selon la décision</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">7.3 Sanctions</h3>
                  <p>
                    Un Prestataire qui perd 3 litiges voit son compte <strong>suspendu automatiquement</strong>. Une révision peut être demandée mais reste à la discrétion d'EventCrafter.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">8. Responsabilités et Limitations</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">8.1 Rôle d'EventCrafter</h3>
                  <p className="mb-2">
                    EventCrafter est un <strong>intermédiaire technique</strong> :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Nous ne sommes pas responsables de la qualité des services fournis par les Prestataires</li>
                    <li>Nous ne garantissons pas la disponibilité ou la fiabilité des Vendeurs</li>
                    <li>Les contrats sont conclus directement entre Clients et Prestataires</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">8.2 Responsabilité des Utilisateurs</h3>
                  <p>
                    Chaque utilisateur est responsable de :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>L'exactitude des informations publiées</li>
                    <li>Le respect des engagements pris</li>
                    <li>La communication professionnelle et respectueuse</li>
                    <li>La conformité avec les lois locales</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">9. Propriété Intellectuelle</h2>
                  <p className="mb-2">
                    Tous les contenus de la Plateforme (logos, textes, graphiques, codes) sont protégés par les droits de propriété intellectuelle et appartiennent à EventCrafter ou à ses partenaires.
                  </p>
                  <p>
                    Les Vendeurs conservent les droits sur leurs photos et descriptions de services, mais accordent à EventCrafter une licence d'utilisation à des fins promotionnelles.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">10. Protection des Données</h2>
                  <p>
                    EventCrafter s'engage à protéger vos données personnelles conformément à notre <a href="/PrivacyPolicy" className="text-rose-600 hover:underline">Politique de Confidentialité</a>.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">11. Résiliation</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">11.1 Par l'Utilisateur</h3>
                  <p>
                    Vous pouvez supprimer votre compte à tout moment via les paramètres de votre profil.
                  </p>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">11.2 Par EventCrafter</h3>
                  <p className="mb-2">
                    Nous nous réservons le droit de suspendre ou supprimer un compte en cas de :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Violation des CGU</li>
                    <li>Activité frauduleuse ou illégale</li>
                    <li>Comportement abusif ou nuisible</li>
                    <li>Non-paiement des abonnements</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">12. Modifications des CGU</h2>
                  <p>
                    EventCrafter se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entreront en vigueur dès leur publication sur la Plateforme. Les utilisateurs seront informés par email des changements majeurs.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">13. Droit Applicable et Juridiction</h2>
                  <p className="mb-2">
                    Les présentes CGU sont régies par le droit camerounais.
                  </p>
                  <p>
                    Tout litige relatif à l'interprétation ou à l'exécution des présentes sera soumis aux tribunaux compétents de Douala, Cameroun, sauf disposition légale contraire.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">14. Contact</h2>
                  <p className="mb-2">
                    Pour toute question concernant ces CGU, contactez-nous :
                  </p>
                  <ul className="list-none space-y-1">
                    <li><strong>Email :</strong> support@eventcrafter.com</li>
                    <li><strong>Téléphone :</strong> +237 670 93 43 78 / +237 690 17 31 93</li>
                    <li><strong>Adresse :</strong> Douala, Cameroun</li>
                  </ul>
                </section>

                <div className="mt-8 pt-6 border-t border-stone-200">
                  <p className="text-sm text-stone-500 text-center">
                    En utilisant EventCrafter, vous confirmez avoir lu, compris et accepté les présentes Conditions Générales d'Utilisation.
                  </p>
                </div>

              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}