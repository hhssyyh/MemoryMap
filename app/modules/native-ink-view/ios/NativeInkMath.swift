import Foundation
import PencilKit
#if canImport(UIKit)
import UIKit
typealias NativeInkColor = UIColor
#elseif canImport(AppKit)
import AppKit
typealias NativeInkColor = NSColor
#endif

enum NativeInkMath {
  static func pencilAngles(tiltX: CGFloat, tiltY: CGFloat, azimuth: CGFloat?) -> (azimuth: CGFloat, altitude: CGFloat) {
    let resolvedAzimuth = azimuth ?? atan2(tiltY, tiltX)
    let tilt = hypot(tiltX, tiltY)
    return (resolvedAzimuth, max(0, .pi / 2 - tilt))
  }

  static func commonTilt(azimuth: CGFloat, altitude: CGFloat) -> (tiltX: CGFloat, tiltY: CGFloat) {
    let tilt = .pi / 2 - altitude
    return (tilt * cos(azimuth), tilt * sin(azimuth))
  }

  static func canvasCoordinate(_ logical: CGFloat, scale: CGFloat) -> CGFloat {
    logical * scale
  }

  static func logicalCoordinate(_ canvas: CGFloat, scale: CGFloat) -> CGFloat {
    canvas / max(scale, .leastNonzeroMagnitude)
  }

  static func makeStroke(
    _ value: [String: Any],
    xScale: CGFloat,
    yScale: CGFloat,
    viewScale: CGFloat
  ) -> PKStroke? {
    guard let rawPoints = value["points"] as? [[String: Any]], !rawPoints.isEmpty else { return nil }
    let color = NativeInkColor(hex: value["color"] as? String ?? "#000000") ?? .black
    let tool = value["tool"] as? String ?? "pen"
    let inkType: PKInk.InkType = tool == "highlighter" ? .marker : .pen
    let logicalWidth = value["width"] as? Double ?? 4
    let opacity = value["opacity"] as? Double ?? (tool == "highlighter" ? 0.35 : 1)
    let startTime = rawPoints.first?["timestamp"] as? Double ?? 0
    let points = rawPoints.compactMap { raw -> PKStrokePoint? in
      guard let x = raw["x"] as? Double, let y = raw["y"] as? Double else { return nil }
      let timestamp = raw["timestamp"] as? Double ?? startTime
      let tiltX = raw["tiltX"] as? Double ?? 0
      let tiltY = raw["tiltY"] as? Double ?? 0
      let pencilAngles = pencilAngles(
        tiltX: CGFloat(tiltX),
        tiltY: CGFloat(tiltY),
        azimuth: (raw["azimuth"] as? Double).map { CGFloat($0) }
      )
      return PKStrokePoint(
        location: CGPoint(
          x: canvasCoordinate(CGFloat(x), scale: xScale),
          y: canvasCoordinate(CGFloat(y), scale: yScale)
        ),
        timeOffset: max(0, (timestamp - startTime) / 1000),
        size: CGSize(width: logicalWidth * Double(viewScale), height: logicalWidth * Double(viewScale)),
        opacity: CGFloat(opacity),
        force: CGFloat(raw["pressure"] as? Double ?? 0.5),
        azimuth: pencilAngles.azimuth,
        altitude: pencilAngles.altitude
      )
    }
    guard !points.isEmpty else { return nil }
    return PKStroke(
      ink: PKInk(inkType, color: color),
      path: PKStrokePath(controlPoints: points, creationDate: Date())
    )
  }

  static func serialize(
    _ stroke: PKStroke,
    id: String,
    xScale: CGFloat,
    yScale: CGFloat,
    viewScale: CGFloat,
    fallbackWidth: CGFloat
  ) -> [String: Any] {
    let points = stroke.path.map { point -> [String: Any] in
      let tilt = commonTilt(azimuth: point.azimuth, altitude: point.altitude)
      return [
        "x": logicalCoordinate(point.location.x, scale: xScale),
        "y": logicalCoordinate(point.location.y, scale: yScale),
        "pressure": point.force,
        "azimuth": point.azimuth,
        "tiltX": tilt.tiltX,
        "tiltY": tilt.tiltY,
        "timestamp": point.timeOffset * 1000,
      ]
    }
    let logicalWidth = stroke.path.isEmpty
      ? fallbackWidth
      : stroke.path.reduce(CGFloat(0)) { $0 + $1.size.width } /
        CGFloat(stroke.path.count) / max(viewScale, .leastNonzeroMagnitude)
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

  static func fingerprint(_ stroke: PKStroke) -> String {
    var hasher = Hasher()
    hasher.combine(String(describing: stroke.ink.inkType))
    hasher.combine(stroke.ink.color.toHexString())
    hasher.combine(stroke.path.count)
    for point in stroke.path {
      hasher.combine(Double(point.location.x).bitPattern)
      hasher.combine(Double(point.location.y).bitPattern)
      hasher.combine(point.timeOffset.bitPattern)
      hasher.combine(Double(point.size.width).bitPattern)
      hasher.combine(Double(point.size.height).bitPattern)
      hasher.combine(Double(point.opacity).bitPattern)
      hasher.combine(Double(point.force).bitPattern)
      hasher.combine(Double(point.azimuth).bitPattern)
      hasher.combine(Double(point.altitude).bitPattern)
    }
    return String(hasher.finalize())
  }
}

#if canImport(UIKit)
extension UIColor {
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
#elseif canImport(AppKit)
extension NSColor {
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
    guard let color = usingColorSpace(.deviceRGB) else { return "#000000" }
    return String(
      format: "#%02X%02X%02X",
      Int(color.redComponent * 255),
      Int(color.greenComponent * 255),
      Int(color.blueComponent * 255)
    )
  }
}
#endif
