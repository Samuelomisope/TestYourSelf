# Tutor models

Put the 3D tutors here as **VRM** files named exactly:

- `female.vrm`
- `male.vrm`

If a file is missing, the lesson shows the built-in placeholder character instead, so nothing breaks.

## Making one in VRoid Studio (free)

1. Design the character in VRoid Studio. You own what you create.
2. Export as **VRM 1.0** if offered, otherwise VRM 0.x (both work).
3. In the export dialog, reduce the size: texture resolution 1024 or 512, and fewer materials and polygons where the options allow. Aim for **under 5 MB**; files over 12 MB are ignored.
4. Keep the standard facial expressions (happy, relaxed, surprised, aa, blink); the tutor uses them.
5. Copy the files here, then deploy. Do not commit models you do not have the right to use.

Only the head, chest and arms are animated, so a half-body character is fine.

## Classroom 2.1 Premium lecturers (GLB)

`ada.glb` (Dr. Ada Okafor) and `tunde.glb` (Dr. Tunde Bello) are the Premium 3D lecturers. They were made once with Ara 3D Gen
(character data CC0 from MakeHuman; the animation clips come from CMU motion capture, free for commercial products but not
for resale on their own; see the LICENSE.txt in the export) and optimised: 1024 px face textures, 512 px for the rest, WebP.
If a GLB is present it is used before the VRM file of the same lecturer. Clips used: Idle, Talk with gestures, Point at the
board, Thumbs up. Face shapes driven by code: blink, brows, smile, jaw and the five mouth shapes (viseme_aa, E, I, O, U).
