-- Extended social, progression, storage and online room operations.
-- Run after 202611240001_initial_schema.sql.

create table if not exists public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

create table if not exists public.album_photos (
  album_id uuid not null references public.albums(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (album_id, photo_id)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  configuration jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'wish', 'photo', 'room')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists albums_user_created_idx on public.albums (user_id, created_at desc);
create index if not exists events_current_idx on public.events (starts_at, ends_at) where active = true;
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);

create or replace function public.is_room_member(target_room uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1 from public.room_members
    where room_id = target_room and user_id = target_user
  );
$$;

revoke all on function public.is_room_member(uuid, uuid) from public;
grant execute on function public.is_room_member(uuid, uuid) to authenticated;

drop policy if exists rooms_select_public_or_member on public.rooms;
create policy rooms_select_public_or_member on public.rooms
for select to authenticated using (
  (visibility = 'public' and status = 'open' and expires_at > now())
  or owner_id = (select auth.uid())
  or public.is_room_member(id, (select auth.uid()))
);

drop policy if exists room_members_select_own on public.room_members;
create policy room_members_select_room_members on public.room_members
for select to authenticated using (
  user_id = (select auth.uid())
  or public.is_room_member(room_id, (select auth.uid()))
);

create or replace function public.create_festival_room(
  requested_visibility text default 'private',
  requested_capacity smallint default 8
)
returns table (room_id uuid, room_code text)
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  new_room_id uuid := gen_random_uuid();
  new_room_code text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if requested_visibility not in ('private', 'public') then
    raise exception 'Invalid room visibility';
  end if;
  if requested_capacity < 2 or requested_capacity > 16 then
    raise exception 'Room capacity must be between 2 and 16';
  end if;

  loop
    new_room_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 6));
    exit when not exists (select 1 from public.rooms where code = new_room_code);
  end loop;

  insert into public.rooms (id, code, owner_id, visibility, capacity)
  values (new_room_id, new_room_code, current_user_id, requested_visibility, requested_capacity);

  insert into public.room_members (room_id, user_id, role)
  values (new_room_id, current_user_id, 'owner');

  return query select new_room_id, new_room_code;
end;
$$;

revoke all on function public.create_festival_room(text, smallint) from public;
grant execute on function public.create_festival_room(text, smallint) to authenticated;

create or replace function public.create_room_invitation(
  target_room uuid,
  lifetime_minutes integer default 120,
  allowed_uses integer default 8
)
returns text
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if lifetime_minutes < 5 or lifetime_minutes > 1440 then
    raise exception 'Invitation lifetime must be between 5 and 1440 minutes';
  end if;
  if allowed_uses < 1 or allowed_uses > 100 then
    raise exception 'Invitation uses must be between 1 and 100';
  end if;
  if not exists (
    select 1 from public.rooms
    where id = target_room and owner_id = current_user_id and status = 'open'
  ) then
    raise exception 'Room not found or not owned by current user';
  end if;

  insert into public.room_invitations (
    room_id, created_by, token_hash, expires_at, max_uses
  )
  values (
    target_room,
    current_user_id,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    now() + make_interval(mins => lifetime_minutes),
    allowed_uses
  );

  return raw_token;
end;
$$;

revoke all on function public.create_room_invitation(uuid, integer, integer) from public;
grant execute on function public.create_room_invitation(uuid, integer, integer) to authenticated;

create or replace function public.join_room_by_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  invitation public.room_invitations%rowtype;
  target_room public.rooms%rowtype;
  member_total integer;
  inserted_rows integer;
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

  -- Lock the room so concurrent joins cannot exceed the configured capacity.
  select * into target_room
  from public.rooms
  where id = invitation.room_id
    and status = 'open'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Room is not available';
  end if;

  if exists (
    select 1 from public.room_members
    where room_id = target_room.id and user_id = current_user_id
  ) then
    return target_room.id;
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

  get diagnostics inserted_rows = row_count;
  if inserted_rows > 0 then
    update public.room_invitations
    set uses = uses + 1
    where id = invitation.id;
  end if;

  return target_room.id;
end;
$$;

revoke all on function public.join_room_by_invite(text) from public;
grant execute on function public.join_room_by_invite(text) to authenticated;

