/** A resident-readable reason the camera didn't open. `audio` means the microphone was requested too. */
export function describeCameraError(err: unknown, { audio = false } = {}): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "This page isn't on HTTPS, so the browser blocks the camera.";
  }
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return audio
        ? "Camera or microphone permission was denied. Allow both in the browser's site settings."
        : "Camera permission was denied. Allow it in the browser's site settings.";
    }
    if (err.name === "NotFoundError") return "No camera found on this device.";
    if (err.name === "NotReadableError") return "The camera is in use by another app.";
    return `${err.name}: ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}
