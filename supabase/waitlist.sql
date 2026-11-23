-- Liste d'attente EventCrafter (phase de recrutement)
-- À exécuter une fois dans Supabase : SQL Editor > New query > Run.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text,
  email       text,
  phone       text,
  city        text,
  article     text,                 -- numéro de l'article d'origine (01 à 25)
  source      text default 'direct',
  language    text default 'fr',
  constraint waitlist_contact_chk check (email is not null or phone is not null),
  constraint waitlist_len_chk check (
    coalesce(length(name), 0) <= 60 and coalesce(length(email), 0) <= 254
    and coalesce(length(phone), 0) <= 20 and coalesce(length(city), 0) <= 60
    and coalesce(length(source), 0) <= 30
  )
);

-- Une même adresse email ou un même numéro ne s'inscrit qu'une fois.
create unique index if not exists waitlist_email_uq on public.waitlist (lower(email)) where email is not null;
create unique index if not exists waitlist_phone_uq on public.waitlist (phone) where phone is not null;

alter table public.waitlist enable row level security;

-- Tout visiteur peut s'inscrire (insertion seulement).
drop policy if exists "waitlist_insert_public" on public.waitlist;
create policy "waitlist_insert_public" on public.waitlist
  for insert to anon, authenticated
  with check (true);

-- Seuls les administrateurs peuvent lire la liste (même règle que l'application : app_user.role = 'admin').
drop policy if exists "waitlist_select_admin" on public.waitlist;
create policy "waitlist_select_admin" on public.waitlist
  for select to authenticated
  using (exists (select 1 from public.app_user u where u.id = auth.uid() and u.role = 'admin'));
