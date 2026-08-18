import { supabase } from '@/api/apiClient';

// Cle publique VAPID - a definir dans .env comme VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Convertit la cle VAPID (base64 URL-safe) au format Uint8Array attendu par PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Demande la permission de notification et abonne l'utilisateur aux push.
 * L'abonnement (endpoint + cles) est stocke dans Supabase (table push_subscriptions)
 * pour que le serveur puisse ensuite envoyer de vraies notifications via web-push.
 * A appeler une fois l'utilisateur connu (ex: dans Layout.jsx apres base44.auth.me()).
 */
export async function subscribeToPush(userId) {
  if (!userId) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY manquant - abonnement push ignore');
    return;
  }

  try {
    // Ne redemande pas si deja refuse explicitement par l'utilisateur
    if (Notification.permission === 'denied') return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const { endpoint, keys } = subscription.toJSON();

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Erreur enregistrement abonnement push:', error);
    }
  } catch (e) {
    console.error('Erreur abonnement push:', e);
  }
}
