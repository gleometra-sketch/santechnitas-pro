-- DarboRitmas · 0021 · Paddle mokėjimai
-- Lentelės buvo paruoštos Stripe (0002), bet jos nenaudotos. Pervadiname stulpelius į tiekėjui neutralius pavadinimus
-- ir pridedame Paddle laukus. Rašo tik serveris (Paddle webhook per service_role); naršyklė keisti negali (RLS 0002).

alter table public.subscriptions rename column stripe_customer_id     to provider_customer_id;
alter table public.subscriptions rename column stripe_subscription_id to provider_subscription_id;
alter table public.subscriptions
  add column if not exists provider      text not null default 'paddle',
  add column if not exists price_id      text,           -- Paddle kainos ID (pri_...)
  add column if not exists last_event_at timestamptz;    -- naujausio apdoroto Paddle įvykio laikas (apsauga nuo pavėluotų įvykių)

alter table public.payments rename column stripe_invoice_id to provider_transaction_id;  -- Paddle transakcija (txn_...)

alter table public.stripe_events rename to billing_events;  -- webhook idempotencija (įvykio ID)
