# Local Development

## Requirements
- Node.js 20.9 or newer.
- npm 10 or newer.
- A modern browser with WebGL support for the 3D scene.

## Install and run
1. Clone this repository.
2. Install packages with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. For local-only preview, leave the Supabase values empty.
5. Start the development server with `npm run dev`.
6. Open `http://localhost:3000`.

## Supabase setup
1. Create a Supabase project.
2. Copy the Project URL and Publishable Key to `.env.local`.
3. In the SQL Editor, run migrations in filename order:
   - `supabase/migrations/202611240001_initial_schema.sql`
   - `supabase/migrations/202611240002_social_storage_rooms.sql`
4. In Authentication URL Configuration, add your local callback URL:
   - `http://localhost:3000/auth/callback`
5. For a deployed site, add the production callback URL as well.
6. Configure an email provider and test magic-link sign-in.

## Scripts
- `npm run dev`: local development server.
- `npm run build`: production build.
- `npm start`: start the production server.
- `npm run lint`: ESLint.
- `npm run typecheck`: TypeScript validation.

## Current working behavior
The first playable version includes:
- 3D festival scene with a temple, river, lights, flowers and krathong.
- Avatar appearance and display-name customization.
- Keyboard movement (W/A/S/D or arrow keys) and on-screen movement controls.
- Krathong customization with local saved designs and optional cloud backup.
- Wishes saved locally and optionally to the authenticated user's Supabase account.
- Screenshot capture saved into browser IndexedDB; upload to the private Supabase photo bucket is an explicit user action.
- Guest invite-link preview, plus authenticated private-room invitation links and public room codes.
- Optional email magic-link sign-in.
- Avatar settings load from and synchronize to Supabase when signed in.
- Supabase room creation/invitation, invitation joining and Realtime presence/movement when migrations and Realtime policies are applied.
- Named festival characters and 3D nameplates in the main scene.

## Limitations
- Local guest settings, wishes, designs and photos are stored in the current browser only.
- Real online rooms require a configured Supabase project, applied migrations, working Auth email delivery and correct Realtime settings.
- Browser camera access, voice chat, economy, moderation console and all 18 planned pages are not part of this first playable build.
- The 3D world currently uses procedural geometry; final optimized GLB assets, additional locations and animation sets are later production tasks.
