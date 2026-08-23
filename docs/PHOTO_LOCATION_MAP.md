# Photo Location Map

## Purpose

The photo location map shows memories from two sources:

- Diary photos that the user explicitly attached to a diary
- Camera roll photos that contain GPS metadata and are not attached to a diary

Diary data is the higher-priority source because it represents the user's
intentional memory record. Camera roll data is used as an automatic discovery
source for photos that have not been organized into diaries yet.

## Marker source rules

### Diary photos

Diary photos always use the saved diary location.

- Use `diaries.latitude` and `diaries.longitude`, or the matched saved location
  coordinate when rendering a diary marker.
- Do not move a diary marker based on EXIF coordinates from an attached photo.
- Include all photos attached to the diary under that diary marker.
- If several diaries share the same saved location, group them under the same
  diary point.

This keeps user intent stable. A photo may have been taken somewhere else, but
once the user attaches it to a diary, the app treats it as part of that diary's
place.

### Camera roll photos

Camera roll photos use embedded GPS metadata only when all of these are true:

- The photo is available through the device media library.
- The app has sufficient photo library permission to read the asset.
- The asset has valid latitude and longitude metadata.
- The asset is not already attached to a diary.

Camera roll photos without valid GPS coordinates do not create automatic map
markers.

### Screenshots, downloads, and shared images

Screenshots, downloaded images, messenger images, edited images, and compressed
images usually do not have reliable GPS metadata. The map rule is simple:

- If GPS metadata is missing, exclude the asset from automatic photo markers.
- If GPS metadata exists and is readable, it may be shown as a camera roll photo
  marker.
- If the user manually attaches the asset to a diary, show it through the diary
  marker regardless of GPS metadata.

The app should avoid guessing a location from album names, filenames, or current
device location.

## Deduplication rules

The same image must not appear as both a diary marker photo and a camera roll
photo marker.

Priority order:

1. Diary marker
2. Camera roll photo marker

If a cached media asset is attached to a diary, hide the automatic camera roll
marker and include the image in the diary marker. Matching should prefer stable
asset identifiers when available. When asset identifiers are unavailable, use the
managed diary photo relationship and file URI metadata as a fallback.

## Marker categories

### `diary`

A marker for one saved place that has one or more diaries.

Required data:

- Marker id
- Coordinate
- Location label
- Diary ids
- Cover photo URI when available
- Photo count

Interaction:

- Selecting the marker opens the existing diary bottom sheet.
- Opening an item navigates to the diary detail screen.

### `library_photo`

A marker for one or more camera roll photos with GPS metadata that are not
attached to diaries.

Required data:

- Marker id
- Coordinate
- Media asset ids
- Preview photo URI when available
- Photo count
- Earliest or latest taken time when available

Interaction:

- Selecting the marker should show a lightweight preview state.
- A later task can add "create diary from photo" or "attach to diary" actions.

### `cluster`

A visual grouping of nearby `diary` and `library_photo` markers.

Rules:

- Clusters are a map display concern, not a stored data source.
- Expanding a cluster should reveal its underlying diary and photo markers.
- Mixed clusters should preserve source counts so the UI can distinguish diary
  memories from loose camera roll photos.

## Coordinate validity

A coordinate is valid only when:

- Latitude is a finite number between `-90` and `90`
- Longitude is a finite number between `-180` and `180`
- Both latitude and longitude are present together

Invalid or partial coordinates are ignored for automatic map display.

## Permission behavior

When photo permission is denied or limited:

- Existing diary markers still render.
- Cached camera roll photo markers may render if already available and allowed
  by platform behavior.
- The app should not block the map while requesting or syncing photo access.
- The UI should communicate partial access in the later map UI task.

## Out of scope for this rule step

These are intentionally handled by later milestones:

- SQLite cache tables and migrations
- Media library scanning implementation
- Incremental sync scheduling
- Map UI rendering changes
- "Create diary from photo" actions
