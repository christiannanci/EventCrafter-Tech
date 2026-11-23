import React, { useState } from 'react';
import { supabase } from '@/api/apiClient';
import { Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1C3.4 21.4 7.4 24 12 24z" />
    <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5h-4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1c.9-2.8 3.5-4.8 6.6-4.8z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#ffffff" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
  </svg>
);

export default function SocialAuthButtons({ onError }) {
  const [pending, setPending] = useState(null);

  const signIn = async (provider) => {
    setPending(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/ProfileSelection` },
    });
    if (error) {
      onError?.(error.message);
      setPending(null);
    }
  };

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-xs text-stone-400">ou</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => signIn('google')}
          disabled={!!pending}
          className="w-full h-12 flex items-center justify-center gap-3 rounded-md border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-50 disabled:opacity-60"
        >
          {pending === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          Continuer avec Gmail
        </button>
        <button
          type="button"
          onClick={() => signIn('facebook')}
          disabled={!!pending}
          className="w-full h-12 flex items-center justify-center gap-3 rounded-md bg-[#1877F2] text-white font-medium hover:bg-[#166FE5] disabled:opacity-60"
        >
          {pending === 'facebook' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FacebookIcon />}
          Continuer avec Facebook
        </button>
      </div>
    </div>
  );
}
