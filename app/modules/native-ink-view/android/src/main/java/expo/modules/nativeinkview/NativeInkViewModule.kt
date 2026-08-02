package expo.modules.nativeinkview

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeInkViewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeInkView")

    View(NativeInkView::class) {
      // No native drawing-policy equivalent on Android; accepted only for prop-shape parity with iOS.
      Prop("drawingPolicy") { _: NativeInkView, _: String -> }
      Prop("clearTrigger") { view: NativeInkView, trigger: Int ->
        view.handleClearTrigger(trigger)
      }
      Events("onDrawingChange")
    }
  }
}
