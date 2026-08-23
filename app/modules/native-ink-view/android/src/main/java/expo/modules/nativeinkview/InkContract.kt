package expo.modules.nativeinkview

import android.view.MotionEvent
import androidx.ink.brush.InputToolType
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.StrokeInputBatch
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

internal object InkInputPolicy {
  fun accepts(mode: String, toolType: Int): Boolean {
    if (mode == "anyPointer") return true
    return toolType == MotionEvent.TOOL_TYPE_STYLUS || toolType == MotionEvent.TOOL_TYPE_ERASER
  }
}

internal object InkSnapshotGate {
  fun shouldApply(
    hasAppliedSnapshot: Boolean,
    incomingRevision: Int,
    currentRevision: Int,
    incomingStrokeIds: List<String>,
    currentStrokeIds: List<String>,
  ) = !hasAppliedSnapshot ||
    incomingRevision != currentRevision ||
    incomingStrokeIds != currentStrokeIds
}

internal object InkTiltMath {
  fun magnitude(tiltX: Float, tiltY: Float) = hypot(tiltX, tiltY)
  fun orientation(azimuth: Float?, tiltX: Float, tiltY: Float): Float {
    val fullTurn = (Math.PI * 2).toFloat()
    val value = azimuth ?: atan2(tiltY, tiltX)
    return ((value % fullTurn) + fullTurn) % fullTurn
  }
  fun components(tilt: Float, orientation: Float) =
    Pair(tilt * cos(orientation), tilt * sin(orientation))
}

internal object InkColorMath {
  fun applyOpacity(argb: Int, opacity: Float): Int {
    val originalAlpha = argb ushr 24 and 0xff
    val alpha = (originalAlpha * opacity.coerceIn(0f, 1f)).toInt().coerceIn(0, 255)
    return (argb and 0x00ffffff) or (alpha shl 24)
  }
}

internal data class CommonInkPoint(
  val x: Float,
  val y: Float,
  val pressure: Float,
  val tiltX: Float,
  val tiltY: Float,
  val azimuth: Float?,
  val elapsedTimeMillis: Long,
)

internal object JetpackInkPointCodec {
  fun toInputBatch(points: List<CommonInkPoint>): MutableStrokeInputBatch {
    val batch = MutableStrokeInputBatch()
    points.forEach { point ->
      batch.add(
        InputToolType.STYLUS,
        point.x,
        point.y,
        point.elapsedTimeMillis.coerceAtLeast(0L),
        0.1f,
        point.pressure,
        InkTiltMath.magnitude(point.tiltX, point.tiltY),
        InkTiltMath.orientation(point.azimuth, point.tiltX, point.tiltY),
      )
    }
    return batch
  }

  fun fromInputBatch(inputs: StrokeInputBatch): List<CommonInkPoint> =
    (0 until inputs.size).map { index ->
      val input = inputs[index]
      val orientation = if (input.hasOrientation) input.orientationRadians else 0f
      val tilt = if (input.hasTilt) {
        InkTiltMath.components(input.tiltRadians, orientation)
      } else {
        Pair(0f, 0f)
      }
      CommonInkPoint(
        x = input.x,
        y = input.y,
        pressure = if (input.hasPressure) input.pressure else 0.5f,
        tiltX = tilt.first,
        tiltY = tilt.second,
        azimuth = if (input.hasOrientation) orientation else null,
        elapsedTimeMillis = input.elapsedTimeMillis,
      )
    }
}
