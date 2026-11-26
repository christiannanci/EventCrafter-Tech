import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Check, MessageCircle, Facebook, Instagram } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

// Lien de partage : passe par /api/share pour que Facebook / WhatsApp affichent
// le titre, la photo et la description du service (la page redirige ensuite vers la fiche).
export function serviceShareUrl(service) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.eventcraftercm.com";
  return `${origin}/api/share?id=${encodeURIComponent(service.id)}`;
}

const T = {
  fr: {
    title: "Partager ce service",
    pubTitle: "🎉 Votre service est en ligne !",
    pubDesc: "Faites-le connaître maintenant : partagez-le sur Facebook et Instagram pour recevoir vos premières demandes.",
    later: "Plus tard",
    desc: "Partagez votre service sur vos réseaux pour recevoir plus de demandes.",
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    native: "Autres applications…",
    copy: "Copier le lien",
    copied: "Lien copié",
    igTitle: "Instagram",
    igText: "Instagram ne permet pas de publier un lien depuis un site. Copiez la légende ci-dessous, puis publiez-la avec la photo de votre service (ou ajoutez le lien dans votre story ou votre bio).",
    igCopy: "Copier la légende",
    igOpen: "Ouvrir Instagram",
    caption: (t, url) => `✨ ${t}\nDécouvrez mon service sur EventCrafter :\n${url}\n#EventCrafter #Cameroun #Evenement`,
    share: (t) => `Découvrez « ${t} » sur EventCrafter`,
  },
  en: {
    title: "Share this service",
    pubTitle: "🎉 Your service is live!",
    pubDesc: "Spread the word now: share it on Facebook and Instagram to get your first requests.",
    later: "Later",
    desc: "Share your service on your networks to get more requests.",
    facebook: "Facebook",
    whatsapp: "WhatsApp",
    native: "Other apps…",
    copy: "Copy link",
    copied: "Link copied",
    igTitle: "Instagram",
    igText: "Instagram does not allow posting a link from a website. Copy the caption below, then post it with your service photo (or add the link to your story or bio).",
    igCopy: "Copy caption",
    igOpen: "Open Instagram",
    caption: (t, url) => `✨ ${t}\nDiscover my service on EventCrafter:\n${url}\n#EventCrafter #Cameroon #Events`,
    share: (t) => `Discover "${t}" on EventCrafter`,
  },
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ShareServiceDialog({ service, open, onOpenChange, justPublished = false }) {
  const lang = useLanguage()?.language === "en" ? "en" : "fr";
  const t = T[lang];
  const [copied, setCopied] = useState("");
  if (!service) return null;

  const url = serviceShareUrl(service);
  const text = t.share(service.title);
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const flash = (k) => { setCopied(k); setTimeout(() => setCopied(""), 2000); };
  const doCopy = async (k, value) => { if (await copyText(value)) flash(k); };
  const doNative = async () => {
    try { await navigator.share({ title: service.title, text, url }); } catch { /* annule */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{!justPublished && <Share2 className="w-5 h-5" />}{justPublished ? t.pubTitle : t.title}</DialogTitle>
          <DialogDescription>{justPublished ? t.pubDesc : t.desc}</DialogDescription>
        </DialogHeader>

        <p className="text-sm font-medium text-stone-800 truncate">{service.title}</p>

        <div className="grid grid-cols-2 gap-2">
          <a href={fb} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1877F2] text-white text-sm font-semibold px-3 py-2.5 hover:opacity-90">
            <Facebook className="w-4 h-4" />{t.facebook}
          </a>
          <a href={wa} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] text-white text-sm font-semibold px-3 py-2.5 hover:opacity-90">
            <MessageCircle className="w-4 h-4" />{t.whatsapp}
          </a>
          <Button type="button" variant="outline" onClick={() => doCopy("link", url)} className="gap-2">
            {copied === "link" ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
            {copied === "link" ? t.copied : t.copy}
          </Button>
          {canNative && (
            <Button type="button" variant="outline" onClick={doNative} className="gap-2">
              <Share2 className="w-4 h-4" />{t.native}
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Instagram className="w-4 h-4 text-[#E1306C]" />{t.igTitle}
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">{t.igText}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-2"
              onClick={() => doCopy("ig", t.caption(service.title, url))}>
              {copied === "ig" ? <Check className="w-4 h-4 text-green-600" /> : <Instagram className="w-4 h-4" />}
              {copied === "ig" ? t.copied : t.igCopy}
            </Button>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-stone-200 bg-white text-sm px-3 py-1.5 hover:bg-stone-100">
              {t.igOpen}
            </a>
          </div>
        </div>

        {justPublished && (
          <Button type="button" variant="ghost" className="w-full text-stone-500" onClick={() => onOpenChange(false)}>{t.later}</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
