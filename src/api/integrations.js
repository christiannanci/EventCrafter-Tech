// src/api/integrations.js
import { supabase } from './apiClient';

// Upload de fichiers -> implemente via Supabase Storage (bucket "uploads")
export const UploadFile = async ({ file }) => {
  if (!file) throw new Error('Aucun fichier fourni');
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const { error } = await supabase.storage.from('uploads').upload(fileName, file);
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return { file_url: data.publicUrl };
};

// Les integrations suivantes n'ont pas d'equivalent Supabase configure pour l'instant.
// Elles ne plantent plus au chargement du module (le crash venait de l'acces a
// base44.integrations.Core au niveau racine) - elles echouent seulement si on les appelle.
export const InvokeLLM = async () => {
  throw new Error('InvokeLLM n\'est pas encore disponible sur Supabase');
};

export const SendEmail = async (params) => {
  console.warn('SendEmail non configure - email non envoye:', params?.subject);
  return { success: false, skipped: true };
};


export const GenerateImage = async () => {
  throw new Error('GenerateImage n\'est pas encore disponible sur Supabase');
};

export const ExtractDataFromUploadedFile = async () => {
  throw new Error('ExtractDataFromUploadedFile n\'est pas encore disponible sur Supabase');
};

export const SendSMS = async () => {
  throw new Error('SendSMS n\'est pas disponible');
};
