import ExpoModulesCore

public class NativeInkViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeInkView")

    View(NativeInkView.self) {
      Prop("drawingPolicy") { (view: NativeInkView, policy: String) in
        view.setDrawingPolicy(policy)
      }
      Prop("pageWidth") { (view: NativeInkView, width: Double?) in
        view.setPageSize(width: width, height: nil)
      }
      Prop("pageHeight") { (view: NativeInkView, height: Double?) in
        view.setPageSize(width: nil, height: height)
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
      Prop("strokesJson") { (view: NativeInkView, json: String) in
        view.setStrokesJSON(json)
      }
      Prop("clearTrigger") { (view: NativeInkView, trigger: Int) in
        view.handleClearTrigger(trigger)
      }
      Events("onDrawingChange")
    }
  }
}
