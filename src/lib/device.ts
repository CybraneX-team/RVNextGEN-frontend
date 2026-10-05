/** A stable per-browser id the Cloudflare playback endpoint uses to enforce concurrent-stream limits. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem("rv-device-id");
    if (!id) {
      id = (crypto.randomUUID?.() ?? `web-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`);
      localStorage.setItem("rv-device-id", id);
    }
    return id;
  } catch {
    return "web";
  }
}
