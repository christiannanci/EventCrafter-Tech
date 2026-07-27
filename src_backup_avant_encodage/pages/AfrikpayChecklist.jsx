import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, CheckCircle, ShieldCheck, RotateCcw } from 'lucide-react';

// Statuts possibles d'un item : "confirmed" | "to_validate" | "to_negotiate" | "critical" | null
const STATUS_META = {
  confirmed: { label: 'Confirmé', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  to_validate: { label: 'À valider', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  to_negotiate: { label: 'À négocier', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  critical: { label: 'Critique', color: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const checklistData = [
  {
    title: "A. Documents & Vérifications Légales",
    items: [
      { text: "Récupérer l'exemplaire complet du contrat avec toutes ses annexes", status: 'to_validate' },
      { text: "Vérifier le RCCM de AFRIKPAY SA (N° CM-DLA-01-2025-M-06861) au Tribunal de Commerce", status: 'to_validate' },
      { text: "Vérifier le RCCM de KEUCH SARL (N° CM-NSI-02-2026-B12-00516)", status: 'to_validate' },
      { text: "Confirmer l'identité et le mandat de NANCI YOSSI RAOUL (Co-fondateur & Gérant)", status: 'to_validate' },
      { text: "Vérifier le pouvoir de signature de M. Alain Blaise NJOMO (ADG AfrikPay)", status: 'to_validate' },
      { text: "Obtenir les statuts à jour des deux sociétés", status: 'to_validate' },
      { text: "Vérifier l'assurance responsabilité civile professionnelle d'AfrikPay", status: 'to_validate' },
      { text: "Vérifier la conformité aux exigences COBAC (réglementation CEMAC)", status: 'to_validate' },
    ]
  },
  {
    title: "B. Conditions Financières (Art. 5 + Annexes 1 & 2) — CRITIQUE",
    items: [
      { text: "⚠️ Annexe 1 (Tarification) et Annexe 2 (Quote-part KEUCH SARL) sont VIDES dans le contrat reçu", status: 'critical', isHeader: true },
      { text: "Exiger la grille tarifaire complète AVANT toute signature (Annexe 1)", status: 'critical' },
      { text: "Exiger le détail de la quote-part KEUCH SARL AVANT signature (Annexe 2)", status: 'critical' },
      { text: "Art. 5.4 — « Silence = acceptation » des hausses tarifaires (10 jours sans réponse = réputé accepté)", status: 'critical', isHeader: true },
      { text: "Renégocier Art. 5.4 : remplacer le silence-valant-acceptation par un opt-in explicite", status: 'to_negotiate' },
      { text: "Demander un préavis de modification tarifaire de 30 jours minimum (au lieu de 15 jours)", status: 'to_negotiate' },
      { text: "Art. 5.2 — Définir précisément « changement significatif des conditions » (sinon interprétation trop large)", status: 'to_negotiate' },
      { text: "Modèle prépayé obligatoire (Art. 3) — impacts :", status: 'critical', isHeader: true },
      { text: "Immobilisation de trésorerie (fonds bloqués chez AfrikPay avant transactions)", status: 'critical' },
      { text: "Délai de 3 jours avant transferts/paiements (Art. 7) — évaluer l'impact opérationnel", status: 'to_validate' },
      { text: "Risque de gel si fonds insuffisants (transactions refusées)", status: 'critical' },
      { text: "Définir le montant de provision minimum à maintenir sur le compte Afrik'Biz", status: 'to_validate' },
      { text: "Négocier une option de post-paiement ou ligne de crédit pour les gros volumes", status: 'to_negotiate' },
      { text: "Comparaison concurrents :", status: 'to_validate', isHeader: true },
      { text: "Comparer les tarifs AfrikPay avec Paystack et Flutterwave (une fois annexes reçues)", status: 'to_validate' },
      { text: "Vérifier les frais d'installation / onboarding éventuels", status: 'to_validate' },
      { text: "Vérifier les frais de reversement (virement vers compte bancaire)", status: 'to_validate' },
      { text: "Vérifier la fréquence de facturation et les modalités de règlement", status: 'to_validate' },
    ]
  },
  {
    title: "C. Technique & API",
    items: [
      { text: "Demander la documentation API complète (REST/SOAP)", status: 'to_validate' },
      { text: "Obtenir l'accès à un environnement sandbox/test", status: 'critical' },
      { text: "Vérifier la disponibilité des webhooks (notifications de paiement)", status: 'critical' },
      { text: "Confirmer les méthodes d'authentification (API key, OAuth, etc.)", status: 'to_validate' },
      { text: "Demander les SDK disponibles (JS, Python, PHP)", status: 'to_validate' },
      { text: "Vérifier les limites de débit (rate limits) de l'API", status: 'to_validate' },
      { text: "Obtenir le SLA de disponibilité (% d'uptime garanti)", status: 'to_validate' },
      { text: "Clarifier le délai de confirmation d'une transaction (synchrone/asynchrone)", status: 'to_validate' },
      { text: "Vérifier la gestion des remboursements (refunds) via API", status: 'to_validate' },
      { text: "Demander les exemples de code d'intégration", status: 'to_validate' },
      { text: "Tester la création d'un paiement en sandbox", status: 'critical' },
      { text: "Vérifier la prise en charge des paiements récurrents (abonnements Membership)", status: 'to_validate' },
      { text: "Vérifier l'intégration avec le flux de booking EventCrafter (entité Booking)", status: 'to_validate' },
    ]
  },
  {
    title: "D. Sécurité & Escrow (CRITIQUE pour EventCrafter)",
    items: [
      { text: "Décision : Escrow géré en interne par EventCrafter (service AfrikPay non retenu)", status: 'confirmed', isHeader: true },
      { text: "Service d'escrow AfrikPay non soumissionné — EventCrafter assure le séquestre des fonds", status: 'confirmed' },
      { text: "AfrikPay ne tient PAS les fonds en séquestre (rôle limité au traitement du paiement)", status: 'confirmed' },
      { text: "Mécanisme de libération des fonds vers les prestataires :", status: 'critical', isHeader: true },
      { text: "Étape 1 — Paiement client → Transaction status = 'escrow_held' (fonds séquestrés par EventCrafter)", status: 'critical' },
      { text: "Étape 2 — Signature contrat : libération de l'acompte → Booking.amount_released (avance prestataire)", status: 'critical' },
      { text: "Étape 3 — Prestation livrée et validée : libération du solde → Transaction status = 'released'", status: 'critical' },
      { text: "Étape 4 — Versement effectif au prestataire (payout) → Transaction status = 'payout_sent'", status: 'critical' },
      { text: "Définir les jalons de libération (% acompte / % solde) dans le cycle de vie Booking", status: 'critical' },
      { text: "Litige en cours : blocage des fonds (Transaction status = 'blocked') pendant Dispute ouvert", status: 'critical' },
      { text: "Remboursement client le cas échéant (Transaction type = 'payout', Booking.payment_status = 'refunded')", status: 'critical' },
      { text: "Coûts additionnels de l'escrow interne :", status: 'critical', isHeader: true },
      { text: "Compte bancaire de séquestre dédié (séparé du compte d'exploitation KEUCH SARL)", status: 'critical' },
      { text: "Frais bancaires de versement aux prestataires (virements / mobile money payouts) — à chiffrer", status: 'to_validate' },
      { text: "Conformité réglementaire COBAC/CEMAC : vérifier le statut requis (EME agréé ou partenaire monnaie électronique)", status: 'critical' },
      { text: "Provision pour risque de fraude / insolvabilité prestataire (fonds non recouvrables)", status: 'to_validate' },
      { text: "Coût de conciliation comptable et d'audit (reporting mensuel des comptes de séquestre)", status: 'to_validate' },
      { text: "Évaluer l'opportunité d'une caution / garantie bancaire pour couvrir la flotte de fonds", status: 'to_validate' },
      { text: "Vérifier la conformité PCI-DSS (gestion des cartes)", status: 'to_validate' },
      { text: "Demander les certifications de sécurité d'AfrikPay", status: 'to_validate' },
      { text: "Vérifier le chiffrement des données en transit et au repos", status: 'to_validate' },
      { text: "Clarifier la politique de rétention des données de transaction", status: 'to_validate' },
      { text: "Obtenir la procédure de gestion des incidents de sécurité", status: 'to_validate' },
      { text: "Définir le processus de blocage de compte en cas de fraude", status: 'to_validate' },
      { text: "Clarifier la responsabilité en cas de faille côté AfrikPay", status: 'to_validate' },
    ]
  },
  {
    title: "E. Clauses Contractuelles à Négocier (Contrat Afrik'Biz)",
    items: [
      { text: "Art. 4 — Tacite reconduction : négocier un préavis de dénonciation (3 mois avant échéance)", status: 'to_negotiate' },
      { text: "Art. 5.4 — Silence = acceptation des hausses tarifaires : exiger un opt-in explicite", status: 'to_negotiate' },
      { text: "Art. 5.2 — Définir « changement significatif » pour encadrer les révisions tarifaires", status: 'to_negotiate' },
      { text: "Art. 11 — Droit de suspension unilatéral AfrikPay sans préavis : asymétrie de traitement à corriger", status: 'to_negotiate' },
      { text: "Art. 11 — Aligner les conditions de suspension : préavis écrit et délai de régularisation identiques des deux côtés", status: 'to_negotiate' },
      { text: "Art. 12 — Propriété intellectuelle : les développements spécifiques deviennent propriété AfrikPay", status: 'critical', isHeader: true },
      { text: "Négocier une licence perpétuelle ou propriété partagée des développements spécifiques", status: 'to_negotiate' },
      { text: "Clarifier l'usage des logos/marques AfrikPay sur EventCrafter (Art. 15 publicité mutuelle)", status: 'to_validate' },
      { text: "Art. 13 — Confidentialité : pas de durée de survie post-résiliation — à ajouter", status: 'to_negotiate' },
      { text: "SLA absent : négocier un taux de disponibilité minimum (99,5%) et temps de réponse", status: 'to_negotiate' },
      { text: "Plafond de responsabilité absent : limiter à X mois de commissions en cas d'erreur de transaction", status: 'to_negotiate' },
      { text: "Art. 18 — Arbitrage GECAM à Douala : vérifier les coûts et l'acceptabilité", status: 'to_validate' },
      { text: "Clause de non-concurrence : vérifier qu'aucune exclusivité n'est imposée", status: 'to_validate' },
      { text: "Sous-traitance : vérifier si AfrikPay peut sous-traiter à l'étranger", status: 'to_validate' },
      { text: "Pénalités de retard : vérifier les conditions", status: 'to_validate' },
    ]
  },
  {
    title: "F. Opérations & Reversements (Art. 3, 7, 8, 20)",
    items: [
      { text: "Art. 3 — Modèle prépayé : définir le processus et la fréquence d'approvisionnement du compte Afrik'Biz", status: 'to_validate' },
      { text: "Art. 7 — Recharger le compte au moins 3 jours avant d'ordonner des transferts/paiements", status: 'to_validate' },
      { text: "Définir le compte bancaire de réception des fonds EventCrafter", status: 'to_validate' },
      { text: "Clarifier le délai de versement des fonds collectés (J+1, J+3, etc.)", status: 'to_validate' },
      { text: "Art. 8 — Interface web de gestion et de suivi des transactions : obtenir les accès et credentials", status: 'to_validate' },
      { text: "Art. 8 — Vérifier les workflows de validation configurables (multi-niveaux)", status: 'to_validate' },
      { text: "Art. 8 — Paramétrage des notifications (emails à notifier à chaque paiement)", status: 'to_validate' },
      { text: "Définir le processus de conciliation des transactions", status: 'to_validate' },
      { text: "Mettre en place un reporting quotidien/mensuel", status: 'to_validate' },
      { text: "Art. 8 — Support technique : +237 658 880 708 / support@afrikpay.com — vérifier horaires et SLA", status: 'to_validate' },
      { text: "Art. 8 — Formation du personnel : planifier la session avec AfrikPay", status: 'to_validate' },
      { text: "Art. 20 — Délai de mise en œuvre : 2 semaines après signature — préparer les informations KYC à l'avance", status: 'to_validate' },
      { text: "Mettre en place la procédure de réconciliation comptable", status: 'to_validate' },
    ]
  },
  {
    title: "G. Support & Relation Client",
    items: [
      { text: "Obtenir les contacts d'urgence (support 24/7 ?)", status: 'to_validate' },
      { text: "Vérifier les horaires de support technique", status: 'to_validate' },
      { text: "Demander le gestionnaire de compte dédié", status: 'to_validate' },
      { text: "Clarifier le processus d'escalade des incidents", status: 'to_validate' },
      { text: "Vérifier l'existence d'un portail marchand (dashboard de suivi)", status: 'to_validate' },
      { text: "Demander les statistiques de performance (disponibilité, temps de réponse)", status: 'to_validate' },
    ]
  },
  {
    title: "H. Plan B & Risques",
    items: [
      { text: "Clause de sortie : vérifier les conditions de récupération des fonds en cas de rupture", status: 'to_validate' },
      { text: "Portabilité des données : récupération de l'historique des transactions", status: 'to_validate' },
      { text: "Pénalités de sortie anticipée : vérifier l'existence", status: 'to_validate' },
      { text: "Continuité de service : que se passe-t-il si AfrikPay cesse son activité ?", status: 'to_validate' },
      { text: "Préparer une solution de secours (Paystack/Flutterwave) en parallèle", status: 'critical' },
      { text: "Vérifier la souscription à l'indemnisation en cas de faillite d'AfrikPay", status: 'to_validate' },
    ]
  },
  {
    title: "I. Avant la Signature",
    items: [
      { text: "Relecture par un juriste camerounais spécialisé en droit des TIC", status: 'critical' },
      { text: "Validation comptable du schéma de rémunération", status: 'to_validate' },
      { text: "Validation technique de l'API par votre équipe/dev", status: 'to_validate' },
      { text: "Validation du business case (coût vs. bénéfice)", status: 'to_validate' },
      { text: "Obtenir un devis détaillé hors contrat", status: 'to_validate' },
      { text: "Demander 3 références clients d'AfrikPay (e-commerce similaire)", status: 'to_validate' },
      { text: "Contacter ces références pour retour d'expérience", status: 'to_validate' },
      { text: "Vérifier la réputation d'AfrikPay (avis, presse, réseaux sociaux)", status: 'to_validate' },
      { text: "Préparer les 2 exemplaires originaux pour signature", status: 'to_validate' },
    ]
  },
];

const decisionTable = [
  ["Critère", "Statut"],
  ["Annexes 1 & 2 (tarification + quote-part) remplies", "BLOQUANT — à obtenir"],
  ["Art. 5.4 « silence = acceptation » renégocié", "À négocier"],
  ["SLA de disponibilité négocié", "À négocier"],
  ["Plafond de responsabilité défini", "À négocier"],
  ["Art. 12 propriété intellectuelle des développements spécifiques", "À négocier"],
  ["Tarifs compétitifs vs. concurrents", "À valider (annexes vides)"],
  ["Escrow géré en interne (non AfrikPay)", "Décision prise"],
  ["Coût additionnel escrow interne chiffré", "À valider"],
  ["Support technique suffisant (Art. 8)", "À valider"],
  ["Clauses contractuelles acceptables", "À négocier"],
  ["Conformité réglementaire (CEMAC/COBAC)", "OK"],
  ["Couverture des moyens de paiement", "OK (Orange/MTN)"],
  ["Délai de mise en œuvre (Art. 20)", "OK — 2 semaines"],
];

const STORAGE_KEY = 'afrikpay_checklist_progress';

function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function generateWordHTML(checkedMap) {
  const today = new Date().toLocaleDateString('fr-FR');

  const buildCategory = (filterFn, categoryTitle) => {
    const sectionsHTML = checklistData.map(section => {
      const items = section.items
        .map((item, idx) => ({ ...item, key: `${section.title}__${idx}` }))
        .filter(filterFn);
      if (items.length === 0) return '';
      const itemsHTML = items.map(item => {
        const isDone = checkedMap[item.key];
        const box = isDone ? '☑' : '☐';
        const indent = item.isHeader ? '' : (item.status === 'confirmed' && !item.isHeader ? 'margin-left: 20px;' : '');
        const weight = item.isHeader ? 'font-weight: bold;' : '';
        const tag = item.status && STATUS_META[item.status]
          ? `<span style="font-size: 8pt; color: #666; margin-left: 6px;">[${STATUS_META[item.status].label}]</span>`
          : '';
        return `<p style="margin: 4px 0; ${indent} ${weight}">${box} ${item.text}${tag}</p>`;
      }).join('');
      return `
        <h2 style="color: #FF6B35; font-size: 16pt; margin-top: 24px; border-bottom: 2px solid #FF6B35; padding-bottom: 4px;">${section.title}</h2>
        ${itemsHTML}
      `;
    }).join('');
    return `<h1 style="color: #2C2C2C; font-size: 20pt; margin-top: 32px;">${categoryTitle}</h1>${sectionsHTML}`;
  };

  const negotiateHTML = buildCategory(item => item.status === 'to_negotiate', 'I. Éléments à Négocier');
  const criticalHTML = buildCategory(item => item.status === 'critical', 'II. Points Critiques');
  const othersHTML = buildCategory(item => item.status !== 'to_negotiate' && item.status !== 'critical', 'III. Autres éléments');

  const tableRows = decisionTable.map((row, idx) => {
    const cells = row.map(cell => {
      const bg = idx === 0 ? 'background-color: #FF6B35; color: #FFFFFF;' : '';
      return `<td style="padding: 8px 12px; border: 1px solid #CCCCCC; ${bg}"><strong>${cell}</strong></td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Check-list Contrat AfrikPay × EventCrafter</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #2C2C2C; line-height: 1.5; }
  h1 { color: #2C2C2C; font-size: 22pt; text-align: center; margin-bottom: 4px; }
  .subtitle { color: #FF6B35; font-size: 14pt; text-align: center; font-weight: bold; margin-bottom: 4px; }
  .date { color: #666666; font-size: 10pt; text-align: center; font-style: italic; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
</style>
</head>
<body>
  <h1>CHECK-LIST PRÉALABLE À LA SIGNATURE</h1>
  <p class="subtitle">Contrat AFRIKPAY × KEUCH SARL (EventCrafter)</p>
  <p class="date">Date : ${today}</p>
  <hr style="border: 1px solid #FF6B35; margin-bottom: 16px;">
  ${negotiateHTML}
  ${criticalHTML}
  ${othersHTML}
  <h2 style="color: #FF6B35; font-size: 16pt; margin-top: 32px; border-bottom: 2px solid #FF6B35; padding-bottom: 4px;">J. Décision Finale</h2>
  <table>${tableRows}</table>
  <p style="text-align: center; margin-top: 20px; color: #DC2626; font-weight: bold;">✅ Ne signer QUE si tous les critères ci-dessus sont validés</p>
  <hr style="border: 1px solid #CCCCCC; margin-top: 32px;">
  <p style="text-align: center; color: #999999; font-size: 9pt;">Document généré par EventCrafter — ${today}</p>
</body>
</html>`;
}

export default function AfrikpayChecklist() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [checkedMap, setCheckedMap] = useState({});

  useEffect(() => {
    setCheckedMap(loadProgress());
  }, []);

  const allItems = useMemo(() => {
    const flat = [];
    checklistData.forEach(section => {
      section.items.forEach((item, idx) => {
        flat.push({ ...item, key: `${section.title}__${idx}`, section: section.title });
      });
    });
    return flat;
  }, []);

  const categorized = useMemo(() => {
    const build = (filterFn) =>
      checklistData
        .map(section => ({
          title: section.title,
          items: section.items
            .map((item, idx) => ({ ...item, key: `${section.title}__${idx}` }))
            .filter(filterFn),
        }))
        .filter(section => section.items.length > 0);
    return {
      negotiate: build(item => item.status === 'to_negotiate'),
      critical: build(item => item.status === 'critical'),
      others: build(item => item.status !== 'to_negotiate' && item.status !== 'critical'),
    };
  }, []);

  const checkedCount = allItems.filter(it => checkedMap[it.key]).length;
  const totalCount = allItems.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const toggle = (key) => {
    setCheckedMap(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const resetAll = () => {
    setCheckedMap({});
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const handleDownload = () => {
    setLoading(true);
    try {
      const html = generateWordHTML(checkedMap);
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Check-list-Afrikpay-EventCrafter.doc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (section) => (
    <div key={section.title} className="border border-stone-200 rounded-xl overflow-hidden">
      <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
        <h3 className="font-semibold text-stone-800 text-sm md:text-base">{section.title}</h3>
        <span className="text-xs text-stone-500 font-medium">{section.items.filter(it => checkedMap[it.key]).length}/{section.items.length}</span>
      </div>
      <div className="divide-y divide-stone-100">
        {section.items.map((item) => {
          const isChecked = !!checkedMap[item.key];
          const meta = item.status ? STATUS_META[item.status] : null;
          return (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors min-h-[44px] ${
                isChecked ? 'bg-emerald-50/50' : 'hover:bg-stone-50'
              } ${item.isHeader ? 'bg-stone-50/70' : ''}`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isChecked
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-stone-300 bg-white'
              }`}>
                {isChecked && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${isChecked ? 'line-through text-stone-400' : 'text-stone-700'} ${item.isHeader ? 'font-semibold' : ''}`}>
                  {item.text}
                </span>
                {meta && (
                  <span className={`ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded border ${meta.color} font-medium`}>
                    {meta.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F7F3] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#FF6B35] to-[#e05a2b] p-8 md:p-10 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Check-list Contrat AfrikPay
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Document Word — Préalable à la signature du contrat AFRIKPAY × KEUCH SARL
            </p>
          </div>

          {/* Content */}
          <div className="p-6 md:p-10">
            <div className="bg-[#FFF0E8] border border-[#FF6B35]/20 rounded-xl p-4 mb-6 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#FF6B35] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-stone-700">
                Cochez les items au fur et à mesure — votre progression est sauvegardée automatiquement.
                <strong>2 catégories</strong> · <strong>{totalCount} items</strong>.
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-stone-700">Progression</span>
                <span className="text-sm font-bold text-[#FF6B35]">{checkedCount} / {totalCount} ({progressPct}%)</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B35] to-[#e05a2b] rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Catégorie I — À Négocier */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">I</span>
                <h2 className="text-lg font-bold text-stone-800">Éléments à Négocier</h2>
                <span className="text-xs text-stone-400">({categorized.negotiate.reduce((n, s) => n + s.items.length, 0)} items)</span>
              </div>
              <div className="space-y-6">
                {categorized.negotiate.map(section => renderSection(section))}
              </div>
            </div>

            {/* Catégorie II — Critiques */}
            <div className="space-y-4 mt-10">
              <div className="flex items-center gap-2">
                <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">II</span>
                <h2 className="text-lg font-bold text-stone-800">Points Critiques</h2>
                <span className="text-xs text-stone-400">({categorized.critical.reduce((n, s) => n + s.items.length, 0)} items)</span>
              </div>
              <div className="space-y-6">
                {categorized.critical.map(section => renderSection(section))}
              </div>
            </div>

            {/* Catégorie III — Autres */}
            <div className="space-y-4 mt-10">
              <div className="flex items-center gap-2">
                <span className="bg-stone-200 text-stone-700 text-xs font-bold px-2.5 py-1 rounded-full border border-stone-300">III</span>
                <h2 className="text-lg font-bold text-stone-800">Autres éléments</h2>
                <span className="text-xs text-stone-400">({categorized.others.reduce((n, s) => n + s.items.length, 0)} items)</span>
              </div>
              <div className="space-y-6">
                {categorized.others.map(section => renderSection(section))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                onClick={handleDownload}
                disabled={loading}
                className="bg-[#FF6B35] hover:bg-[#e05a2b] text-white rounded-full px-8 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all min-h-[48px]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Génération en cours...</>
                ) : done ? (
                  <><CheckCircle className="w-5 h-5 mr-2" /> Téléchargé !</>
                ) : (
                  <><Download className="w-5 h-5 mr-2" /> Télécharger le document Word</>
                )}
              </Button>
              <button
                onClick={resetAll}
                className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1.5 min-h-[44px]"
              >
                <RotateCcw className="w-3 h-3" /> Réinitialiser la progression
              </button>
              <p className="text-xs text-stone-400 text-center">
                Format .doc — Compatible Microsoft Word, Google Docs, LibreOffice
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}