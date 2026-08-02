package expo.modules.nativeinkview

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup.LayoutParams
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

private const val BASE_STROKE_WIDTH = 6f
private const val STROKE_COLOR = "#24312B"

private data class InkPoint(val x: Float, val y: Float, val pressure: Float, val timestamp: Long)

private class Stroke {
  val points = mutableListOf<InkPoint>()
  val path = Path()

  fun addPoint(point: InkPoint) {
    if (points.isEmpty()) {
      path.moveTo(point.x, point.y)
    } else {
      path.lineTo(point.x, point.y)
    }
    points.add(point)
  }

  fun averageWidth(): Float {
    if (points.isEmpty()) return BASE_STROKE_WIDTH
    val avgPressure = points.map { it.pressure }.average().toFloat()
    return BASE_STROKE_WIDTH + avgPressure * BASE_STROKE_WIDTH * 2
  }
}

class NativeInkView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onDrawingChange by EventDispatcher()

  private val strokes = mutableListOf<Stroke>()
  private var currentStroke: Stroke? = null
  private var lastClearTrigger = 0

  private val paint = Paint().apply {
    color = Color.parseColor(STROKE_COLOR)
    style = Paint.Style.STROKE
    strokeJoin = Paint.Join.ROUND
    strokeCap = Paint.Cap.ROUND
    isAntiAlias = true
  }

  private val drawingSurface = DrawingSurface(context)

  private inner class DrawingSurface(context: Context) : View(context) {
    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      strokes.forEach { stroke ->
        paint.strokeWidth = stroke.averageWidth()
        canvas.drawPath(stroke.path, paint)
      }
      currentStroke?.let { stroke ->
        paint.strokeWidth = stroke.averageWidth()
        canvas.drawPath(stroke.path, paint)
      }
    }

    // Standard Android stylus API (MotionEvent.getToolType / getPressure) — S-Pen is
    // reported as MotionEvent.TOOL_TYPE_STYLUS through this same path, no Samsung SDK needed.
    override fun onTouchEvent(event: MotionEvent): Boolean {
      val point = InkPoint(
        x = event.x,
        y = event.y,
        pressure = event.pressure.coerceIn(0f, 1f),
        timestamp = System.currentTimeMillis(),
      )

      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          currentStroke = Stroke().apply { addPoint(point) }
        }
        MotionEvent.ACTION_MOVE -> {
          currentStroke?.addPoint(point)
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          currentStroke?.let {
            it.addPoint(point)
            strokes.add(it)
          }
          currentStroke = null
          emitDrawingChange()
        }
        else -> return false
      }
      invalidate()
      return true
    }
  }

  init {
    drawingSurface.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(drawingSurface)
  }

  fun handleClearTrigger(trigger: Int) {
    if (trigger == lastClearTrigger) return
    lastClearTrigger = trigger
    strokes.clear()
    currentStroke = null
    drawingSurface.invalidate()
    emitDrawingChange()
  }

  private fun emitDrawingChange() {
    val payload = strokes.mapIndexed { index, stroke ->
      mapOf(
        "id" to "stroke-$index-${stroke.points.firstOrNull()?.timestamp ?: 0}",
        "points" to stroke.points.map { point ->
          mapOf(
            "x" to point.x,
            "y" to point.y,
            "pressure" to point.pressure,
            "timestamp" to point.timestamp,
          )
        },
        "color" to STROKE_COLOR,
        "width" to stroke.averageWidth(),
      )
    }
    onDrawingChange(mapOf("strokes" to payload))
  }
}
