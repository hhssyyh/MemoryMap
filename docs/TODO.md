# TODO

## Current Task

- [x] Complete automated implementation and adversarial hardening for the postcard-style handwriting editor
- [ ] Product owner: run the handed-off physical-device checklist on iPad + Apple Pencil and Galaxy Tab + S Pen

### Handwriting editor milestones

- [x] Separate the floating handwriting toolbar from secondary editor settings
- [x] Use a right-side settings panel on tablets and a bottom sheet on phones
- [x] Keep phone-responsive controls internally while exposing the product entry point on tablets only
- [x] Upgrade handwriting documents to schema v2 with orientation, managed image references, and thumbnail revisions
- [x] Add a versioned SQLite migration and handwriting repository
- [x] Add the editor history foundation for undo and redo
- [x] Add 10-page-limited create, delete, duplicate, orientation inheritance, rotation, and drag reorder controls
- [x] Add serialized one-second autosave, background flush, retry, and revision-safe thumbnails
- [x] Add shared pen, highlighter, eraser, and navigation controls
- [x] Add background presets and custom image backgrounds
- [x] Add managed original/preview images and directly manipulable image/sticker layers
- [x] Add PencilKit and Jetpack Ink adapters backed by a typed snapshot/change contract
- [x] Generate page thumbnail PNGs and provide an in-app preview
- [x] Isolate native ink input behind an extractable `native-ink-view` module contract
- [x] Replace the Android MotionEvent renderer with Jetpack Ink 1.0.0 and Motion Prediction 1.0.0
- [x] Pass Jest, TypeScript, iOS Simulator build, Android debug build, and Android native unit tests
- [x] Prevent page duplication and persistence from bypassing the 1,000-stroke invariant
- [x] Isolate autosave revisions across diary sessions
- [x] Correct layer gestures after viewport zoom/rotation and replace pressure-based pointer detection
- [x] Separate Ink revisions from persistence revisions and keep pending native strokes stable across non-ink edits and undo
- [x] Add lasso selection and one-step bounded movement for multiple ink strokes
- [x] Bound ink points, media layer counts, and original-image storage in addition to page and stroke counts
- [x] Run actual PencilKit stroke round-trip and Jetpack Ink emulator instrumentation tests
- [ ] Product owner: verify fast ink, pressure, tilt, palm rejection, finger navigation, transforms, rotation, and restore on a physical iPad
- [ ] Product owner: run the equivalent physical-device suite on a Galaxy Tab with S Pen
- [ ] Product owner: record 10-page/1,000-stroke and high-resolution-image performance measurements on both target tablets
- [ ] Add full-resolution PNG export and sharing

---

## Completed

- [x] Keep every photo visible when changing a diary cover photo in the edit screen
- [x] Seed SQLite with starter diary records for local testing
- [x] Allow selecting a diary cover photo from its edit screen
- [x] Persist diary entries, photo metadata, and copied photo files locally with SQLite
- [x] Define the next MVP task
- [x] Restore missing `react-native-svg` install for bookmark icons
- [x] Add tag-based diary search
- [x] Connect diary creation to saved locations
- [x] Add time-based map themes, daily visit routes, animated markers, and clustering
- [x] Build diary detail screen
- [x] Add a dedicated full-size map tab and rename the existing map tab to Home
- [x] Replace the temporary map implementation with Mapbox
- [x] Add current location permission and tracking
- [x] Build diary list screen
- [x] Add initial map integration
- [x] Add bottom tab navigation
- [x] Set up initial app structure and create mock Home Map screen
