# UI/UX Blueprint

## Visual direction
A cinematic Thai fantasy festival at dusk and night: deep indigo sky, warm gold lantern light, lotus pink accents, emerald foliage and reflective water. Use Thai-inspired ornament as a restrained detail rather than dense decoration on every surface.

## Layout
- Full-viewport world canvas is the visual focus.
- Top utility strip: profile, room status, audio, settings and help.
- Side or bottom navigation: avatar, krathong, friends, album and activities.
- Contextual interaction panel opens near a selected hotspot.
- Modal dialogs are reserved for important tasks such as joining a room or confirming deletion.

## Responsive behavior
- Desktop: expanded navigation and optional scene information panel.
- Tablet: compact navigation and collapsible panels.
- Mobile: touch-first controls, bottom bar and full-screen sheets.
- Keep important actions clear of device safe areas and camera cutouts.

## Interaction states
Every control should define default, hover/focus, pressed, disabled, loading, success and error states where relevant. Show clear feedback when saving, joining, uploading or reconnecting.

## 3D camera and movement
- Provide simple on-screen movement controls on touch devices.
- Support drag-to-look with a clearly discoverable reset-camera action.
- Offer a reduced-motion setting and avoid forced camera movement.
- Prevent UI gestures from accidentally moving the camera.

## Accessibility
- Use readable font sizes and sufficient contrast.
- Add labels to icon-only controls.
- Support keyboard navigation and visible focus.
- Do not rely on color alone to communicate status.
- Respect reduced-motion preferences.

## Design tokens (initial)
- Background: midnight blue / charcoal.
- Primary accent: festival gold.
- Secondary accents: lotus pink, jade green and warm ivory.
- Use consistent spacing, corner radii and elevation.
- Thai and Latin text must be tested for line wrapping and font fallback.

## Photo mode
Keep the world visible behind minimal controls. Provide pose/emote selection, framing guidance, capture, retake, save locally and optional upload/share. Explain permissions before requesting camera access.
