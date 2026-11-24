# Database Design (Supabase)

This is a logical starting design, not an applied migration. Review and implement migrations before using production data.

## Proposed tables
- profiles: user_id (auth.users FK), display_name, avatar_id, created_at, updated_at.
- avatars: id, user_id, name, appearance_json, updated_at.
- avatar_outfits: id, avatar_id, outfit_json, updated_at.
- krathong_designs: id, user_id, name, design_json, visibility, created_at.
- rooms: id, owner_id, code, visibility, capacity, status, created_at, expires_at.
- room_members: room_id, user_id, role, joined_at, last_seen_at.
- room_invitations: id, room_id, created_by, token_hash, expires_at, max_uses, uses.
- friendships: requester_id, addressee_id, status, created_at.
- wishes: id, user_id, room_id, body, visibility, moderation_status, created_at.
- photos: id, user_id, storage_path, visibility, created_at.
- albums: id, user_id, title, visibility, created_at.
- album_photos: album_id, photo_id, sort_order.
- achievements: id, code, title, description, criteria_json.
- user_achievements: user_id, achievement_id, unlocked_at.
- inventory_items: id, code, category, metadata_json.
- user_inventory: user_id, item_id, quantity, acquired_at.
- events: id, title, starts_at, ends_at, configuration_json.
- reports: id, reporter_id, target_type, target_id, reason, status, created_at.

## Data rules
- Use UUID primary keys for user-generated records.
- Reference auth.users for account ownership.
- Add created_at/updated_at timestamps and indexes for common lookup paths.
- Store structured cosmetic configurations as validated JSON where appropriate.
- Store photo binaries in Supabase Storage; keep only metadata and storage paths in Postgres.
- Never store secrets, raw invitation tokens or unnecessary personal data in public rows.

## Realtime
Use Supabase Realtime selectively for room presence and low-volume state updates. Do not persist every movement frame. Consider broadcasting ephemeral position updates while storing only durable user and room state.

## Security and RLS
Enable RLS on every user-facing table. Users can read/update their own private profile and creations. Room access must verify active membership and room visibility. Public wishes/photos require explicit visibility and moderation policy. Storage policies must bind object paths to the authenticated owner or permitted shared scope.

## Migration sequence (suggested)
1. Profiles and avatar tables.
2. Krathong designs and inventory.
3. Rooms, members and invitations.
4. Wishes, photos and albums.
5. Achievements, events and reports.
6. Add indexes, policies, constraints and seed data.

## Not yet implemented
No Supabase project identifiers, migrations, tables, policies, buckets or seed data have been created by this repository initialization.
