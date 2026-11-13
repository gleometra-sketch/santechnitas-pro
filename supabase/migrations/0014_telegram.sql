-- SANTECHNITAS PRO · 0014 · Telegram: administratorių susiejimas su botu
-- Rašo tik serveris (service_role). Naršyklė gali tik pamatyti, ar jos paskyra prijungta.

-- Vienkartiniai prijungimo kodai. Saugomas tik SHA-256 maiša, todėl nutekėjus lentelei kodais pasinaudoti nepavyks.
create table public.telegram_link_tokens (
  token_hash text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index telegram_link_tokens_expires_idx on public.telegram_link_tokens (expires_at);

-- Prijungti pokalbiai: vienas naudotojas, viena įmonė, vienas Telegram pokalbis.
create table public.telegram_links (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  company_id        uuid not null references public.companies (id) on delete cascade,
  chat_id           bigint not null,
  telegram_username text check (char_length(telegram_username) <= 64),
  -- Išjungtos pranešimų kategorijos (pvz. 'darbas'). Tuščias masyvas = gauna viską.
  muted             text[] not null default '{}',
  created_at        timestamptz not null default now(),
  unique (user_id, company_id),
  unique (company_id, chat_id)
);

alter table public.telegram_link_tokens enable row level security;
alter table public.telegram_links       enable row level security;

-- Naudotojas mato tik savo prijungimą (rodyti „Prijungta“ valdymo skiltyje).
create policy telegram_links_select_own on public.telegram_links for select to authenticated
  using (user_id = auth.uid());

revoke all on public.telegram_link_tokens, public.telegram_links from anon, authenticated;
grant select on public.telegram_links to authenticated;
