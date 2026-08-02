import ExpoModulesCore

public class NativeInkViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeInkView")

    View(NativeInkView.self) {
      Prop("drawingPolicy") { (view: NativeInkView, policy: String) in
        view.setDrawingPolicy(policy)
      }
      Prop("clearTrigger") { (view: NativeInkView, trigger: Int) in
        view.handleClearTrigger(trigger)
      }
      Events("onDrawingChange")
    }
  }
}
