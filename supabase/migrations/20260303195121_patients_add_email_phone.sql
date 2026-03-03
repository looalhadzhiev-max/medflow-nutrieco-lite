alter table public.patients
add column if not exists email text,
add column if not exists phone text;