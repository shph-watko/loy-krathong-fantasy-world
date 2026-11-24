# Deployment Plan

## Environments
- Local development.
- Preview deployment for pull requests.
- Production deployment.

## Web hosting
Deploy the Next.js application to a compatible hosting service. Configure build command, output settings and environment variables according to the chosen provider. Use a CDN for large public assets.

## Supabase setup
1. Create a Supabase project.
2. Configure Auth providers and allowed redirect URLs.
3. Apply reviewed SQL migrations.
4. Enable and test RLS policies.
5. Create storage buckets and storage policies.
6. Configure Realtime only for the required tables/channels.

## Environment variables
Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the client. Keep service-role keys server-only and out of the browser bundle.

## Release checks
- Build and type-check pass.
- Mobile and desktop layouts tested.
- Low-graphics mode verified.
- Auth redirects and deep links verified.
- RLS and Storage access tests pass.
- 3D asset loading and fallback states tested.
- Error monitoring and backup/restore approach documented.

## Cost and quota
Start with free tiers where practical, but check current product quotas, storage, bandwidth and inactivity policies before launch. Set usage alerts and asset-size limits.
