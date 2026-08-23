import Foundation

private func assertClose(_ actual: CGFloat, _ expected: CGFloat, _ message: String) {
  guard abs(actual - expected) < 0.0001 else {
    fatalError("\(message): expected \(expected), got \(actual)")
  }
}

let tiltX: CGFloat = 0.31
let tiltY: CGFloat = -0.22
let pencil = NativeInkMath.pencilAngles(tiltX: tiltX, tiltY: tiltY, azimuth: nil)
let restored = NativeInkMath.commonTilt(azimuth: pencil.azimuth, altitude: pencil.altitude)
assertClose(restored.tiltX, tiltX, "tiltX round trip")
assertClose(restored.tiltY, tiltY, "tiltY round trip")

let canvas = NativeInkMath.canvasCoordinate(125, scale: 0.75)
assertClose(NativeInkMath.logicalCoordinate(canvas, scale: 0.75), 125, "coordinate round trip")

let commonStroke: [String: Any] = [
  "id": "round-trip",
  "tool": "highlighter",
  "color": "#C84C5A",
  "width": 8.0,
  "opacity": 0.35,
  "points": [
    ["x": 100.0, "y": 200.0, "pressure": 0.4, "tiltX": 0.2, "tiltY": -0.1, "timestamp": 1_000.0],
    ["x": 125.0, "y": 230.0, "pressure": 0.8, "tiltX": 0.3, "tiltY": -0.15, "timestamp": 1_016.0],
  ],
]
guard let pencilStroke = NativeInkMath.makeStroke(
  commonStroke,
  xScale: 0.5,
  yScale: 0.75,
  viewScale: 0.5
) else { fatalError("common stroke should create a PKStroke") }
let serialized = NativeInkMath.serialize(
  pencilStroke,
  id: "round-trip",
  xScale: 0.5,
  yScale: 0.75,
  viewScale: 0.5,
  fallbackWidth: 4
)
guard let points = serialized["points"] as? [[String: Any]], points.count == 2 else {
  fatalError("PKStroke should serialize both common points")
}
assertClose(points[0]["x"] as! CGFloat, 100, "PKStroke x round trip")
assertClose(points[1]["y"] as! CGFloat, 230, "PKStroke y round trip")
assertClose(points[1]["pressure"] as! CGFloat, 0.8, "PKStroke pressure round trip")
assertClose(serialized["width"] as! CGFloat, 8, "PKStroke width round trip")
guard serialized["tool"] as? String == "highlighter" else { fatalError("tool round trip") }
guard serialized["color"] as? String == "#C84C5A" else { fatalError("color round trip") }

var collisionCandidate = commonStroke
collisionCandidate["points"] = [
  ["x": 100.0, "y": 200.0, "pressure": 0.4, "timestamp": 1_000.0],
  ["x": 110.0, "y": 220.0, "pressure": 0.6, "timestamp": 1_008.0],
  ["x": 125.0, "y": 230.0, "pressure": 0.8, "timestamp": 1_016.0],
]
var distinctCandidate = collisionCandidate
distinctCandidate["points"] = [
  ["x": 100.0, "y": 200.0, "pressure": 0.4, "timestamp": 1_000.0],
  ["x": 120.0, "y": 210.0, "pressure": 0.6, "timestamp": 1_008.0],
  ["x": 125.0, "y": 230.0, "pressure": 0.8, "timestamp": 1_016.0],
]
guard
  let firstCollisionStroke = NativeInkMath.makeStroke(collisionCandidate, xScale: 1, yScale: 1, viewScale: 1),
  let secondCollisionStroke = NativeInkMath.makeStroke(distinctCandidate, xScale: 1, yScale: 1, viewScale: 1),
  NativeInkMath.fingerprint(firstCollisionStroke) != NativeInkMath.fingerprint(secondCollisionStroke)
else { fatalError("different PencilKit paths must not share a fingerprint") }

print("NativeInkMath and PencilKit round-trip tests passed")
