-- Patients table
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful index
create index if not exists patients_owner_id_idx on public.patients(owner_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.patients enable row level security;

-- Policies:
-- 1) select own or admin
drop policy if exists "patients_select_own_or_admin" on public.patients;
create policy "patients_select_own_or_admin"
on public.patients
for select
to authenticated
using (owner_id = auth.uid() or public.is_admin());

-- 2) insert own (admin can also insert for anyone if needed; you can decide)
drop policy if exists "patients_insert_own_or_admin" on public.patients;
create policy "patients_insert_own_or_admin"
on public.patients
for insert
to authenticated
with check (owner_id = auth.uid() or public.is_admin());

-- 3) update own or admin
drop policy if exists "patients_update_own_or_admin" on public.patients;
create policy "patients_update_own_or_admin"
on public.patients
for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

-- 4) delete own or admin
drop policy if exists "patients_delete_own_or_admin" on public.patients;
create policy "patients_delete_own_or_admin"
on public.patients
for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());