-- TASKA schema reset total (PRD v0.3 + dbdiagram, 9 tabel + 11 enum + RLS + index)
-- CARA PAKAI: eksekusi manual di Supabase dashboard > SQL Editor (JANGAN via API).
-- File ini me-reset total: DROP lalu CREATE ulang. Data lama hilang.
-- Catatan: bila RLS menolak baca silang antar user = expected (isolasi user).

-- ============ RESET ============
drop table if exists notification_subscriptions cascade;
drop table if exists notification_settings cascade;
drop table if exists ai_assumptions cascade;
drop table if exists ai_actions cascade;
drop table if exists task_recommendations cascade;
drop table if exists ai_interactions cascade;
drop table if exists task_reminders cascade;
drop table if exists tasks cascade;
drop table if exists users cascade;

drop type if exists auth_provider cascade;
drop type if exists task_status cascade;
drop type if exists urgency_level cascade;
drop type if exists priority_level cascade;
drop type if exists value_source cascade;
drop type if exists time_precision cascade;
drop type if exists reminder_status cascade;
drop type if exists notification_type cascade;
drop type if exists ai_interaction_type cascade;
drop type if exists ai_action_type cascade;
drop type if exists ai_action_status cascade;

-- ============ ENUM ============
create type auth_provider as enum ('LOCAL', 'GOOGLE');
create type task_status as enum ('PENDING', 'COMPLETED', 'CANCELLED');
create type urgency_level as enum ('URGENT', 'NORMAL', 'LOW');
create type priority_level as enum ('HIGH', 'MEDIUM', 'LOW');
create type value_source as enum ('USER', 'AI', 'SYSTEM');
create type time_precision as enum ('EXACT', 'PERIOD', 'UNSPECIFIED');
create type reminder_status as enum ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
create type notification_type as enum ('IN_APP', 'BROWSER', 'PUSH');
create type ai_interaction_type as enum ('TASK_PARSING', 'TASK_PRIORITIZATION', 'ASSISTANT_CHAT', 'TASK_ACTION', 'PRODUCTIVITY_INSIGHT');
create type ai_action_type as enum ('CREATE_TASK', 'UPDATE_TASK', 'COMPLETE_TASK', 'CANCEL_TASK', 'DELETE_TASK');
create type ai_action_status as enum ('PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- ============ TABEL ============
-- users.id = auth.users(id) (diisi eksplisit dari JWT, tanpa default)
create table users (
  id uuid primary key,
  name varchar(100),
  email varchar(255) unique not null,
  password_hash varchar(255),
  auth_provider auth_provider not null default 'LOCAL',
  timezone varchar(100) not null default 'Asia/Jakarta',
  ai_consent boolean not null default false,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title varchar(255) not null,
  description text,
  source_text text,
  due_date date,
  due_time time,
  time_precision time_precision not null default 'UNSPECIFIED',
  duration_minutes int,
  duration_source value_source,
  urgency urgency_level not null default 'NORMAL',
  priority priority_level not null default 'MEDIUM',
  priority_source value_source not null default 'SYSTEM',
  status task_status not null default 'PENDING',
  ai_assumption text,
  completed_at timestamp,
  cancelled_at timestamp,
  deleted_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table task_reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  reminder_at timestamp not null,
  notification_type notification_type not null default 'IN_APP',
  status reminder_status not null default 'PENDING',
  sent_at timestamp,
  failed_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  task_id uuid,
  interaction_type ai_interaction_type not null,
  model varchar(100),
  input_text text,
  response_text text,
  latency_ms int,
  success boolean not null default true,
  error_code varchar(100),
  error_message text,
  created_at timestamp not null default now()
);

create table task_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  task_id uuid not null,
  recommendation_order int not null,
  reason text,
  generated_by varchar(100),
  created_at timestamp not null default now()
);

create table ai_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  task_id uuid,
  action_type ai_action_type not null,
  status ai_action_status not null default 'PENDING',
  request_text text,
  action_payload json,
  result_message text,
  error_message text,
  confirmed_at timestamp,
  completed_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table ai_assumptions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  field_name varchar(100) not null,
  assumption_text text not null,
  confidence decimal(5,4),
  created_at timestamp not null default now()
);

create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  enabled boolean not null default false,
  default_reminder_minutes int not null default 5,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  notification_type notification_type not null,
  endpoint text,
  subscription_data json,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- ============ RLS ============
alter table users enable row level security;
alter table tasks enable row level security;
alter table task_reminders enable row level security;
alter table ai_interactions enable row level security;
alter table task_recommendations enable row level security;
alter table ai_actions enable row level security;
alter table ai_assumptions enable row level security;
alter table notification_settings enable row level security;
alter table notification_subscriptions enable row level security;

drop policy if exists "users_owner" on users;
create policy "users_owner" on users for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "tasks_owner" on tasks;
create policy "tasks_owner" on tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "task_reminders_owner" on task_reminders;
create policy "task_reminders_owner" on task_reminders for all
  using (exists (select 1 from tasks where tasks.id = task_reminders.task_id and tasks.user_id = auth.uid()))
  with check (exists (select 1 from tasks where tasks.id = task_reminders.task_id and tasks.user_id = auth.uid()));

drop policy if exists "ai_interactions_owner" on ai_interactions;
create policy "ai_interactions_owner" on ai_interactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "task_recommendations_owner" on task_recommendations;
create policy "task_recommendations_owner" on task_recommendations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_actions_owner" on ai_actions;
create policy "ai_actions_owner" on ai_actions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_assumptions_owner" on ai_assumptions;
create policy "ai_assumptions_owner" on ai_assumptions for all
  using (exists (select 1 from tasks where tasks.id = ai_assumptions.task_id and tasks.user_id = auth.uid()))
  with check (exists (select 1 from tasks where tasks.id = ai_assumptions.task_id and tasks.user_id = auth.uid()));

drop policy if exists "notification_settings_owner" on notification_settings;
create policy "notification_settings_owner" on notification_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notification_subscriptions_owner" on notification_subscriptions;
create policy "notification_subscriptions_owner" on notification_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ INDEX ============
create index if not exists tasks_user_due on tasks(user_id, due_date);
