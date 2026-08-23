package expo.modules.nativeinkview

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup.LayoutParams
import androidx.ink.authoring.InProgressStrokeId
import androidx.ink.authoring.InProgressStrokesFinishedListener
import androidx.ink.authoring.InProgressStrokesView
import androidx.ink.brush.Brush
import androidx.ink.brush.StockBrushes
import androidx.ink.geometry.MutableBox
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.strokes.Stroke
import androidx.input.motionprediction.MotionEventPredictor
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.UUID
import org.json.JSONObject

private data class StrokeStyle(
  val id: String,
  val tool: String,
  val color: String,
  val width: Float,
  val opacity: Float,
)

private data class StoredStroke(val style: StrokeStyle, val stroke: Stroke)

/**
 * Jetpack Ink owns wet rendering and predicted input. The document-facing
 * boundary remains the same typed snapshot/change contract as PencilKit.
 */
class NativeInkView(context: Context, appContext: AppContext) : ExpoView(context, appContext),
  InProgressStrokesFinishedListener {
  private val onInkChange by EventDispatcher()
  private val onReady by EventDispatcher()
  private val onCapabilities by EventDispatcher()
  private val onError by EventDispatcher()

  private val completed = mutableListOf<StoredStroke>()
  private val eraserRemoved = mutableListOf<StoredStroke>()
  private var eraserBeforeGesture: List<StoredStroke>? = null
  private val pendingStyles = mutableMapOf<InProgressStrokeId, StrokeStyle>()
  private val dryView = DryInkView(context)
  private val inProgressView = InProgressStrokesView(context)
  private val predictor = MotionEventPredictor.newInstance(inProgressView)
  private var currentStrokeId: InProgressStrokeId? = null
  private var currentPointerId = -1
  private var inputMode = "stylusOnly"
  private var selectedTool = "pen"
  private var selectedColor = "#3D3A39"
  private var selectedWidth = 4f
  private var pageWidth = 900f
  private var pageHeight = 1200f
  private var currentRevision = 0
  private var hasAppliedSnapshot = false
  private var applyingSnapshot = false
  private var announcedReady = false

  init {
    dryView.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    inProgressView.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(dryView)
    addView(inProgressView)
    inProgressView.addFinishedStrokesListener(this)
    inProgressView.setOnTouchListener(::handleTouch)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (!announcedReady) {
      announcedReady = true
      post {
        onReady(emptyMap<String, Any>())
        onCapabilities(
          mapOf(
            "pressure" to true,
            "tilt" to true,
            "palmRejection" to true,
            "motionPrediction" to true,
            "eraserMode" to "wholeStroke",
          ),
        )
      }
    }
  }

  fun setInputMode(mode: String) {
    if (mode != "stylusOnly" && mode != "anyPointer") {
      onError(
        mapOf(
          "code" to "unsupportedInputMode",
          "message" to "Unsupported ink input mode: $mode",
          "recoverable" to true,
        ),
      )
      return
    }
    inputMode = mode
  }

  fun setSelectedTool(tool: String) {
    if (tool !in setOf("pen", "highlighter", "eraser", "navigate")) {
      onError(
        mapOf(
          "code" to "unsupportedTool",
          "message" to "Unsupported ink tool: $tool",
          "recoverable" to true,
        ),
      )
      return
    }
    selectedTool = tool
  }

  fun setSelectedColor(color: String) {
    selectedColor = color
  }

  fun setSelectedWidth(width: Double) {
    selectedWidth = width.toFloat().coerceAtLeast(0.5f)
  }

  fun setSnapshotJson(json: String) {
    try {
      val snapshot = JSONObject(json)
      val revision = snapshot.getInt("revision")
      val size = snapshot.getJSONObject("pageSize")
      val rawStrokes = snapshot.getJSONArray("strokes")
      val incomingIds = (0 until rawStrokes.length()).map {
        rawStrokes.getJSONObject(it).getString("id")
      }
      if (!InkSnapshotGate.shouldApply(
          hasAppliedSnapshot,
          revision,
          currentRevision,
          incomingIds,
          completed.map { it.style.id },
        )) return

      applyingSnapshot = true
      val parsedStrokes = (0 until rawStrokes.length()).map { index ->
        parseStoredStroke(rawStrokes.getJSONObject(index))
          ?: throw IllegalArgumentException("Every ink stroke must contain at least one valid point.")
      }
      inProgressView.cancelUnfinishedStrokes()
      pendingStyles.clear()
      eraserRemoved.clear()
      eraserBeforeGesture = null
      currentStrokeId = null
      currentPointerId = -1
      pageWidth = size.getDouble("width").toFloat().coerceAtLeast(1f)
      pageHeight = size.getDouble("height").toFloat().coerceAtLeast(1f)
      currentRevision = revision
      completed.clear()
      completed.addAll(parsedStrokes)
      hasAppliedSnapshot = true
      dryView.invalidate()
    } catch (error: Throwable) {
      onError(
        mapOf(
          "code" to "invalidSnapshot",
          "message" to (error.message ?: "Invalid ink snapshot."),
          "recoverable" to false,
        ),
      )
    } finally {
      applyingSnapshot = false
    }
  }

  private fun handleTouch(view: View, event: MotionEvent): Boolean {
    val pointerIndex = event.actionIndex.coerceAtLeast(0)
    val toolType = event.getToolType(pointerIndex.coerceAtMost(event.pointerCount - 1))
    if (!InkInputPolicy.accepts(inputMode, toolType)) return false
    if (selectedTool == "navigate") return false

    val canceled = event.actionMasked == MotionEvent.ACTION_CANCEL ||
      event.flags and MotionEvent.FLAG_CANCELED != 0
    if (selectedTool == "eraser") {
      if (canceled) {
        restoreCanceledErase()
        return true
      }
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          eraserRemoved.clear()
          eraserBeforeGesture = completed.toList()
          eraseAt(event.x * pageWidth / width.coerceAtLeast(1), event.y * pageHeight / height.coerceAtLeast(1))
        }
        MotionEvent.ACTION_MOVE -> {
          eraseAt(event.x * pageWidth / width.coerceAtLeast(1), event.y * pageHeight / height.coerceAtLeast(1))
        }
        MotionEvent.ACTION_UP -> {
          eraseAt(event.x * pageWidth / width.coerceAtLeast(1), event.y * pageHeight / height.coerceAtLeast(1))
          commitEraseGesture()
        }
      }
      return true
    }

    if (canceled) {
      currentStrokeId?.let { inProgressView.cancelStroke(it, event) }
      currentStrokeId?.let(pendingStyles::remove)
      currentStrokeId = null
      currentPointerId = -1
      return true
    }

    try {
      predictor.record(event)
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          view.requestUnbufferedDispatch(event)
          currentPointerId = event.getPointerId(pointerIndex)
          val style = StrokeStyle(
            id = "stroke-${UUID.randomUUID()}",
            tool = if (selectedTool == "highlighter") "highlighter" else "pen",
            color = selectedColor,
            width = selectedWidth,
            opacity = if (selectedTool == "highlighter") 0.35f else 1f,
          )
          val strokeId = inProgressView.startStroke(
            event,
            currentPointerId,
            brushFor(style),
            eventToPageMatrix(),
          )
          currentStrokeId = strokeId
          pendingStyles[strokeId] = style
          return true
        }
        MotionEvent.ACTION_POINTER_DOWN -> {
          currentStrokeId?.let { inProgressView.cancelStroke(it, event) }
          currentStrokeId?.let(pendingStyles::remove)
          currentStrokeId = null
          currentPointerId = -1
          return false
        }
        MotionEvent.ACTION_MOVE -> {
          val strokeId = currentStrokeId ?: return false
          val prediction = predictor.predict()
          try {
            inProgressView.addToStroke(event, currentPointerId, strokeId, prediction)
          } finally {
            prediction?.recycle()
          }
          return true
        }
        MotionEvent.ACTION_UP -> {
          val strokeId = currentStrokeId ?: return false
          inProgressView.finishStroke(event, currentPointerId, strokeId)
          currentStrokeId = null
          currentPointerId = -1
          return true
        }
      }
    } catch (error: Throwable) {
      onError(
        mapOf(
          "code" to "nativeFailure",
          "message" to (error.message ?: "Jetpack Ink input failed."),
          "recoverable" to true,
        ),
      )
    }
    return false
  }

  override fun onStrokesFinished(strokes: Map<InProgressStrokeId, Stroke>) {
    if (applyingSnapshot) {
      strokes.keys.forEach(pendingStyles::remove)
      inProgressView.removeFinishedStrokes(strokes.keys)
      return
    }
    val added = mutableListOf<Map<String, Any>>()
    strokes.forEach { (inkId, stroke) ->
      val style = pendingStyles.remove(inkId) ?: return@forEach
      completed.add(StoredStroke(style, stroke))
      added.add(serialize(StoredStroke(style, stroke)))
    }
    inProgressView.removeFinishedStrokes(strokes.keys)
    dryView.invalidate()
    if (added.isNotEmpty()) emitChange(added, emptyList())
  }

  private fun eraseAt(x: Float, y: Float) {
    val radius = (selectedWidth * 2.5f).coerceAtLeast(12f)
    val eraserBox = MutableBox()
      .setXBounds(x - radius, x + radius)
      .setYBounds(y - radius, y + radius)
    val removed = completed
      .filter { it.stroke.shape.computeCoverageIsGreaterThan(eraserBox, 0f) }
    if (removed.isEmpty()) return
    val removedIds = removed.mapTo(mutableSetOf()) { it.style.id }
    eraserRemoved.addAll(removed.filter { candidate ->
      eraserRemoved.none { it.style.id == candidate.style.id }
    })
    completed.removeAll { it.style.id in removedIds }
    dryView.invalidate()
  }

  private fun commitEraseGesture() {
    if (eraserRemoved.isEmpty()) return
    emitChange(emptyList(), eraserRemoved.map { it.style.id })
    eraserRemoved.clear()
    eraserBeforeGesture = null
  }

  private fun restoreCanceledErase() {
    val snapshot = eraserBeforeGesture ?: return
    completed.clear()
    completed.addAll(snapshot)
    eraserRemoved.clear()
    eraserBeforeGesture = null
    dryView.invalidate()
  }

  private fun emitChange(added: List<Map<String, Any>>, removed: List<String>) {
    onInkChange(
      mapOf(
        "baseRevision" to currentRevision,
        "changeId" to UUID.randomUUID().toString(),
        "addedStrokes" to added,
        "removedStrokeIds" to removed,
      ),
    )
    currentRevision += 1
  }

  private fun eventToPageMatrix() = Matrix().apply {
    setScale(pageWidth / width.coerceAtLeast(1), pageHeight / height.coerceAtLeast(1))
  }

  private fun pageToViewMatrix() = Matrix().apply {
    setScale(width.coerceAtLeast(1) / pageWidth, height.coerceAtLeast(1) / pageHeight)
  }

  private fun brushFor(style: StrokeStyle): Brush {
    val family = if (style.tool == "highlighter") StockBrushes.highlighter() else StockBrushes.pressurePen()
    return Brush.createWithColorIntArgb(
      family,
      InkColorMath.applyOpacity(Color.parseColor(style.color), style.opacity),
      style.width,
      0.1f,
    )
  }

  private fun parseStoredStroke(value: JSONObject): StoredStroke? {
    val style = StrokeStyle(
      id = value.getString("id"),
      tool = value.optString("tool", "pen"),
      color = value.optString("color", "#3D3A39"),
      width = value.optDouble("width", 4.0).toFloat(),
      opacity = value.optDouble("opacity", 1.0).toFloat(),
    )
    val points = value.getJSONArray("points")
    if (points.length() == 0) return null
    val firstTimestamp = points.getJSONObject(0).optLong("timestamp", 0L)
    val commonPoints = mutableListOf<CommonInkPoint>()
    for (index in 0 until points.length()) {
      val point = points.getJSONObject(index)
      val tiltX = point.optDouble("tiltX", 0.0).toFloat()
      val tiltY = point.optDouble("tiltY", 0.0).toFloat()
      commonPoints.add(CommonInkPoint(
        x = point.getDouble("x").toFloat(),
        y = point.getDouble("y").toFloat(),
        pressure = point.optDouble("pressure", 0.5).toFloat(),
        tiltX = tiltX,
        tiltY = tiltY,
        azimuth = if (point.has("azimuth")) point.getDouble("azimuth").toFloat() else null,
        elapsedTimeMillis = (point.optLong("timestamp", firstTimestamp) - firstTimestamp).coerceAtLeast(0L),
      ))
    }
    return StoredStroke(style, Stroke(brushFor(style), JetpackInkPointCodec.toInputBatch(commonPoints)))
  }

  private fun serialize(stored: StoredStroke): Map<String, Any> {
    val points = ArrayList<Map<String, Any>>(stored.stroke.inputs.size)
    JetpackInkPointCodec.fromInputBatch(stored.stroke.inputs).forEach { input ->
      val point = mutableMapOf<String, Any>(
        "x" to input.x,
        "y" to input.y,
        "pressure" to input.pressure,
        "timestamp" to input.elapsedTimeMillis,
      )
      if (input.azimuth != null) {
        point["tiltX"] = input.tiltX
        point["tiltY"] = input.tiltY
        point["azimuth"] = input.azimuth
      }
      points.add(point)
    }
    return mapOf(
      "id" to stored.style.id,
      "points" to points,
      "tool" to stored.style.tool,
      "color" to stored.style.color,
      "width" to stored.style.width,
      "opacity" to stored.style.opacity,
    )
  }

  private inner class DryInkView(context: Context) : View(context) {
    private val renderer = CanvasStrokeRenderer.create(false)

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      val transform = pageToViewMatrix()
      completed.forEach { renderer.draw(canvas, it.stroke, transform) }
    }
  }
}
