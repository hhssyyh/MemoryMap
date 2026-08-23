package expo.modules.nativeinkview

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/** Runs on Android because Jetpack Ink's StrokeInputBatch implementation uses JNI. */
@RunWith(AndroidJUnit4::class)
class JetpackInkPointCodecInstrumentedTest {
  @Test
  fun commonPointsRoundTripThroughJetpackInputBatch() {
    val secondAzimuth = InkTiltMath.orientation(null, 0.31f, -0.22f)
    val points = listOf(
      CommonInkPoint(10f, 20f, 0.3f, 0.2f, -0.1f, null, 0L),
      CommonInkPoint(30f, 40f, 0.8f, 0.31f, -0.22f, secondAzimuth, 16L),
    )
    val restored = JetpackInkPointCodec.fromInputBatch(JetpackInkPointCodec.toInputBatch(points))

    assertEquals(2, restored.size)
    assertEquals(points[1].x, restored[1].x, 0.0001f)
    assertEquals(points[1].y, restored[1].y, 0.0001f)
    assertEquals(points[1].pressure, restored[1].pressure, 0.0001f)
    assertEquals(points[1].tiltX, restored[1].tiltX, 0.0001f)
    assertEquals(points[1].tiltY, restored[1].tiltY, 0.0001f)
    assertEquals(points[1].azimuth!!, restored[1].azimuth!!, 0.0001f)
    assertEquals(points[1].elapsedTimeMillis, restored[1].elapsedTimeMillis)
  }
}
