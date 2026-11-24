-- Security hardening and foreign-key indexes for the live project.
-- Keep privileged helper functions outside the exposed public API schema.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, supabase_auth_admin;

create or replace function private.handle_new_user()
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

revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop function if exists public.handle_new_user();

create or replace function private.is_room_member(target_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.room_members
    where room_id = target_room
      and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_room_member(uuid) from public, anon;
grant execute on function private.is_room_member(uuid) to authenticated;

drop policy if exists rooms_select_public_or_member on public.rooms;
create policy rooms_select_public_or_member on public.rooms
for select to authenticated using (
  (visibility = 'public' and status = 'open' and expires_at > now())
  or owner_id = (select auth.uid())
  or private.is_room_member(id)
);

drop policy if exists room_members_select_room_members on public.room_members;
create policy room_members_select_room_members on public.room_members
for select to authenticated using (
  user_id = (select auth.uid())
  or private.is_room_member(room_id)
);

drop policy if exists room_members_read_realtime on realtime.messages;
create policy room_members_read_realtime on realtime.messages
for select to authenticated using (
  case
    when split_part(realtime.topic(), ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_room_member(split_part(realtime.topic(), ':', 2)::uuid)
    else false
  end
);

drop policy if exists room_members_publish_realtime on realtime.messages;
create policy room_members_publish_realtime on realtime.messages
for insert to authenticated with check (
  case
    when split_part(realtime.topic(), ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_room_member(split_part(realtime.topic(), ':', 2)::uuid)
    else false
  end
);

drop function if exists public.is_room_member(uuid, uuid);

create index if not exists album_photos_photo_id_idx
  on public.album_photos (photo_id);
create index if not exists reports_reporter_id_idx
  on public.reports (reporter_id);
create index if not exists room_invitations_created_by_idx
  on public.room_invitations (created_by);
create index if not exists room_invitations_room_id_idx
  on public.room_invitations (room_id);
create index if not exists rooms_owner_id_idx
  on public.rooms (owner_id);
create index if not exists user_achievements_achievement_id_idx
  on public.user_achievements (achievement_id);
create index if not exists user_inventory_item_id_idx
  on public.user_inventory (item_id);
create index if not exists wishes_room_id_idx
  on public.wishes (room_id);
create index if not exists wishes_user_id_idx
  on public.wishes (user_id);
