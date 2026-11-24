# Project Overview

## Vision
Create a beautiful, online 3D fantasy world inspired by Thailand's Loy Krathong festival. Visitors should be able to explore a lantern-lit riverside world, personalize an avatar and krathong, make wishes, take photos, and celebrate with friends.

## Product principles
- Scenic first: richly composed environments, water reflections, lanterns, flowers and Thai-inspired architecture.
- Accessible: responsive controls for mobile, tablet and desktop; offer a low-graphics mode.
- Social by choice: private rooms and sharing controls; guests can explore before creating an account.
- Safe by design: privacy defaults, report/block tools and server-enforced access policies.
- Modular: festival scenes, events and cosmetic collections should be independently maintainable.

## Main experience
1. Enter as a guest or sign in.
2. Create and name an avatar; choose an outfit and emotes.
3. Explore the festival world and invite friends into a room.
4. Design a krathong with selectable bases, flowers, candles and decorations.
5. Join the floating ceremony, release lanterns and write a wish.
6. Take photos, curate an album and earn achievements.

## Proposed stack
- Next.js, React and TypeScript for the web application.
- Three.js / React Three Fiber for interactive 3D scenes.
- Supabase Postgres, Auth, Realtime and Storage for online services.
- IndexedDB for local drafts and offline-friendly preferences.
- Static asset hosting/CDN for optimized 3D models, textures, images and audio.

## Scope boundaries
The first milestone is a responsive web experience with one polished main scene, avatar customization, krathong design, a shareable room and a basic ceremony. Additional locations, seasonal events and advanced social features follow later. No separate administrative dashboard is planned for the initial product; moderation and operations can begin with Supabase policies and provider tools.

## Open decisions
- Final visual direction and licensed asset sources.
- Room capacity and realtime synchronization frequency.
- Guest account persistence and account linking.
- Photo retention, storage quota and moderation policy.
