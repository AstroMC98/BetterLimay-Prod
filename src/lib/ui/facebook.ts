/**
 * Facebook links pasted into news posts.
 *
 * Facebook refuses to be framed directly (X-Frame-Options: DENY); its official
 * plugins at facebook.com/plugins/* are built to be. A video or live stream uses
 * the video plugin, anything else the post plugin.
 */

const FACEBOOK_HOSTS = new Set([
  "www.facebook.com",
  "facebook.com",
  "m.facebook.com",
  "fb.watch",
]);

export type FacebookEmbedKind = "video" | "post";

export function isFacebookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && FACEBOOK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function facebookEmbedKind(value: string): FacebookEmbedKind {
  const url = new URL(value);
  if (url.hostname === "fb.watch") return "video";
  return /\/(videos|watch|live|reel)\b/.test(url.pathname) || url.searchParams.has("v")
    ? "video"
    : "post";
}

/** The plugin URL for an iframe, or null when the link is not Facebook's. */
export function facebookEmbedUrl(value: string): string | null {
  if (!isFacebookUrl(value)) return null;
  const kind = facebookEmbedKind(value);
  const plugin = new URL(`https://www.facebook.com/plugins/${kind}.php`);
  plugin.searchParams.set("href", value);
  plugin.searchParams.set("show_text", kind === "video" ? "false" : "true");
  plugin.searchParams.set("width", "560");
  return plugin.toString();
}
