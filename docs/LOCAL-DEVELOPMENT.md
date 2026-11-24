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

This repository is connected to the Supabase project `loy-krathong-fantasy-world` (Project Ref: `czvlqmozvjpfdiwsztdx`, region: Sydney).

1. Copy `.env.example` to `.env.local`. It contains this project's URL and public publishable key.
2. The four migrations in `supabase/migrations/` have already been applied to the connected project. To provision a different project, run all four files in filename order (001 through 004) using the Supabase SQL Editor.
3. In Supabase Authentication > URL Configuration, add `http://localhost:3000/auth/callback` to the allowed Redirect URLs.
4. When deploying, add the matching production callback URL and set the production Site URL.
5. Enable/configure the Email provider and test magic-link sign-in.
6. The migrations create the private `festival-photos` Storage bucket and authorization policies for private Realtime room channels.

The publishable key is designed for use in the browser and is protected by the project's Row Level Security policies. Never place a service-role or secret key in `NEXT_PUBLIC_*` variables or commit it to Git.

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
