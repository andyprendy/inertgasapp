const SW_PATH = "/sw.js";

function isRefusedContext() {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname.toLowerCase();
  const label = h.split(".")[0];
  const previewDomain = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"].some((d) => h.endsWith(d));
  if (previewDomain && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label)) return true;
  if (previewDomain && /^project--[^.]+-dev$/.test(label)) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSW() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active || r.installing || r.waiting)?.scriptURL.endsWith(SW_PATH))
      .map((r) => r.unregister()),
  );
}

export function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    void unregisterAppSW();
    return;
  }
  void navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}
