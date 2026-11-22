export function gestureAction(
  x: number,
  y: number,
): "skip" | "store" | "defer" | null {
  if (Math.abs(x) > Math.abs(y))
    return x <= -80 ? "skip" : x >= 80 ? "store" : null;
  return y <= -80 ? "defer" : null;
}
