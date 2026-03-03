-- Commit 13 – patient_measurements table + RLS

create table if not exists public.patient_measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  taken_at timestamptz not null default now(),

  weight_kg numeric,
  height_cm numeric,
  waist_cm numeric,

  notes text,

  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists patient_measurements_patient_id_taken_at_idx
on public.patient_measurements (patient_id, taken_at desc);

alter table public.patient_measurements enable row level security;

drop policy if exists "pm_select_owner_or_admin" on public.patient_measurements;
drop policy if exists "pm_insert_owner_or_admin" on public.patient_measurements;
drop policy if exists "pm_update_owner_or_admin" on public.patient_measurements;
drop policy if exists "pm_delete_owner_or_admin" on public.patient_measurements;

create policy "pm_select_owner_or_admin"
on public.patient_measurements
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.nutritionist_id = auth.uid()
  )
);

create policy "pm_insert_owner_or_admin"
on public.patient_measurements
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.nutritionist_id = auth.uid()
  )
);

create policy "pm_update_owner_or_admin"
on public.patient_measurements
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.nutritionist_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.nutritionist_id = auth.uid()
  )
);

create policy "pm_delete_owner_or_admin"
on public.patient_measurements
for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.nutritionist_id = auth.uid()
  )
);