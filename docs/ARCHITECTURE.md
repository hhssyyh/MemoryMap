# Architecture

## System Architecture

```
React Native App
        │
   REST API
        │
Spring Boot
        │
Service Layer
        │
Repository
        │
PostgreSQL
```

## Local diary and handwriting data

The current PoC stores diary metadata in Expo SQLite and managed media under the
app document directory. Handwriting documents follow the same ownership boundary:

```text
Diary
  -> Handwriting document metadata (SQLite)
      -> Ordered portrait/landscape 3:4 pages (SQLite JSON)
          -> Background, content revision, and ordered editor layers
  -> Original images, bounded previews, and revisioned PNG thumbnails (document directory)
```

The shared TypeScript document is the cross-platform source of truth. The
`native-ink-view` module owns typed strokes, capabilities, snapshots, incremental
changes, revision reconciliation, and native errors. Its iOS adapter uses
PencilKit and its Android adapter uses Jetpack Ink 1.0.0 plus Motion Prediction
1.0.0. The app owns pages, media layers, history, SQLite, thumbnails, and toolbar
state. Full snapshots cross the bridge only for load, recovery, and undo/redo;
normal native edits emit added strokes and removed stroke IDs.

Each media import writes the original first and then creates an EXIF-normalized,
4096px-bounded preview. A document is saved only after those files exist. Assets
remain alive through the editing session so undo can restore them; garbage
collection runs against persisted references when an editor session starts or
ends. Page content and thumbnail revisions prevent a delayed capture from being
attached to the wrong page or older content.

Database changes use ordered `PRAGMA user_version` migrations. Large binary
assets stay out of SQLite; the database stores their managed file URIs.
