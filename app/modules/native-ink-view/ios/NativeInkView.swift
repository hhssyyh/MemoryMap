import ExpoModulesCore
import PencilKit

/// PencilKit owns low-latency input while the cross-platform typed snapshot is
/// the persistence boundary. Native emits only completed-stroke deltas.
class NativeInkView: ExpoView, PKCanvasViewDelegate {
  private let canvasView = PKCanvasView()
  private let onInkChange = EventDispatcher()
  private let onReady = EventDispatcher()
  private let onCapabilities = EventDispatcher()
  private let onError = EventDispatcher()
  private var strokeIds: [String] = []
  private var strokeFingerprints: [String] = []
  private var currentRevision = 0
  private var hasAppliedSnapshot = false
  private var isApplyingDrawing = false
  private var pageWidth: CGFloat = 900
  private var pageHeight: CGFloat = 1200
  private var selectedTool = "pen"
  private var selectedColor = UIColor.black
  private var selectedWidth: CGFloat = 4
  private var hasPendingDrawingChange = false
  private var announcedReady = false
  private var pendingSnapshotJSON: String?
  private var lastLayoutSize: CGSize = .zero

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    canvasView.delegate = self
    canvasView.drawingPolicy = .pencilOnly
    canvasView.backgroundColor = .clear
    canvasView.isOpaque = false
    canvasView.alwaysBounceHorizontal = false
    canvasView.alwaysBounceVertical = false
    addSubview(canvasView)
    applyTool()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let nextSize = bounds.size
    canvasView.frame = bounds
    if let pendingSnapshotJSON, nextSize.width > 0, nextSize.height > 0 {
      self.pendingSnapshotJSON = nil
      applySnapshotJSON(pendingSnapshotJSON)
    } else if hasAppliedSnapshot,
              lastLayoutSize.width > 0,
              lastLayoutSize.height > 0,
              nextSize.width > 0,
              nextSize.height > 0,
              nextSize != lastLayoutSize {
      isApplyingDrawing = true
      canvasView.drawing = canvasView.drawing.transformed(
        using: CGAffineTransform(
          scaleX: nextSize.width / lastLayoutSize.width,
          y: nextSize.height / lastLayoutSize.height
        )
      )
      strokeFingerprints = canvasView.drawing.strokes.map(fingerprint)
      isApplyingDrawing = false
    }
    lastLayoutSize = nextSize
    applyTool()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, !announcedReady else { return }
    announcedReady = true
    onReady([:])
    onCapabilities([
      "pressure": true,
      "tilt": true,
      "palmRejection": true,
      "motionPrediction": true,
      "eraserMode": "wholeStroke",
    ])
  }

  func setInputMode(_ mode: String) {
    guard mode == "stylusOnly" || mode == "anyPointer" else {
      onError([
        "code": "unsupportedInputMode",
        "message": "Unsupported ink input mode: \(mode)",
        "recoverable": true,
      ])
      return
    }
    canvasView.drawingPolicy = mode == "stylusOnly" ? .pencilOnly : .anyInput
  }

  func setSelectedTool(_ tool: String) {
    guard ["pen", "highlighter", "eraser", "navigate"].contains(tool) else {
      onError([
        "code": "unsupportedTool",
        "message": "Unsupported ink tool: \(tool)",
        "recoverable": true,
      ])
      return
    }
    selectedTool = tool
    applyTool()
  }

  func setSelectedColor(_ color: String) {
    selectedColor = UIColor(hex: color) ?? .black
    applyTool()
  }

  func setSelectedWidth(_ width: Double) {
    selectedWidth = CGFloat(max(0.5, width))
    applyTool()
  }

  func setSnapshotJSON(_ json: String) {
    guard bounds.width > 0, bounds.height > 0 else {
      // Expo may deliver props before the native view receives its first
      // layout. Decoding with a fallback scale here would permanently restore
      // the drawing at the wrong size.
      pendingSnapshotJSON = json
      return
    }
    pendingSnapshotJSON = nil
    applySnapshotJSON(json)
  }

  private func applySnapshotJSON(_ json: String) {
    guard let data = json.data(using: .utf8),
          let snapshot = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let revision = snapshot["revision"] as? Int,
          let size = snapshot["pageSize"] as? [String: Any],
          let strokes = snapshot["strokes"] as? [[String: Any]] else {
      onError([
        "code": "invalidSnapshot",
        "message": "Invalid ink snapshot.",
        "recoverable": false,
      ])
      return
    }
    let nextPageWidth = max(1, CGFloat(size["width"] as? Double ?? 900))
    let nextPageHeight = max(1, CGFloat(size["height"] as? Double ?? 1200))
    let nextXScale = bounds.width / nextPageWidth
    let nextYScale = bounds.height / nextPageHeight
    let nextViewScale = nextXScale
    let decoded = strokes.compactMap { value -> (id: String, stroke: PKStroke)? in
      guard let id = value["id"] as? String,
            let stroke = NativeInkMath.makeStroke(
              value,
              xScale: nextXScale,
              yScale: nextYScale,
              viewScale: nextViewScale
            ) else { return nil }
      return (id, stroke)
    }
    guard decoded.count == strokes.count else {
      onError([
        "code": "invalidSnapshot",
        "message": "Every ink stroke must have an ID and at least one valid point.",
        "recoverable": false,
      ])
      return
    }
    let incomingIds = decoded.map(\.id)
    if hasAppliedSnapshot && revision == currentRevision && incomingIds == strokeIds { return }

    isApplyingDrawing = true
    pageWidth = nextPageWidth
    pageHeight = nextPageHeight
    currentRevision = revision
    strokeIds = incomingIds
    let drawingStrokes = decoded.map(\.stroke)
    canvasView.drawing = PKDrawing(strokes: drawingStrokes)
    strokeFingerprints = drawingStrokes.map(fingerprint)
    hasPendingDrawingChange = false
    hasAppliedSnapshot = true
    isApplyingDrawing = false
  }

  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    guard !isApplyingDrawing else { return }
    hasPendingDrawingChange = true
  }

  func canvasViewDidEndUsingTool(_ canvasView: PKCanvasView) {
    guard hasPendingDrawingChange else { return }
    hasPendingDrawingChange = false
    emitIncrementalChange()
  }

  private func applyTool() {
    if selectedTool == "eraser" {
      canvasView.tool = PKEraserTool(.vector)
      return
    }
    if selectedTool == "navigate" {
      canvasView.tool = PKInkingTool(.pen, color: .clear, width: 0.5)
      return
    }
    let inkType: PKInkingTool.InkType = selectedTool == "highlighter" ? .marker : .pen
    canvasView.tool = PKInkingTool(inkType, color: selectedColor, width: selectedWidth * viewScale)
  }

  private var viewScale: CGFloat {
    guard bounds.width > 0, pageWidth > 0 else { return 1 }
    return bounds.width / pageWidth
  }

  private var xScale: CGFloat { bounds.width > 0 ? bounds.width / pageWidth : 1 }
  private var yScale: CGFloat { bounds.height > 0 ? bounds.height / pageHeight : 1 }

  private func fingerprint(_ stroke: PKStroke) -> String {
    NativeInkMath.fingerprint(stroke)
  }

  private func emitIncrementalChange() {
    var idsByFingerprint: [String: [String]] = [:]
    for (index, fingerprint) in strokeFingerprints.enumerated() where index < strokeIds.count {
      idsByFingerprint[fingerprint, default: []].append(strokeIds[index])
    }

    let previousIds = Set(strokeIds)
    var nextIds: [String] = []
    let currentStrokes = canvasView.drawing.strokes
    let serialized = currentStrokes.map { stroke -> [String: Any] in
      let key = fingerprint(stroke)
      let id = idsByFingerprint[key]?.isEmpty == false
        ? idsByFingerprint[key]!.removeFirst()
        : "stroke-\(UUID().uuidString)"
      nextIds.append(id)
      return NativeInkMath.serialize(
        stroke,
        id: id,
        xScale: xScale,
        yScale: yScale,
        viewScale: viewScale,
        fallbackWidth: selectedWidth
      )
    }
    let nextIdSet = Set(nextIds)
    let added = serialized.filter { value in
      guard let id = value["id"] as? String else { return false }
      return !previousIds.contains(id)
    }
    let removed = Array(previousIds.subtracting(nextIdSet))

    strokeIds = nextIds
    strokeFingerprints = currentStrokes.map(fingerprint)
    guard !added.isEmpty || !removed.isEmpty else { return }
    onInkChange([
      "baseRevision": currentRevision,
      "changeId": UUID().uuidString,
      "addedStrokes": added,
      "removedStrokeIds": removed,
    ])
    currentRevision += 1
  }

}
