// ponytail: Vibration API only. iOS Safari has none, and the <input switch> haptic workaround
// was tried on the user's iPhone (2026-11-22) and produced nothing, so iPhones get no haptic.
// A native wrapper (e.g. Capacitor Haptics) is the only route if iOS haptics become a must.
/** Short vibration where supported (Android etc.); a no-op elsewhere. */
export function vibrate() {
  navigator.vibrate?.(15);
}
