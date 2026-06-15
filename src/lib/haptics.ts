// Tiny haptic helper. Uses the Vibration API where available (Android/Chrome).
// iOS Safari ignores navigator.vibrate, so this is a no-op there — harmless.
export function tap(pattern: number | number[] = 10) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export const haptics = {
  light: () => tap(8),
  success: () => tap([12, 40, 12]),
  warn: () => tap([20, 60, 20]),
};
