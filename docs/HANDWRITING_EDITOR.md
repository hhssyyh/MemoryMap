# Handwriting Editor

## Product scope

The handwriting editor enriches a location-based diary with editable notes,
photos, and decorations. It is not intended to become a general-purpose note
application during the current PoC.

The first delivery targets iPad Pro and Apple Pencil. Android tablets and S Pen
follow through the same document contract after the iOS workflow is stable.

## Confirmed decisions

* Documents must remain editable between iPad and Android.
* A diary owns one handwriting document containing multiple pages.
* The initial page size is a fixed portrait 3:4 ratio (`900 x 1200` logical units).
* Pages support create, delete, duplicate, and drag reorder.
* A shared toolbar provides a consistent experience on both platforms.
* Stylus input draws; one finger navigates; two fingers zoom and rotate the view.
* Without a stylus, the toolbar switches one-finger input between draw and navigate.
* Changes autosave after one second of inactivity and flush when leaving the editor.
* The first release stores data locally and restores it after an app restart.
* Editable source and PNG previews are required. PDF export is deferred.

## Responsive editor layout

The canvas is the primary surface on every device. Undo, redo, drawing tools,
the current color, and stroke width stay in a compact floating toolbar. Page
management, brush details, backgrounds, insertion, and layer controls remain
hidden until requested so they do not reduce the writing area.

On tablets, the toolbar floats above the page and secondary controls open as a
right-side panel. On phones, the page fits the available portrait width, the
toolbar is anchored near the bottom safe area, and secondary controls open in a
scrollable bottom sheet. Finger drawing is enabled by default on phones because
most phones do not have a stylus; users can switch to the navigation tool when
they need to pan or zoom the page.

## Platform architecture

* iOS authoring and rendering: PencilKit
* Android authoring and rendering: Jetpack Ink View APIs
* Shared React Native layer: document schema, toolbar, page and layer operations,
  history, persistence coordination, and cross-platform rendering contract

The shared stroke model is the source of truth. Native payloads are optional
caches, invalidated and regenerated after an edit from another platform.

`InkInputAdapter` is the platform boundary. It currently selects PencilKit on
iOS while Android uses the shared Skia fallback. The later Jetpack Ink adapter
must implement the same controlled props and emit the same page-coordinate
strokes, so the editor screen and persistence layer do not need platform forks.

The initial shared brush set is deliberately limited to pen and highlighter.
Erasers operate on complete strokes so edits have deterministic results on both
platforms. Platform-only brush effects are out of scope until a compatible
representation is defined.

## Document model

```text
HandwritingDocument
  id, diaryId, schemaVersion, selectedPageId
  pages[]
    id, width, height, background, thumbnailUri
    layers[]
      InkLayer: strokes[]
      ImageLayer: assetUri, size, transform
      StickerLayer: stickerId, size, transform
```

Coordinates are expressed in page logical units instead of screen pixels. Every
movable layer has translation, scale, rotation, z-order through array position,
visibility, and lock state.

## Backgrounds and media

Built-in backgrounds are blank, lined, grid, dot, and cream paper. A managed
user image can also be used as a background.

Images can come from the photo library or photos already attached to the diary.
Camera capture and filters are deferred. The initial sticker catalog is bundled
with the app; downloaded and user-created sticker catalogs are future extensions.

## Persistence and history

SQLite stores document/page metadata and JSON layer content. Managed media,
native ink caches, and PNG thumbnails are stored under the diary document
directory. Deleting a diary cascades its database rows and removes its directory.

Undo and redo cover ink, page operations, backgrounds, and layer changes. A
bounded in-memory history keeps the latest 100 committed operations. Autosave
persists only the current document and does not clear edit history.

## Export

The first milestone generates a thumbnail PNG and an in-app preview. A
full-resolution PNG export follows the same composition renderer. Image-based multi-page PDF can
be added after page rendering is stable; vector PDF is explicitly out of scope.

## Delivery order

1. Versioned document model, database migration, and repository
2. Multi-page state, undo/redo, autosave, and page controls
3. Shared toolbar and PencilKit adapter
4. Background presets
5. Image and bundled sticker layers with transforms
6. Thumbnail and full-resolution PNG composition
7. iPad performance and gesture verification
8. Android Jetpack Ink adapter and Galaxy Tab verification
