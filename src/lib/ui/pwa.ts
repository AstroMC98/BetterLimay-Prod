import type { LguConfig } from "../../app/lguConfig";

export function shouldRegisterPwa(
  config: Pick<LguConfig, "features">,
  serviceWorkerSupported: boolean,
): boolean {
  return config.features.pwa && serviceWorkerSupported;
}

export function registerPwaServiceWorker(config: Pick<LguConfig, "features">): void {
  if (typeof navigator === "undefined") {
    return;
  }

  if (!shouldRegisterPwa(config, "serviceWorker" in navigator)) {
    return;
  }

  void navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .catch((error: unknown) => {
      console.warn("BetterLimay could not register the service worker.", error);
    });
}
