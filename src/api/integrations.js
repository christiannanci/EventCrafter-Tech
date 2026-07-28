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

// Envoi d'email reel via la fonction serverless Vercel (api/send-email.js -> Resend)
export const SendEmail = async ({ to, subject, body }) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('SendEmail failed:', data);
      return { success: false, error: data };
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('SendEmail error:', error);
    return { success: false, error: error.message };
  }
};

// Les integrations suivantes n'ont pas d'equivalent Supabase configure pour l'instant.
export const InvokeLLM = async () => {
  throw new Error('InvokeLLM n\'est pas encore disponible sur Supabase');
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
