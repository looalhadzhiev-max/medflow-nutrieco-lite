-- Commit 12 – Patients ownership + RLS refactor

-- 0) allow nutritionist role in profiles (if not already)
alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('admin', 'nutritionist', 'user'));

-- 1) Add ownership column to patients
alter table public.patients
add column if not exists nutritionist_id uuid;

-- FK (safe if already exists)
alter table public.patients
drop constraint if exists patients_nutritionist_id_fkey;

alter table public.patients
add constraint patients_nutritionist_id_fkey
foreign key (nutritionist_id)
references public.profiles(id)
on delete set null;

create index if not exists patients_nutritionist_id_idx
on public.patients (nutritionist_id);

-- 2) Admin helper
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3) RLS + Policies
alter table public.patients enable row level security;

drop policy if exists "patients_select_owner_or_admin" on public.patients;
drop policy if exists "patients_insert_owner_or_admin" on public.patients;
drop policy if exists "patients_update_owner_or_admin" on public.patients;
drop policy if exists "patients_delete_owner_or_admin" on public.patients;

create policy "patients_select_owner_or_admin"
on public.patients
for select
to authenticated
using (
  public.is_admin() OR nutritionist_id = auth.uid()
);

create policy "patients_insert_owner_or_admin"
on public.patients
for insert
to authenticated
with check (
  public.is_admin() OR nutritionist_id = auth.uid()
);

create policy "patients_update_owner_or_admin"
on public.patients
for update
to authenticated
using (
  public.is_admin() OR nutritionist_id = auth.uid()
)
with check (
  public.is_admin() OR nutritionist_id = auth.uid()
);

create policy "patients_delete_owner_or_admin"
on public.patients
for delete
to authenticated
using (
  public.is_admin() OR nutritionist_id = auth.uid()
);