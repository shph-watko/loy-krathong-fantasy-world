# Multiplayer Flow

## Room lifecycle
1. Host creates a room and chooses public/private visibility and capacity.
2. Server generates an unguessable invitation token; store only a hash.
3. Invite link or short code opens a room preview.
4. Server validates token, expiry, capacity, account/guest policy and block rules.
5. On success, create membership and announce presence.
6. Broadcast low-frequency avatar position, facing and emote state.
7. On disconnect, mark the member temporarily absent; allow a short reconnect window.
8. Host may close the room; revoke outstanding invitations and clean up transient state.

## Realtime events (conceptual)
- room:member_joined
- room:member_left
- avatar:presence
- avatar:move
- avatar:emote
- room:closed

## Reliability
- Use sequence numbers or timestamps to ignore stale position messages.
- Throttle movement broadcasts and interpolate remote movement client-side.
- Recover from network interruptions with exponential backoff.
- Display reconnecting, disconnected and room-closed states.
- Do not trust the client to assign roles or bypass room capacity.

## Privacy and safety
- Do not expose private room codes in public listings.
- Allow room owners to remove participants.
- Provide block/report tools.
- Rate-limit room creation and invitation attempts.
- Avoid voice or direct messaging in the first milestone.

## Performance
Use presence for online state and ephemeral broadcasts for movement. Persist only meaningful events, not every frame. Limit room capacity based on measured mobile performance and server quotas.
