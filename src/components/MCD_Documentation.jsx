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
        icon: "ðŸ‘¤",
        attributes: ["id", "email", "full_name", "role", "created_date"],
        relations: ["â†’ ClientProfile (0..1)", "â†’ VendorProfile (0..1)"]
      },
      {
        name: "ClientProfile",
        icon: "ðŸ‘¨â€ðŸ’¼",
        attributes: ["user_id", "first_name", "last_name", "pseudo", "phone", "city", "neighborhood_code", "account_balance", "verification_status"],
        relations: ["â†’ ClientBankAccount (N)", "â†’ Event (N)", "â†’ Booking (N)"]
      },
      {
        name: "VendorProfile",
        icon: "ðŸ¢",
        attributes: ["user_id", "business_name", "plan", "subscription_status", "city", "verification_status", "account_balance"],
        relations: ["â†’ Service (N)", "â†’ VendorBankAccount (N)", "â†’ Membership (N)"]
      }
    ],
    services: [
      {
        name: "Service",
        icon: "ðŸŽª",
        attributes: ["title", "description", "service_type_code", "price_min", "planner_id", "neighborhood_code", "rating", "review_count"],
        relations: ["â†’ Booking (N)", "â†’ Review (N)", "â† ServiceType"]
      },
      {
        name: "ServiceType",
        icon: "ðŸ“‹",
        attributes: ["code", "name", "description", "icon"],
        relations: ["â†’ Service (N)", "â†’ Fonction (N)"]
      },
      {
        name: "Fonction",
        icon: "ðŸ”§",
        attributes: ["code", "service_type_code", "name", "description"],
        relations: ["â† ServiceType"]
      }
    ],
    evenements: [
      {
        name: "Event",
        icon: "ðŸŽ‰",
        attributes: ["client_id", "title", "event_type", "start_date", "end_date", "budget_total", "status"],
        relations: ["â†’ Booking (N)", "â†’ BudgetItem (N)", "â†’ Guest (N)"]
      },
      {
        name: "Booking",
        icon: "ðŸ“",
        attributes: ["event_id", "service_id", "planner_id", "status", "total_amount", "paid_amount", "payment_status"],
        relations: ["â†’ Contract (0..1)", "â†’ Invoice (N)", "â†’ Transaction (N)", "â†’ ServiceReception (0..1)", "â†’ Dispute (0..1)"]
      },
      {
        name: "Contract",
        icon: "ðŸ“„",
        attributes: ["contract_number", "booking_id", "contract_amount", "status", "provider_signed_at", "client_signed_at"],
        relations: ["â† Booking", "â†’ Invoice (N)"]
      }
    ],
    paiements: [
      {
        name: "Invoice",
        icon: "ðŸ§¾",
        attributes: ["invoice_number", "booking_id", "type", "amount", "status", "issued_date", "due_date"],
        relations: ["â† Booking", "â†’ Receipt (N)", "â†’ Transaction (N)"]
      },
      {
        name: "Transaction",
        icon: "ðŸ’°",
        attributes: ["user_id", "amount", "type", "payment_method", "status", "reference_id"],
        relations: ["â† Booking/Invoice"]
      },
      {
        name: "Receipt",
        icon: "ðŸ§¾",
        attributes: ["receipt_number", "transaction_id", "invoice_id", "payer_id", "amount", "payment_date"],
        relations: ["â† Invoice", "â† Transaction"]
      },
      {
        name: "PaymentProof",
        icon: "ðŸ’³",
        attributes: ["proof_code", "user_id", "amount", "proof_image_url", "status", "validated_by"],
        relations: ["â†’ Booking (opt)", "â†’ Invoice (opt)", "â†’ Membership (opt)"]
      },
      {
        name: "ProviderPayout",
        icon: "ðŸ’¸",
        attributes: ["payout_code", "provider_id", "booking_id", "amount", "status", "completed_date"],
        relations: ["â† Booking"]
      },
      {
        name: "ClientRefund",
        icon: "ðŸ’¸",
        attributes: ["refund_code", "client_id", "booking_id", "amount", "reason", "status"],
        relations: ["â† Booking"]
      }
    ],
    litiges: [
      {
        name: "Dispute",
        icon: "âš–ï¸",
        attributes: ["dispute_code", "booking_id", "nature", "initiator", "is_resolved", "payment_authorized", "refund_authorized"],
        relations: ["â† Booking", "â† ServiceReception"]
      },
      {
        name: "ServiceReception",
        icon: "âœ…",
        attributes: ["reception_code", "booking_id", "client_satisfaction", "authorized_payment", "dispute_opened"],
        relations: ["â† Booking", "â†’ Dispute (opt)"]
      },
      {
        name: "Review / VendorReview / ClientReview",
        icon: "â­",
        attributes: ["rating", "comment", "service_id/vendor_id/client_id"],
        relations: ["â† Service/Vendor/Client"]
      }
    ],
    abonnements: [
      {
        name: "Membership",
        icon: "ðŸ’Ž",
        attributes: ["user_id", "membership_type_code", "start_date", "end_date", "status", "auto_renew"],
        relations: ["â† VendorProfile", "â† MembershipType", "â†’ Invoice"]
      },
      {
        name: "MembershipType",
        icon: "ðŸ’Ž",
        attributes: ["code", "name", "price", "duration_days", "features"],
        relations: ["â†’ Membership (N)"]
      }
    ],
    communication: [
      {
        name: "Conversation",
        icon: "ðŸ’¬",
        attributes: ["participants", "last_message", "last_message_at", "service_id"],
        relations: ["â†’ Message (N)"]
      },
      {
        name: "Message",
        icon: "ðŸ’¬",
        attributes: ["conversation_id", "sender_id", "content", "read_status"],
        relations: ["â† Conversation"]
      },
      {
        name: "Notification",
        icon: "ðŸ””",
        attributes: ["user_id", "title", "message", "type", "link", "is_read"],
        relations: ["â† User"]
      }
    ],
    geographie: [
      {
        name: "Continent â†’ Country â†’ Region â†’ Departement â†’ Arrondissement â†’ Ville â†’ Quartier",
        icon: "ðŸŒ",
        attributes: ["code", "name", "parent_code"],
        relations: ["HiÃ©rarchie gÃ©ographique complÃ¨te"]
      }
    ]
  };

  const lifecycle = [
    { step: 1, status: "pending", label: "Demande initiale", color: "bg-stone-100" },
    { step: 2, status: "negotiating", label: "NÃ©gociations", color: "bg-blue-100" },
    { step: 3, status: "offer_submitted", label: "Offre soumise", color: "bg-purple-100" },
    { step: 4, status: "contract_pending", label: "Signature contrat", color: "bg-amber-100" },
    { step: 5, status: "awaiting_payment", label: "Attente paiement", color: "bg-orange-100" },
    { step: 6, status: "confirmed", label: "ConfirmÃ©", color: "bg-emerald-100" },
    { step: 7, status: "in_progress", label: "En cours", color: "bg-indigo-100" },
    { step: 8, status: "delivered", label: "LivrÃ©", color: "bg-teal-100" },
    { step: 9, status: "warranty_period", label: "Garantie", color: "bg-cyan-100" },
    { step: 10, status: "completed", label: "TerminÃ©", color: "bg-green-100" },
  ];

  const escrowFlow = [
    "1ï¸âƒ£ Client paie â†’ Transaction (escrow_held)",
    "2ï¸âƒ£ Service livrÃ© â†’ Client valide rÃ©ception",
    "3ï¸âƒ£ Si satisfait â†’ Transaction (released) â†’ ProviderPayout",
    "4ï¸âƒ£ Si insatisfait â†’ Dispute â†’ NÃ©gociation",
    "5ï¸âƒ£ RÃ©solution â†’ Payment ou Refund"
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">ModÃ¨le Conceptuel de DonnÃ©es</h1>
        <p className="text-stone-600">EventCrafter - Architecture de la base de donnÃ©es</p>
      </div>

      <Tabs defaultValue="utilisateurs" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="utilisateurs">ðŸ‘¤ Utilisateurs</TabsTrigger>
          <TabsTrigger value="services">ðŸŽª Services</TabsTrigger>
          <TabsTrigger value="evenements">ðŸŽ‰ Ã‰vÃ©nements</TabsTrigger>
          <TabsTrigger value="paiements">ðŸ’° Paiements</TabsTrigger>
          <TabsTrigger value="litiges">âš–ï¸ Litiges</TabsTrigger>
          <TabsTrigger value="abonnements">ðŸ’Ž Abonnements</TabsTrigger>
          <TabsTrigger value="communication">ðŸ’¬ Communication</TabsTrigger>
          <TabsTrigger value="geographie">ðŸŒ GÃ©ographie</TabsTrigger>
          <TabsTrigger value="flux">ðŸ”„ Flux</TabsTrigger>
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
                          <li key={i}>â€¢ {rel}</li>
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
                  ðŸ”„ Cycle de Vie d'une RÃ©servation
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
                          âš ï¸
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">AnnulÃ© / En litige</p>
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
                  ðŸ’° Flux de Paiement (Escrow)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Principe Escrow</h4>
                    <p className="text-sm text-blue-800">
                      Les fonds du client sont bloquÃ©s en sÃ©curitÃ© jusqu'Ã  la validation de la rÃ©ception du service. Protection garantie pour les deux parties.
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
                      <li>â€¢ <strong>global:</strong> Paiement complet</li>
                      <li>â€¢ <strong>partial_deposit:</strong> Acompte</li>
                      <li>â€¢ <strong>partial_balance:</strong> Solde</li>
                      <li>â€¢ <strong>subscription:</strong> Abonnement</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>ðŸ“Š Relations Principales</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-stone-50 p-4 rounded-lg overflow-x-auto">
{`User
â”œâ”€â”€ ClientProfile
â”‚   â”œâ”€â”€ ClientBankAccount (N)
â”‚   â”œâ”€â”€ Event (N)
â”‚   â”‚   â”œâ”€â”€ Booking (N)
â”‚   â”‚   â”œâ”€â”€ BudgetItem (N)
â”‚   â”‚   â””â”€â”€ Guest (N)
â”‚   â””â”€â”€ ClientReview (N)
â”‚
â””â”€â”€ VendorProfile
    â”œâ”€â”€ Service (N)
    â”‚   â”œâ”€â”€ Booking (N)
    â”‚   â”‚   â”œâ”€â”€ Contract (0..1)
    â”‚   â”‚   â”‚   â””â”€â”€ Invoice (N)
    â”‚   â”‚   â”‚       â””â”€â”€ Receipt (N)
    â”‚   â”‚   â”œâ”€â”€ ServiceReception (0..1)
    â”‚   â”‚   â”œâ”€â”€ Dispute (0..1)
    â”‚   â”‚   â””â”€â”€ Transaction (N)
    â”‚   â””â”€â”€ Review (N)
    â”œâ”€â”€ VendorBankAccount (N)
    â”œâ”€â”€ Membership (N)
    â””â”€â”€ VendorReview (N)

Conversation
â””â”€â”€ Message (N)

Quartier â† neighborhood_code (utilisÃ© par Services, Profils, Events, Contracts)
ServiceType â†’ Fonction (N)`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
