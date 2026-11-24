-- Loy Krathong Fantasy World: first database schema.
-- Apply after creating a Supabase project and reviewing the policies.
-- Never expose a service-role key in browser code.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ผู้มาเยือน' check (char_length(display_name) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.avatar_configs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ผู้มาเยือน' check (char_length(display_name) between 1 and 24),
  outfit_color text not null default '#b88b52',
  skin_tone text not null default '#d9a47f',
  hair_color text not null default '#272333',
  updated_at timestamptz not null default now()
);

create table if not exists public.krathong_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  design jsonb not null default '{}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  capacity smallint not null default 8 check (capacity between 2 and 16),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null default 8 check (max_uses between 1 and 100),
  uses integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  body text not null check (char_length(body) between 1 and 240),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

create index if not exists krathong_designs_user_created_idx
  on public.krathong_designs (user_id, created_at desc);
create index if not exists rooms_code_status_idx on public.rooms (code, status);
create index if not exists room_members_user_idx on public.room_members (user_id);
create index if not exists wishes_public_idx on public.wishes (created_at desc)
  where visibility = 'public' and moderation_status = 'approved';
create index if not exists photos_user_created_idx on public.photos (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists avatar_configs_set_updated_at on public.avatar_configs;
create trigger avatar_configs_set_updated_at before update on public.avatar_configs
for each row execute function public.set_updated_at();

drop trigger if exists krathong_designs_set_updated_at on public.krathong_designs;
create trigger krathong_designs_set_updated_at before update on public.krathong_designs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'ผู้มาเยือน'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(chosen_name, 24))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.join_room_by_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.room_invitations%rowtype;
  target_room public.rooms%rowtype;
  current_user_id uuid := auth.uid();
  member_total integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into invitation
  from public.room_invitations
  where token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex')
    and expires_at > now()
    and uses < max_uses
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired';
  end if;

  select * into target_room
  from public.rooms
  where id = invitation.room_id and status = 'open' and expires_at > now();

  if not found then
    raise exception 'Room is not available';
  end if;

  select count(*) into member_total
  from public.room_members
  where room_id = target_room.id;

  if member_total >= target_room.capacity then
    raise exception 'Room is full';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (target_room.id, current_user_id, 'member')
  on conflict (room_id, user_id) do nothing;

  update public.room_invitations
  set uses = uses + 1
  where id = invitation.id;

  return target_room.id;
end;
$$;

revoke all on function public.join_room_by_invite(text) from public;
grant execute on function public.join_room_by_invite(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.avatar_configs enable row level security;
alter table public.krathong_designs enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_invitations enable row level security;
alter table public.wishes enable row level security;
alter table public.photos enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "avatars_select_own" on public.avatar_configs
for select to authenticated using (user_id = (select auth.uid()));
create policy "avatars_insert_own" on public.avatar_configs
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "avatars_update_own" on public.avatar_configs
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "krathong_select_owner_or_public" on public.krathong_designs
for select to authenticated using (user_id = (select auth.uid()) or visibility = 'public');
create policy "krathong_insert_own" on public.krathong_designs
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "krathong_update_own" on public.krathong_designs
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "krathong_delete_own" on public.krathong_designs
for delete to authenticated using (user_id = (select auth.uid()));

create policy "rooms_select_public_or_member" on public.rooms
for select to authenticated using (
  (visibility = 'public' and status = 'open' and expires_at > now())
  or owner_id = (select auth.uid())
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = id and rm.user_id = (select auth.uid())
  )
);
create policy "rooms_insert_owner" on public.rooms
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "rooms_update_owner" on public.rooms
for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "rooms_delete_owner" on public.rooms
for delete to authenticated using (owner_id = (select auth.uid()));

create policy "room_members_select_own" on public.room_members
for select to authenticated using (user_id = (select auth.uid()));
-- Room membership must be managed by trusted server-side functions, not direct client inserts.
create policy "room_members_delete_self_or_owner" on public.room_members
for delete to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.rooms r
    where r.id = room_id and r.owner_id = (select auth.uid())
  )
);

create policy "room_invitations_owner_only" on public.room_invitations
for all to authenticated using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.rooms r
    where r.id = room_id and r.owner_id = (select auth.uid())
  )
) with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.rooms r
    where r.id = room_id and r.owner_id = (select auth.uid())
  )
);

create policy "wishes_select_own_or_approved_public" on public.wishes
for select to authenticated using (
  user_id = (select auth.uid())
  or (visibility = 'public' and moderation_status = 'approved')
);
create policy "wishes_insert_own_pending" on public.wishes
for insert to authenticated with check (
  user_id = (select auth.uid()) and moderation_status = 'pending'
);
create policy "wishes_delete_own" on public.wishes
for delete to authenticated using (user_id = (select auth.uid()));

create policy "photos_select_owner_or_public" on public.photos
for select to authenticated using (user_id = (select auth.uid()) or visibility = 'public');
create policy "photos_insert_own" on public.photos
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "photos_update_own" on public.photos
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "photos_delete_own" on public.photos
for delete to authenticated using (user_id = (select auth.uid()));
