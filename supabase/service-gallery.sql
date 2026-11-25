-- Galerie photos des services (regle "3 photos minimum").
-- A executer UNE FOIS dans Supabase > SQL Editor, AVANT de deployer le code.
alter table public.service
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb;

-- Rafraichit le cache de l'API pour que la nouvelle colonne soit reconnue tout de suite
notify pgrst, 'reload schema';
