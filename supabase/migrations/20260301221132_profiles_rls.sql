-- Create profiles table
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'user' check (role in ('user', 'admin')),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: users can view their own profile
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

-- Policy: users can update their own profile
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Policy: admins can view all profiles
create policy "Admins can view all profiles"
    on public.profiles for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- Create trigger function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, role)
    values (new.id, 'user');
    return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();