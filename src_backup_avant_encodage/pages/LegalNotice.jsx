import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Users, Scale, Globe } from "lucide-react";

export default function LegalNotice() {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Scale className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-stone-900">
                  Mentions Légales
                </CardTitle>
                <p className="text-sm text-stone-500 mt-1">
                  Informations légales obligatoires
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-6 text-stone-700">
                
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">1. Éditeur de la Plateforme</h2>
                  </div>
                  
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                    <p className="mb-2"><strong>Nom de la société :</strong> EventCrafter SARL</p>
                    <p className="mb-2"><strong>Forme juridique :</strong> Société à Responsabilité Limitée (SARL)</p>
                    <p className="mb-2"><strong>Capital social :</strong> 1 000 000 FCFA</p>
                    <p className="mb-2"><strong>Siège social :</strong> Douala, Cameroun</p>
                    <p className="mb-2"><strong>Registre du Commerce :</strong> [À COMPLÉTER]</p>
                    <p className="mb-2"><strong>Numéro d'identification fiscale :</strong> [À COMPLÉTER]</p>
                    <p className="mb-2"><strong>Email :</strong> contact@eventcrafter.com</p>
                    <p><strong>Téléphone :</strong> +237 670 93 43 78 / +237 690 17 31 93</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">2. Directeur de la Publication</h2>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="mb-2"><strong>Nom :</strong> [Nom du Directeur]</p>
                    <p className="mb-2"><strong>Fonction :</strong> Gérant</p>
                    <p><strong>Email :</strong> direction@eventcrafter.com</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">3. Hébergement du Site</h2>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="mb-2"><strong>Hébergeur :</strong> Base44 / Supabase</p>
                    <p className="mb-2"><strong>Adresse :</strong> Serveurs Cloud (localisation variable)</p>
                    <p className="mb-2"><strong>Infrastructure :</strong> AWS / Google Cloud Platform</p>
                    <p className="text-sm text-green-700 mt-2">
                      Les données sont hébergées sur des serveurs sécurisés conformes aux standards internationaux de sécurité et de protection des données.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">4. Propriété Intellectuelle</h2>
                  
                  <p className="mb-3">
                    L'ensemble du contenu présent sur le site EventCrafter (textes, graphismes, logos, icônes, images, vidéos, sons, logiciels, etc.) est la propriété exclusive d'EventCrafter ou de ses partenaires.
                  </p>

                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                    <h3 className="font-semibold text-amber-900 mb-2">⚠️ Protection par le Droit d'Auteur</h3>
                    <p className="text-amber-800 mb-2">
                      Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, du site ou de son contenu, par quelque procédé que ce soit, est interdite sans autorisation écrite préalable d'EventCrafter.
                    </p>
                    <p className="text-sm text-amber-700">
                      Toute exploitation non autorisée du site ou de son contenu constitue une contrefaçon passible de sanctions civiles et pénales.
                    </p>
                  </div>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">Marques Déposées</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Le nom « EventCrafter » est une marque protégée</li>
                    <li>Le logo et l'identité visuelle sont déposés</li>
                    <li>Toute utilisation commerciale non autorisée est interdite</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">Contenus Utilisateurs</h3>
                  <p>
                    Les Prestataires conservent la propriété intellectuelle de leurs photos, descriptions et portfolios publiés sur la plateforme. Toutefois, en publiant du contenu, ils accordent à EventCrafter une licence mondiale, non exclusive, gratuite et transférable pour utiliser, reproduire, modifier et afficher ce contenu à des fins de promotion de la plateforme.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">5. Données Personnelles et Confidentialité</h2>
                  
                  <p className="mb-3">
                    EventCrafter accorde une grande importance à la protection des données personnelles de ses utilisateurs.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                      <h4 className="font-semibold text-stone-800 mb-2">🔒 Responsable du Traitement</h4>
                      <p className="text-sm text-stone-600">EventCrafter SARL</p>
                      <p className="text-sm text-stone-600">Email : privacy@eventcrafter.com</p>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                      <h4 className="font-semibold text-stone-800 mb-2">📋 Finalités du Traitement</h4>
                      <p className="text-sm text-stone-600">Gestion des comptes, transactions, communications et amélioration des services</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm">
                    Pour plus d'informations, consultez notre <a href="/PrivacyPolicy" className="text-rose-600 hover:underline font-medium">Politique de Confidentialité</a>.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">6. Cookies</h2>
                  
                  <p className="mb-3">
                    Le site EventCrafter utilise des cookies pour améliorer l'expérience utilisateur, réaliser des statistiques de visites et personnaliser le contenu.
                  </p>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">Types de Cookies Utilisés :</h4>
                    <ul className="list-disc ml-6 space-y-1 text-purple-800">
                      <li><strong>Cookies techniques</strong> : Essentiels au fonctionnement du site</li>
                      <li><strong>Cookies analytiques</strong> : Mesure d'audience (Google Analytics)</li>
                      <li><strong>Cookies de personnalisation</strong> : Préférences utilisateur</li>
                    </ul>
                  </div>

                  <p className="mt-3 text-sm">
                    Vous pouvez refuser l'installation de cookies en configurant votre navigateur. Cependant, certaines fonctionnalités du site pourraient ne plus être accessibles.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">7. Limitation de Responsabilité</h2>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">7.1 Disponibilité du Site</h3>
                  <p className="mb-3">
                    EventCrafter s'efforce d'assurer l'accès au site 24h/24 et 7j/7, mais ne peut garantir une disponibilité ininterrompue. Le site peut être temporairement indisponible en cas de maintenance, de panne technique ou de force majeure.
                  </p>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">7.2 Contenu Publié par les Utilisateurs</h3>
                  <p className="mb-3">
                    EventCrafter ne peut être tenu responsable du contenu publié par les Prestataires (descriptions, photos, tarifs). Chaque Prestataire est seul responsable des informations qu'il publie.
                  </p>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">7.3 Qualité des Services</h3>
                  <p className="mb-3">
                    EventCrafter agit uniquement comme intermédiaire entre Clients et Prestataires. Nous ne sommes pas responsables de :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>La qualité des services fournis par les Prestataires</li>
                    <li>Les litiges nés de l'exécution d'un contrat entre Client et Prestataire</li>
                    <li>Les dommages directs ou indirects résultant de l'utilisation du site</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">7.4 Liens Externes</h3>
                  <p>
                    Le site peut contenir des liens vers des sites externes. EventCrafter n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">8. Droit Applicable et Juridiction</h2>
                  
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                    <p className="mb-2">
                      <strong>Droit applicable :</strong> Le présent site et les relations entre EventCrafter et ses utilisateurs sont régis par le droit camerounais.
                    </p>
                    <p className="mb-2">
                      <strong>Juridiction compétente :</strong> En cas de litige, et à défaut de résolution amiable, les tribunaux de Douala (Cameroun) seront seuls compétents.
                    </p>
                    <p className="text-sm text-stone-600 mt-3">
                      Conformément aux articles 5 et 6 du Code de Procédure Civile et Commerciale du Cameroun, toute action en justice doit être précédée d'une tentative de résolution amiable.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">9. Signalement de Contenu Illicite</h2>
                  
                  <p className="mb-3">
                    Si vous constatez un contenu illicite, offensant ou contraire aux CGU sur la plateforme, vous pouvez le signaler à :
                  </p>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="font-semibold text-red-900 mb-2">📧 Email de signalement :</p>
                    <p className="text-red-800">abuse@eventcrafter.com</p>
                    <p className="text-sm text-red-700 mt-2">
                      Indiquez l'URL du contenu signalé et la nature de l'infraction. Nous traiterons votre signalement sous 48 heures.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">10. Médiation</h2>
                  
                  <p className="mb-3">
                    Conformément à la législation camerounaise sur la protection des consommateurs, en cas de litige non résolu avec EventCrafter, vous pouvez recourir à une procédure de médiation conventionnelle ou à tout autre mode alternatif de règlement des différends.
                  </p>
                  
                  <p className="text-sm text-stone-600">
                    Coordonnées du médiateur : [À COMPLÉTER si applicable]
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">11. Contact</h2>
                  
                  <p className="mb-3">
                    Pour toute question d'ordre légal ou pour exercer vos droits, contactez-nous :
                  </p>
                  
                  <div className="bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      <li><strong>📧 Email général :</strong> contact@eventcrafter.com</li>
                      <li><strong>⚖️ Email juridique :</strong> legal@eventcrafter.com</li>
                      <li><strong>🔒 Email confidentialité :</strong> privacy@eventcrafter.com</li>
                      <li><strong>📞 Téléphone :</strong> +237 670 93 43 78 / +237 690 17 31 93</li>
                      <li><strong>📍 Adresse postale :</strong> Douala, Cameroun</li>
                    </ul>
                  </div>
                </section>

                <div className="mt-8 pt-6 border-t border-stone-200">
                  <p className="text-xs text-stone-500 text-center">
                    Dernière mise à jour : 17 février 2026
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