/** Facebook's Page Plugin for one page's timeline: a plain iframe, no SDK script. */
export function pagePluginUrl(pageUrl: string): string {
  const plugin = new URL("https://www.facebook.com/plugins/page.php");
  plugin.searchParams.set("href", pageUrl);
  plugin.searchParams.set("tabs", "timeline");
  plugin.searchParams.set("width", "500");
  plugin.searchParams.set("height", "640");
  plugin.searchParams.set("small_header", "true");
  plugin.searchParams.set("adapt_container_width", "true");
  plugin.searchParams.set("hide_cover", "false");
  plugin.searchParams.set("show_facepile", "false");
  return plugin.toString();
}
