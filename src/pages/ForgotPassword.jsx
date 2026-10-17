import React, { useState } from 'react';
import { supabase } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('auth.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/ResetPassword`
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      // On ne revele jamais si l'email existe ou non (securite) :
      // on affiche le message de succes meme en cas d'erreur silencieuse de l'API,
      // sauf erreur reseau/technique reelle.
      if (err?.status && err.status >= 500) {
        setError(err.message || t('auth.genericError'));
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">{t('auth.resetEmailSentTitle')}</h1>
          <p className="text-stone-500 mb-6 text-sm">
            {t('auth.resetEmailSentDesc')} <span className="font-medium text-stone-700">{email}</span>
          </p>
          <Button onClick={() => navigate('/Login')} className="bg-rose-600 hover:bg-rose-700 w-full">
            {t('auth.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-stone-500 text-center mb-6 text-sm">
          {t('auth.forgotPasswordSubtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">{t('auth.email')}</label>
            <div className="relative mt-1">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.sending')}</>
            ) : (
              t('auth.sendResetLink')
            )}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/Login')}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-rose-600 pt-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('auth.backToLogin')}
          </button>
        </form>
      </div>
    </div>
  );
}
