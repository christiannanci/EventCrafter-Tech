import React, { useState } from 'react';
import { supabase } from '@/api/apiClient';
import { Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
  </svg>
);

// Connexion / inscription avec Google ou Facebook (Supabase OAuth).
// Les fournisseurs doivent être activés dans Supabase > Authentication > Providers.
export default function SocialAuthButtons({ next = '/' }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const go = async (provider) => {
    setErr('');
    setBusy(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${next.startsWith('/') ? next : '/'}` },
      });
      if (error) throw error;
      // la page est quittée vers le fournisseur
    } catch (e) {
      setBusy('');
      setErr(
        /not enabled|unsupported provider/i.test(e.message || '')
          ? "Cette méthode de connexion n'est pas encore disponible. Utilisez votre email."
          : e.message || 'Connexion impossible. Réessayez.'
      );
    }
  };

  const btn = 'w-full h-12 inline-flex items-center justify-center gap-3 rounded-md border border-stone-300 bg-white text-stone-700 font-medium hover:bg-stone-50 disabled:opacity-60';

  return (
    <div className="mt-5" data-testid="social-auth">
      <div className="flex items-center gap-3 text-xs text-stone-400 mb-4">
        <span className="flex-1 h-px bg-stone-200" />ou<span className="flex-1 h-px bg-stone-200" />
      </div>
      <div className="space-y-3">
        <button type="button" className={btn} disabled={!!busy} onClick={() => go('google')} data-testid="oauth-google">
          {busy === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}Continuer avec Google
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => go('facebook')} data-testid="oauth-facebook">
          {busy === 'facebook' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FacebookIcon />}Continuer avec Facebook
        </button>
      </div>
      {err && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-3">{err}</div>}
    </div>
  );
}
