/* Versioned so a later announcement can show again to readers who dismissed this one. */
export const LAUNCH_BANNER_KEY = "betterlimay.launchBanner.v1";

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

export function browserStorage(): FlagStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Show on first visit, unless the reader was already sent to /contribute. */
export function shouldShowLaunchBanner(
  storage: FlagStorage | null,
  pathname: string,
): boolean {
  if (!storage || pathname.startsWith("/contribute")) return false;
  try {
    return storage.getItem(LAUNCH_BANNER_KEY) !== "1";
  } catch {
    // Storage blocked: showing it on every visit would nag, so stay quiet.
    return false;
  }
}

export function dismissLaunchBanner(storage: FlagStorage | null): void {
  try {
    storage?.setItem(LAUNCH_BANNER_KEY, "1");
  } catch {
    // Storage unavailable: the banner simply shows again next visit.
  }
}
