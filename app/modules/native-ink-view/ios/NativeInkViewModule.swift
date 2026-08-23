import ExpoModulesCore

public class NativeInkViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeInkView")

    View(NativeInkView.self) {
      Prop("inputMode") { (view: NativeInkView, mode: String) in
        view.setInputMode(mode)
      }
      Prop("selectedTool") { (view: NativeInkView, tool: String) in
        view.setSelectedTool(tool)
      }
      Prop("selectedColor") { (view: NativeInkView, color: String) in
        view.setSelectedColor(color)
      }
      Prop("selectedWidth") { (view: NativeInkView, width: Double) in
        view.setSelectedWidth(width)
      }
      Prop("snapshotJson") { (view: NativeInkView, json: String) in
        view.setSnapshotJSON(json)
      }
      Events("onInkChange", "onReady", "onCapabilities", "onError")
    }
  }
}
