# Product Requirements

## Audience and platforms
- Visitors on Android and iOS mobile browsers, tablets and desktop browsers.
- Guest mode should allow previewing and exploring before sign-in.
- Core navigation and interactions must work with touch and mouse.

## Functional requirements

### Festival entry and profile
- Landing page introduces the festival world and provides Enter, Sign in and Help actions.
- Users can enter as guests; registered users can save profile and creations.
- Avatar has a display name, body/style selection, outfit, accessories and emotes.
- Name validation, reporting and blocking are required.

### World exploration
- Main world includes a river, decorated banks, paths, a festival plaza and points of interest.
- Planned scenes: Golden Temple, Moon Bridge, Lotus Garden, Starry Sky and Floating Market.
- Users can move, rotate camera, interact with hotspots and return to the main area.
- Provide graphics presets and a reduced-motion option.

### Krathong creator
- Select a base and combine decorative components such as banana leaves, flowers, candles and incense.
- Preview the krathong in 3D and rotate/zoom it.
- Save designs to the user's collection and optionally share them.
- Validate item ownership and permitted combinations on the server when applicable.

### Multiplayer and invitations
- Create or join a room with a short code or invitation link.
- Room owner can set visibility and capacity.
- Show other participants' avatars and basic movement/emotes.
- Handle reconnect, disconnect, room-full and expired-invitation states.
- Keep authoritative room membership and permission checks on the server.

### Ceremony and wishes
- Users can float a krathong in the ceremony area.
- Users may release a sky lantern where the event rules allow.
- Wishes can be private or public; public wishes require moderation controls.
- Ceremony effects should be optimized for mobile performance.

### Camera, photos and albums
- Support a camera/photo mode with framing, pose and emote selection.
- Ask for camera permission only when the user chooses a camera feature.
- Local photo capture should be the default; uploading requires explicit user action.
- Users can manage, delete and share their own uploaded photos.

### Social and progression
- Friends, group invites, emotes and room presence.
- Festival fair, themes, shows and limited-time events.
- Missions, achievements and inventory/collectibles.
- Help, settings, privacy, audio and graphics preferences.

## Quality requirements
- Responsive layout and readable Thai typography.
- Lazy-load scenes and large assets; show progress and recoverable errors.
- Target smooth interaction on mid-range mobile devices with a reduced quality mode.
- Keyboard accessibility for menus and forms; touch targets sized for mobile.
- Avoid exposing secrets in browser bundles.
- Enforce authorization in Supabase with Row Level Security (RLS).
- Collect only data needed to provide the experience.

## Out of scope for first milestone
- Native mobile apps.
- Full economy, payments or user-to-user trading.
- Voice chat.
- User-generated 3D model uploads.
- A standalone admin dashboard.
