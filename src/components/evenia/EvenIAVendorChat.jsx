import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, Image as ImageIcon, Video, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { compressImage, isImage } from "@/components/ImageCompressor";
import * as E from "./evenEngine";
import * as T from "./evenTasks";

const Md = ({ text }) => (
  <div className="text-sm whitespace-pre-line">
    {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}
  </div>
);

export default function EvenIAVendorChat({ user }) {
  const [ctx, setCtx] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState(null); // { steps, i, draft, phase }
  const [pending, setPending] = useState(null); // action en attente de confirmation
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const bot = (text, extra = {}) => setMsgs(m => [...m, { from: "bot", text, ...extra }]);
  const me = (text) => setMsgs(m => [...m, { from: "me", text }]);

  const reload = async () => { const c = await E.loadContext(user); setCtx(c); return c; };

  useEffect(() => {
    (async () => {
      const c = await reload();
      bot(`Bonjour ${c.vendorProfile?.business_name || ""} 👋 Je suis EVEN IA. Je peux lire votre activite et agir **sur votre demande** : creer un service, modifier prix/description, masquer/reactiver, bloquer des dates, debloquer un lead avec un credit, ecrire a un client. Je peux enchainer plusieurs actions en un plan. Je ne touche jamais aux paiements, retraits ni contrats.`,
        { chips: ["Creer un service", "Mes services", "Mes prospects", "Mes dossiers", "Mon solde", "Conseils croissance"] });
    })();
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  // ----- flux de creation -----
  const startCreate = () => {
    const steps = E.buildServiceSteps(ctx);
    setFlow({ steps, i: 0, draft: {}, phase: "ask" });
    bot("Parfait, creons votre service etape par etape. Ecrivez **annuler** a tout moment.");
    askStep(steps, 0);
  };
  const askStep = (steps, i) => {
    const s = steps[i];
    bot(s.ask, { chips: s.options, media: s.media, optional: s.optional });
  };
  const advance = (flowState, key, value) => {
    const draft = { ...flowState.draft, [key]: value };
    if (key === "category") {
      const t = (ctx.serviceTypes || []).find(x => x.name === value);
      draft.service_type_code = t?.code_service || "";
    }
    const i = flowState.i + 1;
    if (i >= flowState.steps.length) {
      setFlow({ ...flowState, draft, i, phase: "confirm" });
      bot("Voici le recapitulatif :\n\n" + E.draftRecap(draft), { chips: ["Publier", "Annuler"] });
      setPending({ type: "publish", draft });
    } else {
      setFlow({ ...flowState, draft, i });
      askStep(flowState.steps, i);
    }
  };
  const handleFlowInput = (text) => {
    const t = E.norm(text);
    if (t === "annuler") { setFlow(null); setPending(null); return bot("Creation annulee. Rien n'a ete enregistre."); }
    if (flow.phase === "confirm") return;
    const s = flow.steps[flow.i];
    if (s.media) {
      if (s.optional && /passer|non|aucune/.test(t)) return advance(flow, s.key, "");
      return bot("Utilisez le bouton d'ajout ci-dessous (ou ecrivez 'passer' si optionnel).");
    }
    if (s.optional && /^(passer|non|aucun)$/.test(t)) return advance(flow, s.key, "");
    let v = text.trim();
    if (s.parse) v = s.parse(v, s.options);
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) {
      return bot("Je n'ai pas compris cette reponse. " + (s.options ? "Choisissez parmi : " + s.options.join(", ") : "Reessayez."));
    }
    const ok = s.validate ? s.validate(v) : true;
    if (ok !== true) return bot(ok);
    advance(flow, s.key, v);
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !flow) return;
    const s = flow.steps[flow.i];
    setBusy(true);
    try {
      let file = f;
      if (s.media === "image" && isImage(f)) file = await compressImage(f, { maxWidth: 1920, maxHeight: 1080, quality: 0.85, outputFormat: "webp" });
      const url = await E.uploadMedia(file);
      me(`📎 ${f.name}`);
      advance(flow, s.key, url);
    } catch (err) { bot("Le televersement a echoue. Verifiez votre connexion et reessayez."); }
    setBusy(false);
  };

  const publish = async () => {
    setBusy(true);
    try {
      const created = await E.createServiceFromDraft(pending.draft, user);
      bot("✅ Service enregistre. Je verifie maintenant son apparition dans la marketplace...");
      const v = await E.verifyInMarketplace(created.id);
      if (v.visible) bot(`🎉 **${created.title}** est en ligne et visible dans la marketplace.`, { link: { to: `/ServiceDetails?id=${created.id}`, label: "Voir mon service" } });
      else bot(`Le service est cree mais pas encore visible : ${v.reasons.join(", ")}.`);
      setFlow(null); setPending(null); await reload();
    } catch (err) {
      bot("❌ La creation a echoue : " + (err.message || "erreur inconnue") + ". Rien n'est perdu, dites 'creer un service' pour recommencer.");
    }
    setBusy(false);
  };

  // ----- lecture -----
  const answer = async (intent, text) => {
    const c = await reload();
    const sv = c.services;
    switch (intent) {
      case "greet": return bot("Bonjour ! Que souhaitez-vous faire ?", { chips: ["Creer un service", "Mes services", "Mon solde"] });
      case "help": return bot("Je sais : lister/evaluer vos services, creer un service complet (photos et videos comprises), masquer ou reactiver une offre, resumer vos prospects, dossiers et votre solde, donner des conseils de croissance et de prix.");
      case "create_service": return startCreate();
      case "my_services": {
        if (!sv.length) return bot("Vous n'avez pas encore de service. Voulez-vous en creer un ?", { chips: ["Creer un service"] });
        return bot(sv.map(s => { const sc = E.serviceScore(s), v = E.serviceVisibility(s); return `• **${s.title}** - ${E.fcfa(s.price_min)} - ${v.visible ? "visible" : "non visible"} - qualite ${sc.score}%`; }).join("\n"));
      }
      case "service_check": {
        if (!sv.length) return bot("Aucun service a analyser pour l'instant.");
        return bot(sv.map(s => { const sc = E.serviceScore(s), v = E.serviceVisibility(s); return `**${s.title}** : ${v.visible ? "visible" : "NON visible (" + v.reasons.join(", ") + ")"}. Qualite ${sc.score}%.` + (sc.missing.length ? ` A ajouter : ${sc.missing.join(", ")}.` : " Complet ✔"); }).join("\n\n"));
      }
      case "hide_service": case "show_service": {
        const hide = intent === "hide_service"; const t = E.norm(text);
        const target = sv.find(s => t.includes(E.norm(s.title))) || (sv.length === 1 ? sv[0] : null);
        if (!target) return bot("Quel service ? Indiquez son titre :", { chips: sv.map(s => s.title) });
        if (target.is_suspended) return bot(`**${target.title}** est suspendu par l'administration : je ne peux pas le modifier.${target.suspension_note ? " Motif : " + target.suspension_note : ""}`);
        setPending({ type: "toggle", service: target, hide });
        return bot(`${hide ? "Masquer" : "Reactiver"} **${target.title}** ?`, { chips: ["Confirmer", "Annuler"] });
      }
      case "leads": {
        return bot(T.listLeads(c));
      }
      case "bookings": {
        return bot(T.summarizeBookings(c));
      }
      case "balance": return bot(`Solde disponible : **${E.fcfa(c.vendorProfile?.account_balance)}**. Pour un retrait, rendez-vous dans l'onglet Paiement (je ne peux pas lancer de retrait).`);
      case "profile": {
        const p = c.vendorProfile || {};
        const miss = [!p.business_name && "nom de l'entreprise", !p.phone && "telephone", !p.description && "description"].filter(Boolean);
        return bot(`Profil : verification **${p.verification_status || "non verifie"}**, plan **${p.plan || "free"}**.` + (miss.length ? ` Manque : ${miss.join(", ")}.` : ""));
      }
      case "price": {
        if (!sv.length) return bot("Creez d'abord un service pour comparer.");
        const out = [];
        for (const s of sv) { const a = await E.priceAdvice(s, c);
          out.push(a.enough ? `**${s.title}** : votre prix ${E.fcfa(a.mine)} ; median categorie ${E.fcfa(a.median)} (${E.fcfa(a.min)} - ${E.fcfa(a.max)}), ${a.n} offres comparees.` : `**${s.title}** : pas assez d'offres comparables pour conclure.`); }
        return bot(out.join("\n"));
      }
      case "growth": {
        const tips = [];
        sv.forEach(s => { const sc = E.serviceScore(s); if (sc.missing.length) tips.push(`Completez "${s.title}" : ${sc.missing.join(", ")}.`); });
        if (!c.vendorProfile?.verification_status || c.vendorProfile.verification_status === "unverified") tips.push("Faites verifier votre profil : les clients font plus confiance aux profils verifies.");
        if (sv.length < 2) tips.push("Ajoutez un second service pour elargir votre visibilite.");
        return bot(tips.length ? tips.map(t => "• " + t).join("\n") : "Votre profil est bien optimise. Continuez a repondre vite aux demandes !");
      }
      default: return bot("Je n'ai pas bien compris. Essayez : « creer un service », « mes services », « mon solde », « mes prospects ».", { chips: ["Creer un service", "Mes services", "Aide"] });
    }
  };

  const runPlan = async (p, c) => {
    setBusy(true);
    const upd = (i, patch) => setMsgs(m => m.map(x => x.pid === p.pid ? { ...x, plan: x.plan.map((a, k) => k === i ? { ...a, ...patch } : a) } : x));
    let ok = 0;
    for (let i = 0; i < p.actions.length; i++) {
      upd(i, { status: "running" });
      try { const r = await p.actions[i].run(c); upd(i, { status: "done", result: r }); ok++; }
      catch (e) { upd(i, { status: "error", error: e.message || "echec" }); }
    }
    bot(`Termine : ${ok}/${p.actions.length} action(s) reussie(s).`);
    await reload(); setBusy(false);
  };

  const send = async (raw) => {
    const text = (raw ?? input).trim(); if (!text || busy) return;
    setInput(""); me(text); const t = E.norm(text);
    if (E.FORBIDDEN.test(t)) return bot("Pour votre securite, je ne peux pas effectuer cette action (paiements, retraits, contrats, compte). Faites-la depuis votre tableau de bord.");
    if (pending) {
      if (/^(publier|confirmer|oui|executer)$/.test(t)) {
        const p = pending; setPending(null);
        if (p.type === "plan") return runPlan(p, ctx);
        if (p.type === "publish") return publish();
        if (p.type === "toggle") { setBusy(true); try { await E.setServiceHidden(p.service, p.hide); bot(`✅ "${p.service.title}" ${p.hide ? "masque" : "reactive"}.`); await reload(); } catch { bot("Action refusee ou impossible."); } setBusy(false); return; }
      }
      if (/^(annuler|non)$/.test(t)) { setPending(null); setFlow(null); return bot("D'accord, rien n'a ete modifie."); }
    }
    if (flow) return handleFlowInput(text);
    setBusy(true);
    try {
      const c = await reload();
      const plan = T.buildPlan(text, c);
      if (plan) {
        plan.errors.forEach(e => bot(e));
        if (plan.actions.length) {
          const pid = Date.now();
          setMsgs(m => [...m, { from: "bot", text: `Voici mon plan (${plan.actions.length} action${plan.actions.length > 1 ? "s" : ""}). Rien n'est execute avant votre accord :`, pid, plan: plan.actions.map(a => ({ label: a.label, status: "todo" })), chips: ["Executer", "Annuler"] }]);
          setPending({ type: "plan", pid, actions: plan.actions });
        }
        setBusy(false); return;
      }
      await answer(E.detectIntent(text), text); } catch (e) { bot("Une erreur est survenue en lisant vos donnees."); } setBusy(false);
  };

  const last = msgs[msgs.length - 1];
  const step = flow && flow.phase === "ask" ? flow.steps[flow.i] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-3xl mx-auto bg-[#F9F7F3]">
      <div className="flex items-center gap-2 p-3 border-b bg-white"><Sparkles className="w-5 h-5 text-[#FF6B35]" /><b>EVEN IA</b><span className="text-xs text-stone-500">assistant vendeur</span></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${m.from === "me" ? "bg-[#FF6B35] text-white" : "bg-white border"}`}>
              <Md text={m.text} />
              {m.plan && <div className="mt-3 space-y-1">{m.plan.map((a, k) => (
                <div key={k} className="text-xs flex gap-2"><span>{a.status === "done" ? "✅" : a.status === "error" ? "❌" : a.status === "running" ? "⏳" : "⬜"}</span>
                  <span>{a.label}{a.result ? " - " + a.result : ""}{a.error ? " - " + a.error : ""}</span></div>))}</div>}
              {m.link && <Link to={m.link.to} className="text-xs text-[#FF6B35] underline mt-2 inline-block">{m.link.label}</Link>}
              {m.chips && i === msgs.length - 1 && <div className="flex flex-wrap gap-2 mt-3">{m.chips.map(c => <button key={c} onClick={() => send(c)} className="text-xs px-3 py-1.5 rounded-full bg-[#FFF0E8] hover:bg-[#FF6B35] hover:text-white">{c}</button>)}</div>}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-stone-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> EVEN IA travaille...</div>}
        <div ref={endRef} />
      </div>
      {step?.media && (
        <div className="px-4 pb-2"><input ref={fileRef} type="file" accept={step.media === "image" ? "image/*" : "video/*"} className="hidden" onChange={onFile} />
          <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {step.media === "image" ? <ImageIcon className="w-4 h-4 mr-2" /> : <Video className="w-4 h-4 mr-2" />}Ajouter {step.media === "image" ? "une image" : "une video"}</Button></div>
      )}
      <div className="p-3 border-t bg-white flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ecrivez a EVEN IA..." disabled={busy} />
        <Button onClick={() => send()} disabled={busy || !input.trim()} className="bg-[#FF6B35] hover:bg-[#e05a2b]"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
