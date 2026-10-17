import React, { useState } from 'react';
import { supabase } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+?237)?6\d{8}$/; // mobile camerounais : 6XXXXXXXX

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Vérification de la conformité des champs (boucle du diagramme)
  const validateFields = () => {
    const errors = [];
    if (!EMAIL_REGEX.test(email)) errors.push("L'adresse email n'est pas valide.");
    if (password.length < 8) errors.push('Le mot de passe doit contenir au moins 8 caractères.');
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre et un chiffre.');
    }
    if (password !== confirmPassword) errors.push('Les mots de passe ne correspondent pas.');
    if (!PHONE_REGEX.test(phone.replace(/[\s.-]/g, ''))) {
      errors.push('Le numéro de téléphone doit être un mobile camerounais valide (ex : 6 70 00 00 00).');
    }
    return errors;
  };

  const goAfterLogin = async (userId) => {
    const { data: appUser } = await supabase
      .from('app_user')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (appUser?.role === 'admin') {
      navigate('/AdminDashboard');
    } else {
      const nextUrl = new URLSearchParams(window.location.search).get('next') || '/';
      navigate(nextUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setFieldErrors([]);

    if (isRegister) {
      const errors = validateFields();
      if (errors.length > 0) {
        setFieldErrors(errors); // renvoi du formulaire avec les erreurs
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        const cleanPhone = phone.replace(/[\s.-]/g, '');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { phone: cleanPhone } },
        });
        if (signUpError) throw signUpError;

        // Email déjà utilisé : Supabase renvoie un utilisateur sans identité
        if (data.user && data.user.identities?.length === 0) {
          setError('Un compte existe déjà avec cet email.');
          return;
        }

        if (data.session) {
          navigate('/ProfileSelection'); // confirmation email désactivée
        } else {
          setStep('code'); // envoi du code de confirmation par email
          setMessage(`Un code de confirmation a été envoyé à ${email}.`);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message?.toLowerCase().includes('not confirmed')) {
            await supabase.auth.resend({ type: 'signup', email });
            setStep('code');
            setMessage("Votre email n'est pas encore confirmé. Un nouveau code vient de vous être envoyé.");
            return;
          }
          throw signInError;
        }
        await goAfterLogin(data.user.id);
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup',
      });

      if (verifyError) {
        // Branche « code incorrect » : code invalide puis renvoi du formulaire
        setError('Code invalide ou expiré. Vérifiez le code ou demandez-en un nouveau.');
        setCode('');
        return;
      }

      navigate('/ProfileSelection'); // inscription réussie, ouverture de la session
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    if (resendError) setError(resendError.message);
    else setMessage('Un nouveau code a été envoyé.');
  };

  if (step === 'code') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">Confirmez votre email</h1>
          <p className="text-stone-500 text-center mb-6">Saisissez le code reçu à l'adresse {email}</p>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Code à 6 chiffres"
              inputMode="numeric"
              maxLength={8}
              required
              className="text-center text-2xl tracking-widest"
            />

            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
            {message && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">{message}</div>}

            <Button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Vérification...</> : 'Valider le code'}
            </Button>
          </form>

          <div className="flex justify-between text-sm mt-4">
            <button type="button" onClick={handleResend} className="text-rose-600 hover:underline">
              Renvoyer le code
            </button>
            <button
              type="button"
              onClick={() => { setStep('form'); setCode(''); setError(''); setMessage(''); }}
              className="text-stone-500 hover:underline"
            >
              Modifier l'email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">
          {isRegister ? 'Créer un compte' : 'Connexion'}
        </h1>
        <p className="text-stone-500 text-center mb-6">
          {isRegister ? 'Rejoignez EventCrafter' : 'Bienvenue sur EventCrafter'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="text-sm font-medium text-stone-700">Email</label>
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
              <label className="text-sm font-medium text-stone-700">Téléphone</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="6 70 00 00 00"
                required
                className="mt-1"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-700">Mot de passe</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => navigate('/ForgotPassword')}
                  className="text-xs text-rose-600 hover:underline"
                  tabIndex={-1}
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="text-sm font-medium text-stone-700">Confirmer le mot de passe</label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {fieldErrors.length > 0 && (
            <ul className="bg-red-50 text-red-600 text-sm p-3 rounded-lg list-disc list-inside space-y-1">
              {fieldErrors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          )}
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          {message && <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">{message}</div>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement...</>
            ) : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </Button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); setMessage(''); setFieldErrors([]); }}
            className="text-rose-600 font-medium hover:underline"
          >
            {isRegister ? 'Se connecter' : "S'inscrire"}
          </button>
        </p>
      </div>
    </div>
  );
}
