/* global document, localStorage */
// Applies a saved light/dark choice before the first paint, so a reader who
// chose dark never sees a white flash. Kept as a same-origin file because the
// Content-Security-Policy forbids inline scripts. With no saved choice nothing
// is set and the CSS follows the operating system.
(function () {
  try {
    var saved = localStorage.getItem("betterlimay-theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch {
    // Storage blocked (private mode, disabled site data): follow the system.
  }
})();
