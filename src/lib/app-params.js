// app-params.js — Remplacé par Supabase
// Ce fichier est conservé pour la compatibilité avec les imports existants
// mais n'est plus utilisé activement — Supabase gère l'auth et la config

export const appParams = {
	appId: null,
	serverUrl: null,
	token: null,
	fromUrl: typeof window !== 'undefined' ? window.location.href : '',
	functionsVersion: null,
  };