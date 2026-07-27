import React, { useState } from 'react';
import { supabase } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MailCheck } from 'lucide-react';

// Mot de passe : au moins 8 caractères, une majuscule, une minuscule, un chiffre
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Téléphone camerounais : +237 suivi de 9 chiffres (ou format local 6XXXXXXXX / 2XXXXXXXX)
const PHONE_REGEX = /^(\+237)?[26]\d{8}$/;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const validateRegistration = () => {
    if (!PASSWORD_REGEX.test(password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.');
      return false;
    }
    const cleanedPhone = phone.replace(/\s/g, '');
    if (!PHONE_REGEX.test(cleanedPhone)) {
      setError('Veuillez saisir un numéro de téléphone camerounais valide (ex: 670934378 ou +237670934378).');
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
      setMessage("Email de confirmation renvoyé ! Vérifiez votre boîte de réception (et vos spams).");
    } catch (err) {
      setError(err.message || "Impossible de renvoyer l'email");
    } finally {
      setResending(false);
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
        const cleanedPhone = phone.replace(/\s/g, '');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: cleanedPhone,
            },
            // Redirige directement vers la sélection de profil après confirmation
            emailRedirectTo: `${window.location.origin}/ProfileSelection`,
          },
        });
        if (signUpError) throw signUpError;

        if (data.user && !data.session) {
          setMessage('Compte créé ! Vérifiez votre email pour confirmer votre inscription et accéder à votre tableau de bord.');
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
          // Supabase renvoie ce message précis quand l'email n'est pas encore confirmé
          if (signInError.message?.toLowerCase().includes('email not confirmed')) {
            setNeedsConfirmation(true);
            setError("Votre email n'est pas encore confirmé. Vérifiez votre boîte de réception.");
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
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">
          {isRegister ? 'Créer un compte' : 'Connexion'}
        </h1>
        <p className="text-stone-500 text-center mb-6">
          {isRegister ? 'Rejoignez EventCrafter' : 'Bienvenue sur EventCrafter'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="text-sm font-medium text-stone-700">Numéro de téléphone</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="670 93 43 78"
                required
                className="mt-1"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-stone-700">Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="mt-1"
            />
            {isRegister && (
              <p className="text-xs text-stone-400 mt-1">
                Au moins 8 caractères, une majuscule, une minuscule et un chiffre.
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...</>
              ) : (
                "Renvoyer l'email de confirmation"
              )}
            </Button>
          )}

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
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setMessage('');
              setNeedsConfirmation(false);
            }}
            className="text-rose-600 font-medium hover:underline"
          >
            {isRegister ? 'Se connecter' : "S'inscrire"}
          </button>
        </p>
      </div>
    </div>
  );
}