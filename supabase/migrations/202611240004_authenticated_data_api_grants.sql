-- Grant only the table operations required by authenticated application users.
-- RLS remains enabled on every public table and is the row-level security boundary.
-- No Data API table privileges are granted to anon.

grant usage on schema public to authenticated;

grant select, insert, update
  on public.profiles, public.avatar_configs
  to authenticated;

grant select, insert, update, delete
  on public.krathong_designs, public.rooms, public.photos,
     public.friendships, public.albums
  to authenticated;

-- Membership changes and invitation creation are only allowed through guarded RPCs.
grant select, delete on public.room_members to authenticated;
grant select on public.room_invitations to authenticated;

grant select, insert, delete on public.wishes to authenticated;
grant select, insert, delete on public.album_photos to authenticated;

grant select
  on public.achievements, public.user_achievements,
     public.inventory_items, public.user_inventory, public.events
  to authenticated;

grant select, insert on public.reports to authenticated;
