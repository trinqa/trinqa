import ExpoModulesCore
import ExpoUI
import SwiftUI

/// Native press styling. `@expo/ui` does not expose `isPressed` to JS, so the
/// scale/opacity has to live in a ButtonStyle that SwiftUI drives itself.
struct PressFeedbackStyle: ButtonStyle {
  let scale: CGFloat
  let pressedOpacity: Double
  let durationIn: Double
  let durationOut: Double
  let includeScale: Bool

  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  func makeBody(configuration: Configuration) -> some View {
    let pressed = configuration.isPressed
    let useScale = includeScale && !reduceMotion
    return configuration.label
      .scaleEffect(x: pressed && useScale ? scale : 1, y: pressed && useScale ? scale : 1, anchor: .center)
      .opacity(pressed ? pressedOpacity : 1)
      .animation(.easeOut(duration: pressed ? durationIn : durationOut), value: pressed)
  }
}

struct PressFeedbackModifier: ViewModifier {
  let scale: CGFloat
  let pressedOpacity: Double
  let durationIn: Double
  let durationOut: Double
  let includeScale: Bool

  func body(content: Content) -> some View {
    content.buttonStyle(
      PressFeedbackStyle(
        scale: scale,
        pressedOpacity: pressedOpacity,
        durationIn: durationIn,
        durationOut: durationOut,
        includeScale: includeScale
      )
    )
  }
}

public class PressFeedbackModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TrinqaPress")

    OnCreate {
      ViewModifierRegistry.register("pressFeedback") { params, _, _ in
        PressFeedbackModifier(
          scale: CGFloat((params["scale"] as? Double) ?? 0.98),
          pressedOpacity: (params["opacity"] as? Double) ?? 0.92,
          durationIn: (params["durationIn"] as? Double) ?? 0.08,
          durationOut: (params["durationOut"] as? Double) ?? 0.12,
          includeScale: (params["includeScale"] as? Bool) ?? true
        )
      }
    }

    OnDestroy {
      ViewModifierRegistry.unregister("pressFeedback")
    }
  }
}
