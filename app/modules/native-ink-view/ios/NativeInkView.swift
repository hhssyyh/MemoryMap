import ExpoModulesCore
import PencilKit

// 저지연 Apple Pencil 입력은 PencilKit이 담당한다. 다만 React Native 문서를
// 원본으로 유지하기 위해 PKDrawing과 공통 페이지 좌표 JSON을 양방향 변환한다.
class NativeInkView: ExpoView, PKCanvasViewDelegate {
  private let canvasView = PKCanvasView()
  private let onDrawingChange = EventDispatcher()
  private var strokeIds: [String] = []
  private var lastAppliedJSON = ""
  private var isApplyingDrawing = false
  private var pageWidth: CGFloat = 900
  private var pageHeight: CGFloat = 1200
  private var selectedTool = "pen"
  private var selectedColor = UIColor.black
  private var selectedWidth: CGFloat = 4
  private var lastClearTrigger = 0
  private var hasPendingDrawingChange = false

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
    canvasView.frame = bounds
  }

  func setDrawingPolicy(_ policy: String) {
    canvasView.drawingPolicy = policy == "pencilOnly" ? .pencilOnly : .anyInput
  }

  func setPageSize(width: Double?, height: Double?) {
    if let width, width > 0 { pageWidth = CGFloat(width) }
    if let height, height > 0 { pageHeight = CGFloat(height) }
  }

  func setSelectedTool(_ tool: String) {
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

  func setStrokesJSON(_ json: String) {
    guard json != lastAppliedJSON, let data = json.data(using: .utf8) else { return }
    guard let strokes = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
    isApplyingDrawing = true
    strokeIds = strokes.compactMap { $0["id"] as? String }
    canvasView.drawing = PKDrawing(strokes: strokes.compactMap(makeStroke))
    lastAppliedJSON = json
    isApplyingDrawing = false
  }

  func handleClearTrigger(_ trigger: Int) {
    guard trigger != lastClearTrigger else { return }
    lastClearTrigger = trigger
    strokeIds = []
    canvasView.drawing = PKDrawing()
    emitDrawingChange()
  }

  func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
    guard !isApplyingDrawing else { return }
    // PencilKit은 한 획을 그리는 중에도 이 메서드를 반복 호출한다. 펜을 뗄 때까지
    // 브리지 이벤트를 미뤄야 한 획이 하나의 실행 취소 단계가 된다.
    hasPendingDrawingChange = true
  }

  func canvasViewDidEndUsingTool(_ canvasView: PKCanvasView) {
    guard hasPendingDrawingChange else { return }
    hasPendingDrawingChange = false
    emitDrawingChange()
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

  private func makeStroke(_ value: [String: Any]) -> PKStroke? {
    guard let rawPoints = value["points"] as? [[String: Any]], !rawPoints.isEmpty else { return nil }
    let color = UIColor(hex: value["color"] as? String ?? "#000000") ?? .black
    let tool = value["tool"] as? String ?? "pen"
    let inkType: PKInk.InkType = tool == "highlighter" ? .marker : .pen
    let logicalWidth = value["width"] as? Double ?? 4
    let opacity = value["opacity"] as? Double ?? (tool == "highlighter" ? 0.35 : 1)
    let startTime = rawPoints.first?["timestamp"] as? Double ?? 0
    let points = rawPoints.compactMap { raw -> PKStrokePoint? in
      guard let x = raw["x"] as? Double, let y = raw["y"] as? Double else { return nil }
      let timestamp = raw["timestamp"] as? Double ?? startTime
      return PKStrokePoint(
        location: CGPoint(x: CGFloat(x) * xScale, y: CGFloat(y) * yScale),
        timeOffset: max(0, (timestamp - startTime) / 1000),
        size: CGSize(width: logicalWidth * Double(viewScale), height: logicalWidth * Double(viewScale)),
        opacity: CGFloat(opacity),
        force: CGFloat(raw["pressure"] as? Double ?? 0.5),
        azimuth: CGFloat(raw["azimuth"] as? Double ?? 0),
        altitude: .pi / 2
      )
    }
    guard !points.isEmpty else { return nil }
    return PKStroke(ink: PKInk(inkType, color: color), path: PKStrokePath(controlPoints: points, creationDate: Date()))
  }

  private var xScale: CGFloat { bounds.width > 0 ? bounds.width / pageWidth : 1 }
  private var yScale: CGFloat { bounds.height > 0 ? bounds.height / pageHeight : 1 }

  private func emitDrawingChange() {
    let strokes = canvasView.drawing.strokes.enumerated().map { index, stroke in
      let id: String
      if index < strokeIds.count {
        id = strokeIds[index]
      } else {
        id = "stroke-\(UUID().uuidString)"
        strokeIds.append(id)
      }
      return serialize(stroke, id: id)
    }
    let payload = ["strokes": strokes]
    if let data = try? JSONSerialization.data(withJSONObject: strokes),
       let json = String(data: data, encoding: .utf8) {
      lastAppliedJSON = json
    }
    onDrawingChange(payload)
  }

  private func serialize(_ stroke: PKStroke, id: String) -> [String: Any] {
    let points = stroke.path.map { point -> [String: Any] in
      [
        "x": point.location.x / xScale,
        "y": point.location.y / yScale,
        "pressure": point.force,
        "azimuth": point.azimuth,
        "timestamp": point.timeOffset * 1000,
      ]
    }
    let logicalWidth = stroke.path.isEmpty
      ? selectedWidth
      : stroke.path.reduce(CGFloat(0)) { $0 + $1.size.width } / CGFloat(stroke.path.count) / viewScale
    let tool = stroke.ink.inkType == .marker ? "highlighter" : "pen"
    return [
      "id": id,
      "points": points,
      "tool": tool,
      "color": stroke.ink.color.toHexString(),
      "width": logicalWidth,
      "opacity": tool == "highlighter" ? 0.35 : 1,
    ]
  }
}

private extension UIColor {
  convenience init?(hex: String) {
    let value = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard value.count == 6, let number = Int(value, radix: 16) else { return nil }
    self.init(
      red: CGFloat((number >> 16) & 0xff) / 255,
      green: CGFloat((number >> 8) & 0xff) / 255,
      blue: CGFloat(number & 0xff) / 255,
      alpha: 1
    )
  }

  func toHexString() -> String {
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    getRed(&red, green: &green, blue: &blue, alpha: &alpha)
    return String(format: "#%02X%02X%02X", Int(red * 255), Int(green * 255), Int(blue * 255))
  }
}
