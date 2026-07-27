import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-stone-900">
                  Politique de Confidentialité
                </CardTitle>
                <p className="text-sm text-stone-500 mt-1">
                  Dernière mise à jour : 17 février 2026
                </p>
              </div>
            </div>
            <p className="text-stone-600">
              EventCrafter s'engage à protéger votre vie privée et vos données personnelles. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-6 text-stone-700">
                
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">1. Données Collectées</h2>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">1.1 Informations d'Inscription</h3>
                  <p className="mb-2">Lorsque vous créez un compte, nous collectons :</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Nom complet</strong> et <strong>adresse email</strong></li>
                    <li><strong>Numéro de téléphone</strong> (pour vérification et contact)</li>
                    <li><strong>Mot de passe</strong> (crypté)</li>
                    <li><strong>Rôle</strong> : Client ou Prestataire</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">1.2 Informations de Profil Prestataire</h3>
                  <p className="mb-2">Pour les Vendeurs, nous collectons également :</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Nom de l'entreprise et description</li>
                    <li>Catégorie de service et zone géographique</li>
                    <li>Documents de vérification (CNI, registre de commerce)</li>
                    <li>Portfolio (photos de services précédents)</li>
                    <li>Informations bancaires (pour les paiements)</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">1.3 Données de Transaction</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Historique des réservations et paiements</li>
                    <li>Montants des transactions</li>
                    <li>Méthodes de paiement utilisées (Mobile Money, carte)</li>
                    <li>Preuves de paiement téléchargées (captures d'écran)</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">1.4 Données d'Utilisation</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Pages visitées et interactions sur la plateforme</li>
                    <li>Recherches effectuées</li>
                    <li>Adresse IP et type d'appareil</li>
                    <li>Historique de navigation (cookies)</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">2. Utilisation des Données</h2>
                  </div>
                  
                  <p className="mb-3">Nous utilisons vos données pour :</p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                    <h4 className="font-semibold text-blue-900 mb-2">✅ Fournir nos Services</h4>
                    <ul className="list-disc ml-6 space-y-1 text-blue-800">
                      <li>Créer et gérer votre compte utilisateur</li>
                      <li>Traiter les réservations et paiements</li>
                      <li>Faciliter la communication entre Clients et Prestataires</li>
                      <li>Gérer le système d'escrow (séquestre de paiements)</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                    <h4 className="font-semibold text-green-900 mb-2">🔒 Sécurité et Vérification</h4>
                    <ul className="list-disc ml-6 space-y-1 text-green-800">
                      <li>Vérifier l'identité des Prestataires</li>
                      <li>Prévenir les fraudes et abus</li>
                      <li>Résoudre les litiges entre utilisateurs</li>
                      <li>Assurer la conformité légale</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
                    <h4 className="font-semibold text-purple-900 mb-2">📊 Amélioration de la Plateforme</h4>
                    <ul className="list-disc ml-6 space-y-1 text-purple-800">
                      <li>Analyser l'utilisation pour améliorer l'expérience utilisateur</li>
                      <li>Personnaliser les recommandations de services</li>
                      <li>Optimiser le système de classement (ranking)</li>
                      <li>Développer de nouvelles fonctionnalités</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">📧 Communication</h4>
                    <ul className="list-disc ml-6 space-y-1 text-amber-800">
                      <li>Envoyer des notifications sur vos réservations</li>
                      <li>Informer des mises à jour de la plateforme</li>
                      <li>Répondre à vos demandes de support</li>
                      <li>Envoyer des offres promotionnelles (avec votre consentement)</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">3. Partage des Données</h2>
                  </div>
                  
                  <p className="mb-3">
                    <strong>Nous ne vendons jamais vos données personnelles.</strong> Vos informations peuvent être partagées uniquement dans les cas suivants :
                  </p>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">3.1 Entre Clients et Prestataires</h3>
                  <p className="mb-2">
                    Lorsqu'un Prestataire débloque un lead ou qu'un Client réserve un service, les coordonnées nécessaires sont partagées pour faciliter le contact :
                  </p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Nom, téléphone, email</li>
                    <li>Détails de l'événement</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">3.2 Partenaires de Paiement</h3>
                  <p>
                    Les informations de paiement sont transmises de manière sécurisée à nos prestataires de services de paiement (MTN Mobile Money, Orange Money, Stripe) pour traiter les transactions.
                  </p>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">3.3 Obligations Légales</h3>
                  <p>
                    Nous pouvons divulguer vos données si requis par la loi, une autorité judiciaire ou en cas d'enquête pour fraude.
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">4. Sécurité des Données</h2>
                  </div>
                  
                  <p className="mb-3">Nous mettons en œuvre des mesures de sécurité pour protéger vos informations :</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                      <p className="font-semibold text-stone-800 mb-1">🔐 Chiffrement</p>
                      <p className="text-sm text-stone-600">Toutes les communications sont chiffrées via HTTPS/SSL</p>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                      <p className="font-semibold text-stone-800 mb-1">🛡️ Pare-feu</p>
                      <p className="text-sm text-stone-600">Protection contre les accès non autorisés</p>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                      <p className="font-semibold text-stone-800 mb-1">🔑 Authentification</p>
                      <p className="text-sm text-stone-600">Mots de passe cryptés avec hachage sécurisé</p>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                      <p className="font-semibold text-stone-800 mb-1">💾 Sauvegarde</p>
                      <p className="text-sm text-stone-600">Backups réguliers des données</p>
                    </div>
                  </div>

                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>⚠️ Note :</strong> Aucun système n'est totalement sécurisé. Nous vous recommandons d'utiliser un mot de passe fort et de ne jamais partager vos identifiants.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">5. Cookies et Traçage</h2>
                  
                  <p className="mb-3">
                    Nous utilisons des cookies pour améliorer votre expérience sur EventCrafter. Les cookies sont de petits fichiers stockés sur votre appareil.
                  </p>

                  <h3 className="text-lg font-semibold text-stone-800 mt-4 mb-2">Types de Cookies Utilisés :</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>
                      <strong>Cookies essentiels</strong> : Nécessaires au fonctionnement de la plateforme (authentification, panier)
                    </li>
                    <li>
                      <strong>Cookies analytiques</strong> : Pour comprendre comment les utilisateurs naviguent (Google Analytics)
                    </li>
                    <li>
                      <strong>Cookies de personnalisation</strong> : Pour mémoriser vos préférences (langue, devise)
                    </li>
                  </ul>

                  <p className="mt-3 text-sm">
                    Vous pouvez désactiver les cookies dans les paramètres de votre navigateur, mais certaines fonctionnalités peuvent ne plus être disponibles.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">6. Vos Droits</h2>
                  
                  <p className="mb-3">Conformément aux lois sur la protection des données, vous avez les droits suivants :</p>

                  <div className="space-y-3">
                    <div className="border-l-4 border-rose-500 pl-4">
                      <p className="font-semibold text-stone-800">✅ Droit d'accès</p>
                      <p className="text-sm text-stone-600">Demander une copie de vos données personnelles</p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4">
                      <p className="font-semibold text-stone-800">✏️ Droit de rectification</p>
                      <p className="text-sm text-stone-600">Corriger les informations inexactes</p>
                    </div>
                    <div className="border-l-4 border-amber-500 pl-4">
                      <p className="font-semibold text-stone-800">🗑️ Droit à l'effacement</p>
                      <p className="text-sm text-stone-600">Demander la suppression de vos données (sauf obligations légales)</p>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-4">
                      <p className="font-semibold text-stone-800">🚫 Droit d'opposition</p>
                      <p className="text-sm text-stone-600">Refuser le traitement de vos données à des fins marketing</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4">
                      <p className="font-semibold text-stone-800">📦 Droit à la portabilité</p>
                      <p className="text-sm text-stone-600">Récupérer vos données dans un format structuré</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm">
                    Pour exercer ces droits, contactez-nous à <a href="mailto:privacy@eventcrafter.com" className="text-rose-600 hover:underline">privacy@eventcrafter.com</a>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">7. Durée de Conservation</h2>
                  
                  <p className="mb-3">Nous conservons vos données pendant les durées suivantes :</p>
                  
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Comptes actifs</strong> : Tant que le compte existe</li>
                    <li><strong>Comptes fermés</strong> : 1 an après suppression (pour obligations légales)</li>
                    <li><strong>Données de transaction</strong> : 10 ans (conformité fiscale)</li>
                    <li><strong>Logs de connexion</strong> : 6 mois (sécurité)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">8. Transferts Internationaux</h2>
                  
                  <p className="mb-2">
                    Vos données sont stockées sur des serveurs sécurisés. Certains de nos prestataires de services (hébergement, paiement) peuvent être situés en dehors du Cameroun.
                  </p>
                  <p>
                    Dans ce cas, nous veillons à ce que des garanties appropriées soient mises en place pour protéger vos données conformément aux standards internationaux.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-stone-900 mb-3">9. Modifications de la Politique</h2>
                  
                  <p>
                    Nous pouvons mettre à jour cette politique de confidentialité de temps en temps. Toute modification sera publiée sur cette page avec une nouvelle date de mise à jour. Les changements majeurs vous seront notifiés par email.
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-bold text-stone-900">10. Contact</h2>
                  </div>
                  
                  <p className="mb-3">
                    Pour toute question concernant cette politique de confidentialité ou l'utilisation de vos données :
                  </p>
                  
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-stone-400" />
                        <span><strong>Email :</strong> privacy@eventcrafter.com</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-xl">📞</span>
                        <span><strong>Téléphone :</strong> +237 670 93 43 78 / +237 690 17 31 93</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-xl">📍</span>
                        <span><strong>Adresse :</strong> Douala, Cameroun</span>
                      </li>
                    </ul>
                  </div>
                </section>

                <div className="mt-8 pt-6 border-t border-stone-200 bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-900 text-center font-medium">
                    🔒 Chez EventCrafter, la protection de votre vie privée est notre priorité. Nous nous engageons à traiter vos données de manière responsable et transparente.
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