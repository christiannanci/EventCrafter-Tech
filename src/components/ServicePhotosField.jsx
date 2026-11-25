import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ImagePlus, Loader2, Star, X } from "lucide-react";
import { MIN_SERVICE_PHOTOS, MAX_SERVICE_PHOTOS } from "@/lib/servicePhotos";

// Champ "photos du service" : la 1re photo est la couverture, les autres forment la galerie.
// value = { image_url, gallery_urls } ; onChange recoit le meme objet ; onUploadFile(file) -> url
export default function ServicePhotosField({ value, onChange, onUploadFile }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const photos = [value?.image_url, ...(Array.isArray(value?.gallery_urls) ? value.gallery_urls : [])].filter(Boolean);
  const enough = photos.length >= MIN_SERVICE_PHOTOS;

  const emit = (arr) => onChange({ image_url: arr[0] || "", gallery_urls: arr.slice(1) });

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_SERVICE_PHOTOS - photos.length);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    let current = [...photos];
    try {
      for (const f of files) {
        const url = await onUploadFile(f);
        if (url) { current = [...current, url]; emit(current); }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-stone-600">Photos du service *</label>
        <span className={`text-xs font-semibold ${enough ? "text-green-600" : "text-rose-600"}`}>
          {photos.length}/{MIN_SERVICE_PHOTOS} minimum
        </span>
      </div>
      <p className="text-xs text-stone-500">
        Ajoutez au moins {MIN_SERVICE_PHOTOS} photos : votre service ne sera affiche sur la marketplace qu'avec {MIN_SERVICE_PHOTOS} photos ou plus. La 1re est l'image de couverture.
      </p>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Couverture</span>
              )}
              {i > 0 && (
                <button type="button" title="Definir comme couverture" aria-label="Definir comme couverture"
                  onClick={() => emit([url, ...photos.filter((_, k) => k !== i)])}
                  className="absolute bottom-1 left-1 bg-white/90 hover:bg-white text-amber-600 rounded p-1">
                  <Star className="w-3 h-3" />
                </button>
              )}
              <button type="button" title="Retirer" aria-label="Retirer cette photo"
                onClick={() => emit(photos.filter((_, k) => k !== i))}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      <Button type="button" variant="outline" className="w-full" disabled={busy || photos.length >= MAX_SERVICE_PHOTOS}
        onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
        {busy ? "Telechargement..." : photos.length >= MAX_SERVICE_PHOTOS ? `Maximum ${MAX_SERVICE_PHOTOS} photos` : "Ajouter des photos"}
      </Button>
      {enough && <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {photos.length} photos ajoutees</div>}
    </div>
  );
}
