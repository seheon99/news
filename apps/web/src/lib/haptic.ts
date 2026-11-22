/** Short tap of vibration; silently does nothing where unsupported. */
export function haptic() {
  if (navigator.vibrate?.(15)) return;
  // ponytail: iOS Safari has no Vibration API, but toggling an <input switch> plays the
  // system haptic (iOS 18+). Drop this branch if Safari ever ships navigator.vibrate.
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
