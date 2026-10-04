create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nama text not null,
  tenggat timestamptz not null,
  urgensi text not null check (urgensi in ('mendesak','sedang','santai')),
  selesai boolean not null default false,
  reminded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_tenggat_idx on public.tasks (user_id, tenggat);

create table if not exists public.push_subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, subscription)
);

alter table public.tasks enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "tasks milik sendiri" on public.tasks;
create policy "tasks milik sendiri" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push milik sendiri" on public.push_subscriptions;
create policy "push milik sendiri" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
