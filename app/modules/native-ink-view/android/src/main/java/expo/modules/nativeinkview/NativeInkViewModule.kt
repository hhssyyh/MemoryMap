package expo.modules.nativeinkview

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeInkViewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeInkView")

    View(NativeInkView::class) {
      Prop("inputMode") { view: NativeInkView, mode: String ->
        view.setInputMode(mode)
      }
      Prop("snapshotJson") { view: NativeInkView, json: String ->
        view.setSnapshotJson(json)
      }
      Prop("selectedTool") { view: NativeInkView, tool: String ->
        view.setSelectedTool(tool)
      }
      Prop("selectedColor") { view: NativeInkView, color: String ->
        view.setSelectedColor(color)
      }
      Prop("selectedWidth") { view: NativeInkView, width: Double ->
        view.setSelectedWidth(width)
      }
      Events("onInkChange", "onReady", "onCapabilities", "onError")
    }
  }
}
