import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setValidSession(true);
      }
      setCheckingSession(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      setCheckingSession(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!PASSWORD_REGEX.test(password)) {
      setError(t('auth.passwordRequirement'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/Login'), 2500);
    } catch (err) {
      setError(err.message || t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">{t('auth.invalidLink')}</h1>
          <p className="text-stone-500 mb-6 text-sm">
            {t('auth.invalidLinkDesc')}
          </p>
          <Button onClick={() => navigate('/Login')} className="bg-rose-600 hover:bg-rose-700 w-full">
            {t('auth.backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">{t('auth.passwordUpdated')}</h1>
          <p className="text-stone-500 text-sm">
            {t('auth.redirecting')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">
          {t('auth.newPasswordTitle')}
        </h1>
        <p className="text-stone-500 text-center mb-6 text-sm">
          {t('auth.newPasswordSubtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">{t('auth.newPassword')}</label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                tabIndex={-1}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {t('auth.passwordHint')}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700">{t('auth.confirmPassword')}</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
              required
              minLength={8}
              className="mt-1"
            />
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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.updating')}</>
            ) : (
              t('auth.updatePassword')
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
