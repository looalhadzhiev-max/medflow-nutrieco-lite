-- Commit 15 – patient_files + Storage bucket/policies

-- 1) DB table
create table if not exists public.patient_files (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,

  bucket_id text not null default 'patient-files',
  storage_path text not null,          -- e.g. <patientId>/<rand>_filename.pdf
  original_name text not null,
  mime_type text,
  size_bytes bigint,

  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists patient_files_patient_id_created_at_idx
on public.patient_files (patient_id, created_at desc);

alter table public.patient_files enable row level security;

drop policy if exists "pf_select_owner_or_admin" on public.patient_files;
drop policy if exists "pf_insert_owner_or_admin" on public.patient_files;
drop policy if exists "pf_delete_owner_or_admin" on public.patient_files;

create policy "pf_select_owner_or_admin"
on public.patient_files
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

create policy "pf_insert_owner_or_admin"
on public.patient_files
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

create policy "pf_delete_owner_or_admin"
on public.patient_files
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

-- 2) Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

-- Helper expression: extract patient uuid from storage path "<patientId>/<...>"
-- We'll inline it with CASE+regex in policies to avoid cast errors.

-- 3) Storage policies on storage.objects
-- NOTE: storage.objects already has RLS enabled in Supabase.

drop policy if exists "patient_files_storage_select" on storage.objects;
drop policy if exists "patient_files_storage_insert" on storage.objects;
drop policy if exists "patient_files_storage_delete" on storage.objects;

create policy "patient_files_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient-files'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.patients p
      where p.id = (
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
          else null
        end
      )
      and p.nutritionist_id = auth.uid()
    )
  )
);

create policy "patient_files_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'patient-files'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.patients p
      where p.id = (
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
          else null
        end
      )
      and p.nutritionist_id = auth.uid()
    )
  )
);

create policy "patient_files_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'patient-files'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.patients p
      where p.id = (
        case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then split_part(name, '/', 1)::uuid
          else null
        end
      )
      and p.nutritionist_id = auth.uid()
    )
  )
);