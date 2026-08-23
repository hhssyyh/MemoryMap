package expo.modules.nativeinkview

import android.view.MotionEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InkContractTest {
  @Test
  fun stylusOnlyRejectsFingerButAcceptsStylusAndEraser() {
    assertFalse(InkInputPolicy.accepts("stylusOnly", MotionEvent.TOOL_TYPE_FINGER))
    assertTrue(InkInputPolicy.accepts("stylusOnly", MotionEvent.TOOL_TYPE_STYLUS))
    assertTrue(InkInputPolicy.accepts("stylusOnly", MotionEvent.TOOL_TYPE_ERASER))
    assertTrue(InkInputPolicy.accepts("anyPointer", MotionEvent.TOOL_TYPE_FINGER))
  }

  @Test
  fun identicalSnapshotIsNotAppliedTwice() {
    assertTrue(InkSnapshotGate.shouldApply(false, 0, 0, emptyList(), emptyList()))
    assertFalse(InkSnapshotGate.shouldApply(true, 4, 4, listOf("a", "b"), listOf("a", "b")))
    assertTrue(InkSnapshotGate.shouldApply(true, 5, 4, listOf("a", "b"), listOf("a", "b")))
    assertTrue(InkSnapshotGate.shouldApply(true, 4, 4, listOf("a"), listOf("a", "b")))
  }

  @Test
  fun tiltRoundTripsThroughJetpackMagnitudeAndOrientation() {
    val tiltX = 0.31f
    val tiltY = -0.22f
    val magnitude = InkTiltMath.magnitude(tiltX, tiltY)
    val orientation = InkTiltMath.orientation(null, tiltX, tiltY)
    assertTrue(orientation >= 0f)
    assertTrue(orientation < (Math.PI * 2).toFloat())
    val restored = InkTiltMath.components(magnitude, orientation)
    assertEquals(tiltX, restored.first, 0.0001f)
    assertEquals(tiltY, restored.second, 0.0001f)
  }

  @Test
  fun highlighterOpacityIsAppliedToTheBrushColor() {
    assertEquals(0x59010203, InkColorMath.applyOpacity(0xff010203.toInt(), 0.35f))
    assertEquals(0x00010203, InkColorMath.applyOpacity(0xff010203.toInt(), -1f))
    assertEquals(0xff010203.toInt(), InkColorMath.applyOpacity(0xff010203.toInt(), 2f))
  }

}
