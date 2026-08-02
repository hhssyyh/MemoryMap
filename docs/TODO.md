# TODO

## Current Task

- [x] Build the iPad-first cross-platform handwriting editor described in `HANDWRITING_EDITOR.md`

### Handwriting editor milestones

- [x] Define the versioned document, page, layer, and stroke models
- [x] Add a versioned SQLite migration and handwriting repository
- [x] Add the editor history foundation for undo and redo
- [x] Add multi-page create, delete, duplicate, and drag reorder controls
- [x] Add one-second autosave and save-on-exit behavior
- [x] Add shared pen, highlighter, eraser, and navigation controls
- [x] Add background presets and custom image backgrounds
- [x] Add image and bundled sticker layers with transforms
- [x] Add a PencilKit adapter backed by the common stroke source of truth
- [x] Generate page thumbnail PNGs and provide an in-app preview
- [x] Isolate native ink input behind a platform adapter contract
- [ ] Verify Pencil pressure, finger navigation, and performance on a physical iPad
- [ ] Add full-resolution PNG export and sharing
- [ ] Replace the Android prototype renderer with a Jetpack Ink adapter

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
