import ExpoModulesCore
import PencilKit

// Wraps PencilKit's `PKCanvasView` so it can be compared against the JS/Skia
// drawing path from the same RN screen. Inherits from `ExpoView` per Expo Modules
// convention for native view components.
class NativeInkView: ExpoView, PKCanvasViewDelegate {
  private let canvasView = PKCanvasView()
  private let onDrawingChange = EventDispatcher()
  private let strokeSessionId = UUID().uuidString
  private let toolPicker = PKToolPicker()
  private var lastClearTrigger = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    canvasView.delegate = self
    canvasView.drawingPolicy = .anyInput
    canvasView.backgroundColor = .white
    addSubview(canvasView)

    if #available(iOS 14.0, *) {
      toolPicker.setVisible(true, forFirstResponder: canvasView)
      toolPicker.addObserver(canvasView)
      canvasView.becomeFirstResponder()
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    canvasView.frame = bounds
  }

  func setDrawingPolicy(_ policy: String) {
    canvasView.drawingPolicy = policy == "pencilOnly" ? .pencilOnly : .anyInput
  }

  func handleClearTrigger(_ trigger: Int) {
    guard trigger != lastClearTrigger else { return }
    lastClearTrigger = trigger
    canvasView.drawing = PKDrawing()
    emitDrawingChange()
  }

  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    emitDrawingChange()
  }

  private func emitDrawingChange() {
    let strokes = canvasView.drawing.strokes.enumerated().map { index, stroke in
      serialize(stroke, id: "stroke-\(strokeSessionId)-\(index)")
    }
    onDrawingChange(["strokes": strokes])
  }

  private func serialize(_ stroke: PKStroke, id: String) -> [String: Any] {
    let points = stroke.path.map { point -> [String: Any] in
      [
        "x": point.location.x,
        "y": point.location.y,
        "pressure": point.force,
        "timestamp": point.timeOffset * 1000,
      ]
    }
    let averageWidth = stroke.path.isEmpty
      ? 3.0
      : stroke.path.reduce(CGFloat(0)) { $0 + $1.size.width } / CGFloat(stroke.path.count)

    return [
      "id": id,
      "points": points,
      "color": stroke.ink.color.toHexString(),
      "width": averageWidth,
    ]
  }
}

private extension UIColor {
  func toHexString() -> String {
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    getRed(&red, green: &green, blue: &blue, alpha: &alpha)
    return String(format: "#%02X%02X%02X", Int(red * 255), Int(green * 255), Int(blue * 255))
  }
}
