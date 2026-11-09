-- SANTECHNITAS PRO · 0002 · Prenumeratos, mokėjimai, Stripe įvykiai, prieigos tikrinimas
-- Rašo tik serveris (Stripe webhook per service_role). Naršyklė šių lentelių keisti negali.

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null unique references public.companies (id) on delete cascade,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  status                 text not null check (status in
    ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  plan_interval          text check (plan_interval in ('month', 'year')),
  seats                  integer not null default 1 check (seats >= 1),
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  stripe_invoice_id   text not null unique,
  amount_cents        integer not null check (amount_cents >= 0),
  currency            text not null default 'eur',
  status              text not null check (status in ('paid', 'failed', 'open', 'void', 'refunded')),
  hosted_invoice_url  text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index payments_company_idx on public.payments (company_id, created_at desc);

-- Webhook idempotencija: tas pats Stripe įvykis apdorojamas tik kartą.
create table public.stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

create trigger subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Vienintelis teisingas "ar įmonė turi prieigą" atsakymas. Naudojamas RLS ir serveryje.
-- Prieiga yra, jei: nemokama prieiga, galiojantis bandymas arba prenumerata trialing/active/past_due.
create function public.company_has_access(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.companies c
    where c.id = cid
      and (c.complimentary
           or c.trial_ends_at > now()
           or exists (select 1 from public.subscriptions s
                      where s.company_id = c.id and s.status in ('trialing', 'active', 'past_due')))
  )
$$;
revoke execute on function public.company_has_access(uuid) from public, anon;
grant  execute on function public.company_has_access(uuid) to authenticated;

alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;
alter table public.stripe_events enable row level security;

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_company_admin(company_id));
create policy payments_select on public.payments for select to authenticated
  using (public.is_company_admin(company_id));

revoke all on public.subscriptions, public.payments, public.stripe_events from anon, authenticated;
grant select on public.subscriptions, public.payments to authenticated;
