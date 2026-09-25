/* global document, window, setTimeout */
// Sends the sign-in result from the OAuth popup back to the content editor.
//
// Served as a file, not inlined in the page, because the site's
// Content-Security-Policy forbids inline scripts. The message itself is written
// into a data attribute by api/admin-auth.ts.
(function () {
  var holder = document.getElementById("oauth-handshake");
  var message = holder && holder.getAttribute("data-message");
  if (!message) return;

  function send() {
    if (!window.opener) return;
    // Same origin only: the token must never be posted to another site.
    window.opener.postMessage(message, window.location.origin);
  }

  // Decap sends an initiating message first; answer it, and also send once
  // directly in case its listener was already attached.
  window.addEventListener("message", send, false);
  send();
  setTimeout(function () {
    window.close();
  }, 1000);
})();
