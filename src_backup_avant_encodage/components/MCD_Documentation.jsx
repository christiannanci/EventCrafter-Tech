import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function MCDDocumentation() {
  const entities = {
    utilisateurs: [
      {
        name: "User (Built-in)",
        icon: "👤",
        attributes: ["id", "email", "full_name", "role", "created_date"],
        relations: ["→ ClientProfile (0..1)", "→ VendorProfile (0..1)"]
      },
      {
        name: "ClientProfile",
        icon: "👨‍💼",
        attributes: ["user_id", "first_name", "last_name", "pseudo", "phone", "city", "neighborhood_code", "account_balance", "verification_status"],
        relations: ["→ ClientBankAccount (N)", "→ Event (N)", "→ Booking (N)"]
      },
      {
        name: "VendorProfile",
        icon: "🏢",
        attributes: ["user_id", "business_name", "plan", "subscription_status", "city", "verification_status", "account_balance"],
        relations: ["→ Service (N)", "→ VendorBankAccount (N)", "→ Membership (N)"]
      }
    ],
    services: [
      {
        name: "Service",
        icon: "🎪",
        attributes: ["title", "description", "service_type_code", "price_min", "planner_id", "neighborhood_code", "rating", "review_count"],
        relations: ["→ Booking (N)", "→ Review (N)", "← ServiceType"]
      },
      {
        name: "ServiceType",
        icon: "📋",
        attributes: ["code", "name", "description", "icon"],
        relations: ["→ Service (N)", "→ Fonction (N)"]
      },
      {
        name: "Fonction",
        icon: "🔧",
        attributes: ["code", "service_type_code", "name", "description"],
        relations: ["← ServiceType"]
      }
    ],
    evenements: [
      {
        name: "Event",
        icon: "🎉",
        attributes: ["client_id", "title", "event_type", "start_date", "end_date", "budget_total", "status"],
        relations: ["→ Booking (N)", "→ BudgetItem (N)", "→ Guest (N)"]
      },
      {
        name: "Booking",
        icon: "📝",
        attributes: ["event_id", "service_id", "planner_id", "status", "total_amount", "paid_amount", "payment_status"],
        relations: ["→ Contract (0..1)", "→ Invoice (N)", "→ Transaction (N)", "→ ServiceReception (0..1)", "→ Dispute (0..1)"]
      },
      {
        name: "Contract",
        icon: "📄",
        attributes: ["contract_number", "booking_id", "contract_amount", "status", "provider_signed_at", "client_signed_at"],
        relations: ["← Booking", "→ Invoice (N)"]
      }
    ],
    paiements: [
      {
        name: "Invoice",
        icon: "🧾",
        attributes: ["invoice_number", "booking_id", "type", "amount", "status", "issued_date", "due_date"],
        relations: ["← Booking", "→ Receipt (N)", "→ Transaction (N)"]
      },
      {
        name: "Transaction",
        icon: "💰",
        attributes: ["user_id", "amount", "type", "payment_method", "status", "reference_id"],
        relations: ["← Booking/Invoice"]
      },
      {
        name: "Receipt",
        icon: "🧾",
        attributes: ["receipt_number", "transaction_id", "invoice_id", "payer_id", "amount", "payment_date"],
        relations: ["← Invoice", "← Transaction"]
      },
      {
        name: "PaymentProof",
        icon: "💳",
        attributes: ["proof_code", "user_id", "amount", "proof_image_url", "status", "validated_by"],
        relations: ["→ Booking (opt)", "→ Invoice (opt)", "→ Membership (opt)"]
      },
      {
        name: "ProviderPayout",
        icon: "💸",
        attributes: ["payout_code", "provider_id", "booking_id", "amount", "status", "completed_date"],
        relations: ["← Booking"]
      },
      {
        name: "ClientRefund",
        icon: "💸",
        attributes: ["refund_code", "client_id", "booking_id", "amount", "reason", "status"],
        relations: ["← Booking"]
      }
    ],
    litiges: [
      {
        name: "Dispute",
        icon: "⚖️",
        attributes: ["dispute_code", "booking_id", "nature", "initiator", "is_resolved", "payment_authorized", "refund_authorized"],
        relations: ["← Booking", "← ServiceReception"]
      },
      {
        name: "ServiceReception",
        icon: "✅",
        attributes: ["reception_code", "booking_id", "client_satisfaction", "authorized_payment", "dispute_opened"],
        relations: ["← Booking", "→ Dispute (opt)"]
      },
      {
        name: "Review / VendorReview / ClientReview",
        icon: "⭐",
        attributes: ["rating", "comment", "service_id/vendor_id/client_id"],
        relations: ["← Service/Vendor/Client"]
      }
    ],
    abonnements: [
      {
        name: "Membership",
        icon: "💎",
        attributes: ["user_id", "membership_type_code", "start_date", "end_date", "status", "auto_renew"],
        relations: ["← VendorProfile", "← MembershipType", "→ Invoice"]
      },
      {
        name: "MembershipType",
        icon: "💎",
        attributes: ["code", "name", "price", "duration_days", "features"],
        relations: ["→ Membership (N)"]
      }
    ],
    communication: [
      {
        name: "Conversation",
        icon: "💬",
        attributes: ["participants", "last_message", "last_message_at", "service_id"],
        relations: ["→ Message (N)"]
      },
      {
        name: "Message",
        icon: "💬",
        attributes: ["conversation_id", "sender_id", "content", "read_status"],
        relations: ["← Conversation"]
      },
      {
        name: "Notification",
        icon: "🔔",
        attributes: ["user_id", "title", "message", "type", "link", "is_read"],
        relations: ["← User"]
      }
    ],
    geographie: [
      {
        name: "Continent → Country → Region → Departement → Arrondissement → Ville → Quartier",
        icon: "🌍",
        attributes: ["code", "name", "parent_code"],
        relations: ["Hiérarchie géographique complète"]
      }
    ]
  };

  const lifecycle = [
    { step: 1, status: "pending", label: "Demande initiale", color: "bg-stone-100" },
    { step: 2, status: "negotiating", label: "Négociations", color: "bg-blue-100" },
    { step: 3, status: "offer_submitted", label: "Offre soumise", color: "bg-purple-100" },
    { step: 4, status: "contract_pending", label: "Signature contrat", color: "bg-amber-100" },
    { step: 5, status: "awaiting_payment", label: "Attente paiement", color: "bg-orange-100" },
    { step: 6, status: "confirmed", label: "Confirmé", color: "bg-emerald-100" },
    { step: 7, status: "in_progress", label: "En cours", color: "bg-indigo-100" },
    { step: 8, status: "delivered", label: "Livré", color: "bg-teal-100" },
    { step: 9, status: "warranty_period", label: "Garantie", color: "bg-cyan-100" },
    { step: 10, status: "completed", label: "Terminé", color: "bg-green-100" },
  ];

  const escrowFlow = [
    "1️⃣ Client paie → Transaction (escrow_held)",
    "2️⃣ Service livré → Client valide réception",
    "3️⃣ Si satisfait → Transaction (released) → ProviderPayout",
    "4️⃣ Si insatisfait → Dispute → Négociation",
    "5️⃣ Résolution → Payment ou Refund"
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">Modèle Conceptuel de Données</h1>
        <p className="text-stone-600">EventCrafter - Architecture de la base de données</p>
      </div>

      <Tabs defaultValue="utilisateurs" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="utilisateurs">👤 Utilisateurs</TabsTrigger>
          <TabsTrigger value="services">🎪 Services</TabsTrigger>
          <TabsTrigger value="evenements">🎉 Événements</TabsTrigger>
          <TabsTrigger value="paiements">💰 Paiements</TabsTrigger>
          <TabsTrigger value="litiges">⚖️ Litiges</TabsTrigger>
          <TabsTrigger value="abonnements">💎 Abonnements</TabsTrigger>
          <TabsTrigger value="communication">💬 Communication</TabsTrigger>
          <TabsTrigger value="geographie">🌍 Géographie</TabsTrigger>
          <TabsTrigger value="flux">🔄 Flux</TabsTrigger>
        </TabsList>

        {Object.entries(entities).map(([key, entitiesList]) => (
          <TabsContent key={key} value={key} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entitiesList.map((entity, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{entity.icon}</span>
                      {entity.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 mb-1">Attributs principaux:</p>
                      <div className="flex flex-wrap gap-1">
                        {entity.attributes.slice(0, 6).map((attr, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {attr}
                          </Badge>
                        ))}
                        {entity.attributes.length > 6 && (
                          <Badge variant="outline" className="text-xs bg-stone-100">
                            +{entity.attributes.length - 6} autres
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-500 mb-1">Relations:</p>
                      <ul className="text-xs text-stone-600 space-y-0.5">
                        {entity.relations.map((rel, i) => (
                          <li key={i}>• {rel}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="flux" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔄 Cycle de Vie d'une Réservation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {lifecycle.map((item) => (
                      <div key={item.step} className={`p-3 rounded-lg border ${item.color}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-stone-300 flex items-center justify-center font-bold text-sm">
                            {item.step}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900">{item.label}</p>
                            <code className="text-xs text-stone-600">{item.status}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 rounded-lg border bg-red-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-red-300 flex items-center justify-center font-bold text-sm">
                          ⚠️
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">Annulé / En litige</p>
                          <code className="text-xs text-stone-600">cancelled / disputed</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💰 Flux de Paiement (Escrow)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Principe Escrow</h4>
                    <p className="text-sm text-blue-800">
                      Les fonds du client sont bloqués en sécurité jusqu'à la validation de la réception du service. Protection garantie pour les deux parties.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {escrowFlow.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg border">
                        <div className="text-2xl">{step.split(' ')[0]}</div>
                        <p className="text-sm text-stone-700 flex-1">
                          {step.substring(step.indexOf(' ') + 1)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                    <h4 className="font-semibold text-green-900 mb-2">Types d'Invoices</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• <strong>global:</strong> Paiement complet</li>
                      <li>• <strong>partial_deposit:</strong> Acompte</li>
                      <li>• <strong>partial_balance:</strong> Solde</li>
                      <li>• <strong>subscription:</strong> Abonnement</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>📊 Relations Principales</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-stone-50 p-4 rounded-lg overflow-x-auto">
{`User
├── ClientProfile
│   ├── ClientBankAccount (N)
│   ├── Event (N)
│   │   ├── Booking (N)
│   │   ├── BudgetItem (N)
│   │   └── Guest (N)
│   └── ClientReview (N)
│
└── VendorProfile
    ├── Service (N)
    │   ├── Booking (N)
    │   │   ├── Contract (0..1)
    │   │   │   └── Invoice (N)
    │   │   │       └── Receipt (N)
    │   │   ├── ServiceReception (0..1)
    │   │   ├── Dispute (0..1)
    │   │   └── Transaction (N)
    │   └── Review (N)
    ├── VendorBankAccount (N)
    ├── Membership (N)
    └── VendorReview (N)

Conversation
└── Message (N)

Quartier ← neighborhood_code (utilisé par Services, Profils, Events, Contracts)
ServiceType → Fonction (N)`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}