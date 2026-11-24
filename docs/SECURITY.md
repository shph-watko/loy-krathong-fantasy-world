# Security and Privacy

## Secrets
- Commit only .env.example with empty placeholders.
- Never expose Supabase service-role keys in browser code.
- Store deployment secrets in the hosting provider's secret manager.

## Authentication and authorization
- Treat the browser as untrusted.
- Enable RLS on all user-facing tables.
- Derive ownership from auth.uid(), never from a client-supplied user_id alone.
- Validate room membership, invitation expiry, item ownership and upload permissions server-side.

## Storage
- Use private buckets by default for personal photos.
- Use signed URLs or narrowly scoped public assets when sharing is intentional.
- Validate file type, size and ownership.
- Provide delete and retention behavior for uploaded media.

## User safety
- Provide report and block actions.
- Rate-limit invitation, room creation and public posting.
- Moderate public wishes and uploaded user content before broad discovery.
- Provide privacy controls for profiles, rooms, photos and wishes.

## Data minimization
Collect only information required for the experience. Do not request precise location. Explain camera/photo permissions before prompting. Set retention periods for transient room data and logs.

## Release checklist
- RLS policies reviewed and tested with multiple users.
- Storage policies tested for owner and non-owner access.
- Secrets scan passes.
- Abuse/rate-limit behavior tested.
- Account deletion and content deletion behavior documented.
