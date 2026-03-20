# Interaction & UX Notes

## Natural interaction (visionOS model)

Natural interaction includes:

- **Indirect gestures**: eye gaze selects, pinch activates.
- **Direct gestures**: finger proximity selects, touch activates (similar to touch screens).

A key implication: during the “select” phase, web code does not receive JS events and CSS pseudo states (like `:hover`) do not activate.

## Hover effect is OS-native

The “hover effect” seen in spatial UX is not CSS `:hover`. It is rendered by the OS.

To ensure important UI is targetable:

- use semantic elements (`button`, `a`, `input`)
- or set `cursor: pointer`

## Event sequencing

After activation, event sequences resemble touch emulation:

- pointer events (`pointerover/enter/down/move/up/out/leave`)
- touch emulation (`touchstart/move/end`)
- followed by mouse emulation for desktop compatibility, ending with `click`

Design gestures accordingly (e.g., drag-and-drop can be built on pointer events).

## Design guidance

- Prefer larger, clearly separated interactive targets.
- Provide clear in-app navigation (do not assume an address bar exists).
- Consider that the scene can be resized/positioned by the OS and the user; ensure layouts degrade gracefully.
