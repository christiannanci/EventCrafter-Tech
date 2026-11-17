import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, Image as ImageIcon, Video, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { compressImage, isImage } from "@/components/ImageCompressor";
import * as E from "./evenEngine";
import * as T from "./evenTasks";
import * as A from "./evenAdvisor";
import * as G from "./evenAgent";

const Md = ({ text }) => {
  const clean = (text || "").replace(/^\s*#{1,6}\s*/gm, "").replace(/^\s*[-*]\s+/gm, "\u2022 ");
  return (
    <div className="text-sm whitespace-pre-line">
      {clean.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}
    </div>
  );
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function EvenIAVendorChat({ user }) {
  const [ctx, setCtx] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState(null); // { steps, i, draft, phase }
  const [pending, setPending] = useState(null); // action en attente de confirmation
  // IA avancee : llm = serveur configure ? (null = en cours de verification) ; pref = choix du vendeur (ON par defaut)
  const [llm, setLlm] = useState(null);
  const [pref, setPref] = useState(() => { try { return localStorage.getItem("evenia_llm") !== "0"; } catch { return true; } });
  const useAI = llm === true && pref;
  const [agentBusy, setAgentBusy] = useState(false);
  const apiRef = useRef([]);      // historique au format du modele (messages + appels d'outils)
  const abortRef = useRef(null);
  const confirmRef = useRef(null);
  const toggleAI = () => {
    const v = !pref; setPref(v); try { localStorage.setItem("evenia_llm", v ? "1" : "0"); } catch {}
    bot(v ? "IA avancée activée : écrivez-moi naturellement, je réfléchis, je consulte vos données et je propose ou exécute des actions avec votre accord. Seules vos données d'activité (sans noms ni contacts de clients) sont transmises au modèle de langage."
          : "IA avancée désactivée : je reste en mode autonome (commandes simples).");
  };
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const bot = (text, extra = {}) => setMsgs(m => [...m, { from: "bot", text, ...extra }]);
  const me = (text) => setMsgs(m => [...m, { from: "me", text }]);

  const reload = async () => { const c = await E.loadContext(user); setCtx(c); return c; };

  useEffect(() => {
    (async () => {
      const ok = await G.checkLLM(); setLlm(ok);
      const c = await reload();
      if (ok && pref) bot(`Bonjour ${c.vendorProfile?.business_name || ""} 👋 Je suis EVEN IA. Écrivez-moi naturellement, comme à un conseiller : je peux analyser votre activité, vous proposer des solutions et agir sur demande (créer ou modifier un service, bloquer des dates, débloquer une demande avec un crédit, écrire à un client), toujours avec votre confirmation. Je ne touche jamais aux paiements, retraits ni contrats.`,
        { chips: ["Analyse mon activité", "Je veux créer un service", "Comment avoir plus de clients ?", "Quelles demandes sont ouvertes ?"] });
      else bot(`Bonjour ${c.vendorProfile?.business_name || ""} 👋 Je suis EVEN IA. Je peux lire votre activite et agir **sur votre demande** : creer un service, modifier prix/description, masquer/reactiver, bloquer des dates, debloquer un lead avec un credit, ecrire a un client. Je peux enchainer plusieurs actions en un plan. Je ne touche jamais aux paiements, retraits ni contrats.`,
        { chips: ["Creer un service", "Mes services", "Mes prospects", "Mes dossiers", "Mon solde", "Analyse mon activite"] });
      try {
        const fx = A.formatFindings(await A.diagnose(c), 3);
        if (fx.chips.length || fx.text) bot("J'ai analyse votre activite :\n\n" + fx.text + (fx.more > 0 ? `\n\n(+${fx.more} autre(s) point(s) : dites « analyse mon activite »)` : ""), { chips: fx.chips });
      } catch {}
    })();
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: msgs[msgs.length - 1]?.streaming ? "auto" : "smooth" }); }, [msgs, busy]);

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
    let i = flowState.i + 1;
    while (i < flowState.steps.length && draft[flowState.steps[i].key] !== undefined) i++; // etapes deja remplies (brouillon de l'agent)
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
    if (flow.phase === "confirm") return bot("Écrivez « Publier » pour confirmer, ou « Annuler ».", { chips: ["Publier", "Annuler"] });
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

  // ----- brouillon propose par l'agent : on continue avec l'image / video puis la confirmation -----
  const startCreateFromDraft = (draft, c) => {
    const steps = E.buildServiceSteps(c);
    const d = { ...draft };
    steps.forEach(st => { if (!st.media && st.optional && d[st.key] === undefined) d[st.key] = ""; });
    const i = steps.findIndex(st => d[st.key] === undefined);
    if (i === -1) {
      setFlow({ steps, i: steps.length, draft: d, phase: "confirm" });
      bot("Voici le récapitulatif :\n\n" + E.draftRecap(d), { chips: ["Publier", "Annuler"] });
      setPending({ type: "publish", draft: d });
      return;
    }
    setFlow({ steps, i, draft: d, phase: "ask" });
    askStep(steps, i);
  };

  // ----- agent (IA avancee) -----
  const resolveConfirm = (ok) => {
    const c = confirmRef.current; if (!c) return; confirmRef.current = null;
    setMsgs(m => m.map(x => x.cid === c.cid ? { ...x, open: false, decision: ok ? "approved" : "refused" } : x));
    c.resolve(ok);
  };
  const stopAgent = () => { abortRef.current?.abort(); resolveConfirm(false); };

  const agentTurn = async (text) => {
    const ac = new AbortController(); abortRef.current = ac; setAgentBusy(true);
    let sid = null, curCid = null, acted = false;
    const cb = {
      onTurnStart: () => { sid = null; },
      onText: (d) => {
        if (!sid) { sid = newId(); const id = sid; setMsgs(m => [...m, { from: "bot", text: d, sid: id, streaming: true }]); }
        else { const id = sid; setMsgs(m => m.map(x => x.sid === id ? { ...x, text: x.text + d } : x)); }
      },
      onTurnEnd: () => { const id = sid; if (id) setMsgs(m => m.map(x => x.sid === id ? { ...x, streaming: false } : x)); sid = null; },
      confirm: (labels) => new Promise(resolve => {
        const cid = newId(); curCid = cid; confirmRef.current = { cid, resolve };
        setMsgs(m => [...m, { from: "bot", text: labels.length > 1 ? "Je souhaite effectuer ces actions :" : "Je souhaite effectuer cette action :", cid, open: true, plan: labels.map(l => ({ label: l, status: "todo" })) }]);
      }),
      progress: (idx, patch) => { if (patch.status === "done") acted = true; const id = curCid; setMsgs(m => m.map(x => x.cid === id ? { ...x, plan: x.plan.map((a, k) => k === idx ? { ...a, ...patch } : a) } : x)); },
    };
    try {
      const out = await G.runAgent({ messages: [...apiRef.current, { role: "user", content: text }], user, callbacks: cb, signal: ac.signal });
      apiRef.current = G.trimHistory(out.messages);
      const fresh = await reload();
      if (out.draft) startCreateFromDraft(out.draft, fresh);
    } catch (e) {
      cb.onTurnEnd(); confirmRef.current = null;
      if (e.name === "AbortError") { bot("Réponse interrompue."); await reload(); }
      else if (e.status === 429) bot(e.message);
      else if (acted) { bot("La connexion avec l'IA s'est interrompue après l'exécution de l'action ci-dessus. Vérifiez le résultat dans votre tableau de bord."); await reload(); }
      else { bot("L'IA avancée est indisponible (" + (e.message || "erreur") + "). Je continue en mode autonome."); await answer(E.detectIntent(text), text); }
    } finally { abortRef.current = null; setAgentBusy(false); }
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
      case "advice": case "growth": {
        const fx = A.formatFindings(await A.diagnose(c), 5);
        return bot(fx.text, { chips: fx.chips });
      }
      case "growth_old": {
        const tips = [];
        sv.forEach(s => { const sc = E.serviceScore(s); if (sc.missing.length) tips.push(`Completez "${s.title}" : ${sc.missing.join(", ")}.`); });
        if (!c.vendorProfile?.verification_status || c.vendorProfile.verification_status === "unverified") tips.push("Faites verifier votre profil : les clients font plus confiance aux profils verifies.");
        if (sv.length < 2) tips.push("Ajoutez un second service pour elargir votre visibilite.");
        return bot(tips.length ? tips.map(t => "• " + t).join("\n") : "Votre profil est bien optimise. Continuez a repondre vite aux demandes !");
      }
      default: {
        const g = A.guess(text);
        if (g.length) return bot("Je ne suis pas sur d'avoir compris. Vouliez-vous dire :", { chips: g });
      }
      // eslint-disable-next-line no-fallthrough
      case "__fallback": return bot("Je n'ai pas bien compris. Essayez : « creer un service », « mes services », « mon solde », « mes prospects ».", { chips: ["Creer un service", "Mes services", "Aide"] });
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
      if (useAI) { await agentTurn(text); setBusy(false); return; }
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
      <div className="flex items-center gap-2 p-3 border-b bg-white"><Sparkles className="w-5 h-5 text-[#FF6B35]" /><b>EVEN IA</b><span className="text-xs text-stone-500">assistant vendeur</span><button onClick={toggleAI} disabled={llm !== true} title={llm === false ? "Ajoutez la clé ANTHROPIC_API_KEY dans Vercel pour activer l'IA avancée" : ""} className={`ml-auto text-xs px-3 py-1 rounded-full border disabled:opacity-60 ${useAI ? "bg-[#FF6B35] text-white border-[#FF6B35]" : "bg-white text-stone-600"}`}>{llm === null ? "IA avancée..." : llm === false ? "IA avancée : non configurée" : `IA avancée : ${pref ? "ON" : "OFF"}`}</button></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${m.from === "me" ? "bg-[#FF6B35] text-white" : "bg-white border"}`}>
              <Md text={m.text} />{m.streaming && <span className="animate-pulse text-[#FF6B35]">▍</span>}
              {m.plan && <div className="mt-3 space-y-1">{m.plan.map((a, k) => (
                <div key={k} className="text-xs flex gap-2"><span>{a.status === "done" ? "✅" : a.status === "error" ? "❌" : a.status === "running" ? "⏳" : "⬜"}</span>
                  <span>{a.label}{a.result ? " - " + a.result : ""}{a.error ? " - " + a.error : ""}</span></div>))}</div>}
              {m.cid && m.open && <div className="flex gap-2 mt-3"><button onClick={() => resolveConfirm(true)} className="text-xs px-4 py-1.5 rounded-full bg-[#FF6B35] text-white hover:bg-[#e05a2b]">Confirmer</button><button onClick={() => resolveConfirm(false)} className="text-xs px-4 py-1.5 rounded-full border hover:bg-stone-50">Refuser</button></div>}
              {m.cid && m.decision === "refused" && <div className="text-xs text-stone-500 mt-2">Annulé : rien n'a été modifié.</div>}
              {m.link && <Link to={m.link.to} className="text-xs text-[#FF6B35] underline mt-2 inline-block">{m.link.label}</Link>}
              {m.chips && i === msgs.length - 1 && <div className="flex flex-wrap gap-2 mt-3">{m.chips.map(c => { const lb = typeof c === "string" ? c : c.label, sd = typeof c === "string" ? c : c.send; return <button key={lb} onClick={() => send(sd)} className="text-xs px-3 py-1.5 rounded-full bg-[#FFF0E8] hover:bg-[#FF6B35] hover:text-white">{lb}</button>; })}</div>}
            </div>
          </div>
        ))}
        {busy && !last?.streaming && !last?.open && <div className="flex items-center gap-2 text-stone-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {agentBusy ? "EVEN IA réfléchit…" : "EVEN IA travaille..."}</div>}
        <div ref={endRef} />
      </div>
      {step?.media && (
        <div className="px-4 pb-2"><input ref={fileRef} type="file" accept={step.media === "image" ? "image/*" : "video/*"} className="hidden" onChange={onFile} />
          <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {step.media === "image" ? <ImageIcon className="w-4 h-4 mr-2" /> : <Video className="w-4 h-4 mr-2" />}Ajouter {step.media === "image" ? "une image" : "une video"}</Button></div>
      )}
      <div className="p-3 border-t bg-white flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ecrivez a EVEN IA..." disabled={busy} />
        {agentBusy
          ? <Button onClick={stopAgent} variant="outline">Arrêter</Button>
          : <Button onClick={() => send()} disabled={busy || !input.trim()} className="bg-[#FF6B35] hover:bg-[#e05a2b]"><Send className="w-4 h-4" /></Button>}
      </div>
    </div>
  );
}
