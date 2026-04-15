create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_public boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now()
);

alter table public.rooms enable row level security;

create policy "Rooms are readable by everyone"
  on public.rooms for select
  using (true);

create policy "Users can create rooms"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Owners can update rooms"
  on public.rooms for update
  to authenticated
  using (auth.uid() = created_by);

create policy "Owners can delete rooms"
  on public.rooms for delete
  to authenticated
  using (auth.uid() = created_by);
