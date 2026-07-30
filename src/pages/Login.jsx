import React, { useState } from 'react';
import { supabase } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MailCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import { useLanguage } from '@/components/LanguageContext';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const validateRegistration = () => {
    if (!PASSWORD_REGEX.test(password)) {
      setError(t('auth.passwordRequirement'));
      return false;
    }
    return true;
  };

  const handleResendConfirmation = async () => {
    setResending(true);
    setError('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/ProfileSelection`,
        },
      });
      if (resendError) throw resendError;
      setMessage(t('auth.confirmationResent'));
    } catch (err) {
      setError(err.message || t('auth.genericError'));
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setSendingReset(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/ResetPassword`,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(err.message || t('auth.genericError'));
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setNeedsConfirmation(false);

    if (isRegister && !validateRegistration()) {
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const cleanedPhone = phone.replace(/\s+/g, ' ').trim();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: cleanedPhone,
            },
            emailRedirectTo: `${window.location.origin}/ProfileSelection`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.user && !data.session) {
          setMessage(t('auth.accountCreated'));
          setNeedsConfirmation(true);
        } else {
          navigate('/ProfileSelection');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message?.toLowerCase().includes('email not confirmed')) {
            setNeedsConfirmation(true);
            setError(t('auth.emailNotConfirmed'));
          } else {
            throw signInError;
          }
          return;
        }

        const userId = data.user.id;
        const { data: appUser, error: appUserError } = await supabase
          .from('app_user')
          .select('role, staff_role')
          .eq('id', userId)
          .single();

        const hasStaffAccess = appUser?.staff_role && appUser.staff_role !== 'none';

        if (!appUserError && (appUser?.role === 'admin' || hasStaffAccess)) {
          navigate('/AdminDashboard');
        } else {
          const nextUrl = new URLSearchParams(window.location.search).get('next') || '/';
          navigate(nextUrl);
        }
      }
    } catch (err) {
      setError(err.message || t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <button
            type="button"
            onClick={() => { setShowForgotPassword(false); setResetSent(false); setError(''); }}
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> {t('auth.backToLogin')}
          </button>

          <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">
            {t('auth.forgotPasswordTitle')}
          </h1>

          {resetSent ? (
            <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg flex items-start gap-2 mt-6">
              <MailCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                {t('auth.resetSentPrefix')} <strong>{forgotEmail}</strong>, {t('auth.resetSentSuffix')}
              </span>
            </div>
          ) : (
            <>
              <p className="text-stone-500 text-center mb-6 text-sm">
                {t('auth.forgotPasswordSubtitle')}
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-stone-700">{t('auth.email')}</label>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
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
                  disabled={sendingReset}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12"
                >
                  {sendingReset ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.sending')}</>
                  ) : (
                    t('auth.sendResetLink')
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">
          {isRegister ? t('auth.registerTitle') : t('auth.loginTitle')}
        </h1>
        <p className="text-stone-500 text-center mb-6">
          {isRegister ? t('auth.registerSubtitle') : t('auth.loginSubtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700">{t('auth.email')}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="mt-1"
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-sm font-medium text-stone-700">{t('auth.phoneOptional')}</label>
              <div className="mt-1">
                <PhoneInput value={phone} onChange={setPhone} />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-700">{t('auth.password')}</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              )}
            </div>
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
            {isRegister && (
              <p className="text-xs text-stone-400 mt-1">
                {t('auth.passwordHint')}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-start gap-2">
              <MailCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {needsConfirmation && (
            <Button
              type="button"
              variant="outline"
              onClick={handleResendConfirmation}
              disabled={resending || !email}
              className="w-full"
            >
              {resending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.sending')}</>
              ) : (
                t('auth.resendConfirmation')
              )}
            </Button>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('auth.loading')}</>
            ) : isRegister ? t('auth.createAccountButton') : t('auth.signInButton')}
          </Button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          {isRegister ? t('auth.alreadyHaveAccount') : t('auth.noAccount')}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setMessage('');
              setNeedsConfirmation(false);
            }}
            className="text-rose-600 font-medium hover:underline"
          >
            {isRegister ? t('auth.signInLink') : t('auth.signUpLink')}
          </button>
        </p>
      </div>
    </div>
  );
}
