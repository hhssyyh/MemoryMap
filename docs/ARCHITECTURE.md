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
      -> Ordered 3:4 pages (SQLite JSON)
          -> Background and ordered editor layers
  -> Images, native ink caches, and PNG thumbnails (document directory)
```

The shared TypeScript document is the cross-platform source of truth.
`InkInputAdapter` isolates platform input: PencilKit is active on iOS, while the
shared Skia canvas remains the Android fallback until a Jetpack Ink implementation
is added. Native engines are input/rendering adapters; their
serialized payloads may be cached for same-platform fidelity, but cannot replace
the shared data because documents must remain editable across platforms.

Database changes use ordered `PRAGMA user_version` migrations. Large binary
assets stay out of SQLite; the database stores their managed file URIs.
