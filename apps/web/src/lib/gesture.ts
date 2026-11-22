export const SWIPE_TRIGGER = 80;

export function gestureAction(
  x: number,
  y: number,
): "skip" | "store" | "defer" | null {
  if (Math.abs(x) > Math.abs(y))
    return x <= -SWIPE_TRIGGER ? "skip" : x >= SWIPE_TRIGGER ? "store" : null;
  return y <= -SWIPE_TRIGGER ? "defer" : null;
}
