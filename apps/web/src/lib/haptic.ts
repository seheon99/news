/** Vibration API (Android etc.). Works mid-gesture; a no-op where unsupported. */
export function vibrate() {
  navigator.vibrate?.(15);
}

/**
 * iOS Safari has no Vibration API, but toggling an <input switch> plays the system
 * haptic (iOS 18+). WebKit only honours it inside a user-activation event
 * (pointerup/touchend/click), so call this from those handlers, never from pointermove.
 */
export function releaseHaptic() {
  if ("vibrate" in navigator) return; // already vibrated at the threshold
  const label = document.createElement("label");
  label.hidden = true;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.append(input);
  document.body.append(label);
  label.click();
  label.remove();
}
