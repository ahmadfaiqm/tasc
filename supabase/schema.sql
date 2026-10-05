create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama text not null,
  tenggat timestamptz not null,
  urgensi text not null default 'Santai' check (urgensi in ('Mendesak','Sedang','Santai')),
  selesai boolean not null default false,
  reminded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tasks enable row level security;
drop policy if exists "tasks_owner" on tasks;
create policy "tasks_owner" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists tasks_user_tenggat on tasks(user_id, tenggat);
