-- DarboRitmas · 0016 · Telegram: vienkartiniai prijungimo kodai
-- Naudotojas programoje paspaudžia „Prijungti Telegram“, serveris sukuria vienkartinį kodą (saugoma tik jo maišos reikšmė),
-- o botas, gavęs /start <kodas>, įrašo chat_id į notification_channels. Lentelę mato tik serveris (service_role).
create table public.telegram_link_tokens (
  token_hash text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index telegram_link_tokens_user_idx on public.telegram_link_tokens (user_id);
alter table public.telegram_link_tokens enable row level security;   -- be politikų: tik service_role
revoke all on public.telegram_link_tokens from anon, authenticated;
