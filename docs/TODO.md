# TODO

## Current Task

- [x] Redesign handwriting as a canvas-first editor with responsive tablet and phone controls

### Handwriting editor milestones

- [x] Separate the floating handwriting toolbar from secondary editor settings
- [x] Use a right-side settings panel on tablets and a bottom sheet on phones
- [x] Enable the handwriting editor on phones with finger drawing by default
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

### Photo location map milestones

- [x] Define the photo location marker rules
  - Diary photos always use the diary's saved location
  - Camera roll photos use embedded GPS metadata when available
  - Screenshots, downloads, and photos without GPS metadata are excluded from automatic location markers
  - When the same photo is attached to a diary, show it through the diary marker instead of duplicating it as a library photo marker
- [x] Add a photo location cache schema in SQLite
  - Store media asset id, uri, filename, created time, modified time, width, height, media type, GPS latitude, GPS longitude, source type, and sync status
  - Store the last scanned cursor or timestamp needed for incremental media library sync
  - Add indexes for coordinate lookup, modified time lookup, and source type filtering
- [x] Build a platform media library adapter
  - Request iOS and Android photo permissions through Expo APIs
  - Read media assets incrementally instead of loading the full library on app launch
  - Extract GPS metadata when available
  - Normalize iOS and Android asset fields into one app-level model
- [x] Build incremental photo sync
  - Run a lightweight initial sync after the app opens
  - Continue scanning in small batches while the app is idle or the map is visible
  - Detect changed, deleted, or newly added assets and update the SQLite cache
  - Avoid blocking the first app render
- [x] Merge diary photo markers with cached library photo markers
  - Load diary markers from saved diary locations
  - Load library photo markers from cached GPS coordinates
  - Deduplicate photos that are already attached to diaries
  - Group nearby photos and diary points into map clusters
- [x] Add a photo-aware map UI layer
  - Render diary markers and library photo markers with visually distinct states
  - Show a small photo preview or count when a marker is selected
  - Add loading and partial-sync states without blocking map interaction
  - Add an empty state for users with no GPS-tagged photos
- [ ] Add validation and device checks
  - [x] Add the photo location validation checklist
  - [x] Run TypeScript, unit test, and Expo config validation locally
  - [ ] Verify iOS camera photos, screenshots, downloads, and shared images on a device
  - [ ] Verify Android camera photos, screenshots, downloads, and shared images on a device
  - [ ] Test permission denied, limited access, and permission changes on devices
  - [ ] Test a large photo library with incremental sync enabled on a device

### Collection milestones

- [x] Add collection data model and SQLite repository
  - Create `collections` and `collection_diaries` tables
  - Add basic create, update, list, and delete repository methods
  - Prepare migration path from `tripName` and `routeOrder`
- [x] Redesign the Diary tab around collections
  - Show collection cards as the primary Diary tab content
  - Keep an entry point for viewing all diaries
  - Show collection cover photo, title, diary count, and date range
- [x] Add a collection detail screen
  - Show collection metadata and included diaries
  - Navigate from included diaries to diary detail
  - Provide collection edit and delete entry points
- [x] Add diary collection assignment
  - Select a collection when creating a diary
  - Change collection membership when editing a diary
  - Remove a diary from a collection without deleting the diary
- [x] Add collection diary ordering
  - Store `sort_order` in `collection_diaries`
  - Default order by visited time
  - Allow manual order changes later if needed
- [x] Move route lines to collection-based map paths
  - Draw route lines from diaries in the selected collection
  - Use collection order before falling back to visited time
  - Keep tags for search and filtering, not route construction

### Map search milestones

- [x] Add Mapbox place search to the Map tab
  - Show a search overlay on the full map screen
  - Fetch autocomplete suggestions through Mapbox Search Box API
  - Move the map camera to the selected search result
  - Show a temporary marker for the selected search result
  - Keep diary markers, photo markers, and route lines unchanged

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