create or replace function public.join_room_by_code(requested_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.rooms%rowtype;
  member_total integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target_room
  from public.rooms
  where code = upper(trim(requested_code))
    and visibility = 'public'
    and status = 'open'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Public room not found or expired';
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

  return target_room.id;
end;
$$;

revoke all on function public.join_room_by_code(text) from public;
grant execute on function public.join_room_by_code(text) to authenticated;

alter table public.friendships enable row level security;
alter table public.albums enable row level security;
alter table public.album_photos enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.inventory_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.events enable row level security;
alter table public.reports enable row level security;

create policy friendships_select_participant on public.friendships
for select to authenticated using (
  requester_id = (select auth.uid()) or addressee_id = (select auth.uid())
);
create policy friendships_insert_requester on public.friendships
for insert to authenticated with check (
  requester_id = (select auth.uid()) and status = 'pending'
);
create policy friendships_update_participant on public.friendships
for update to authenticated using (
  requester_id = (select auth.uid()) or addressee_id = (select auth.uid())
) with check (
  requester_id = (select auth.uid()) or addressee_id = (select auth.uid())
);
create policy friendships_delete_participant on public.friendships
for delete to authenticated using (
  requester_id = (select auth.uid()) or addressee_id = (select auth.uid())
);

create policy albums_select_owner_or_public on public.albums
for select to authenticated using (user_id = (select auth.uid()) or visibility = 'public');
create policy albums_insert_own on public.albums
for insert to authenticated with check (user_id = (select auth.uid()));
create policy albums_update_own on public.albums
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy albums_delete_own on public.albums
for delete to authenticated using (user_id = (select auth.uid()));

create policy album_photos_select_album_scope on public.album_photos
for select to authenticated using (
  exists (
    select 1 from public.albums a
    where a.id = album_id and (a.user_id = (select auth.uid()) or a.visibility = 'public')
  )
);
create policy album_photos_insert_album_owner on public.album_photos
for insert to authenticated with check (
  exists (select 1 from public.albums a where a.id = album_id and a.user_id = (select auth.uid()))
  and exists (select 1 from public.photos p where p.id = photo_id and p.user_id = (select auth.uid()))
);
create policy album_photos_delete_album_owner on public.album_photos
for delete to authenticated using (
  exists (select 1 from public.albums a where a.id = album_id and a.user_id = (select auth.uid()))
);

create policy achievements_read_authenticated on public.achievements
for select to authenticated using (true);
create policy user_achievements_read_own on public.user_achievements
for select to authenticated using (user_id = (select auth.uid()));

create policy inventory_items_read_authenticated on public.inventory_items
for select to authenticated using (active = true);
create policy user_inventory_read_own on public.user_inventory
for select to authenticated using (user_id = (select auth.uid()));

create policy events_read_authenticated on public.events
for select to authenticated using (active = true);

create policy reports_insert_own on public.reports
for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_read_own on public.reports
for select to authenticated using (reporter_id = (select auth.uid()));

-- Private photo bucket. Store objects under: <auth-user-uuid>/<photo-file-name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'festival-photos',
  'festival-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy festival_photos_select_own on storage.objects
for select to authenticated using (
  bucket_id = 'festival-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy festival_photos_insert_own on storage.objects
for insert to authenticated with check (
  bucket_id = 'festival-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy festival_photos_delete_own on storage.objects
for delete to authenticated using (
  bucket_id = 'festival-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Realtime topic format: room:<room-uuid>. Only current room members can publish/read.
create policy room_members_read_realtime on realtime.messages
for select to authenticated using (
  case
    when split_part(realtime.topic(), ':', 2) ~* '^[0-9a-f-]{36}$'
      then public.is_room_member(split_part(realtime.topic(), ':', 2)::uuid, (select auth.uid()))
    else false
  end
);
create policy room_members_publish_realtime on realtime.messages
for insert to authenticated with check (
  case
    when split_part(realtime.topic(), ':', 2) ~* '^[0-9a-f-]{36}$'
      then public.is_room_member(split_part(realtime.topic(), ':', 2)::uuid, (select auth.uid()))
    else false
  end
);
