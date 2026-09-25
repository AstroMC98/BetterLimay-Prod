/* global document, window, setTimeout */
// Sends the sign-in result from the OAuth popup back to the content editor.
//
// Decap's protocol is a handshake, and both steps are required:
//   1. popup  -> editor: "authorizing:github"
//   2. editor -> popup:  "authorizing:github"   (Decap now listens for the token)
//   3. popup  -> editor: "authorization:github:success:{...}"
// Sending the token without step 1 is silently ignored: the popup closes and
// the editor never signs in.
//
// Served as a file, not inlined in the page, because the site's
// Content-Security-Policy forbids inline scripts. The message itself is written
// into a data attribute by api/admin-auth.ts.
(function () {
  var holder = document.getElementById("oauth-handshake");
  var message = holder && holder.getAttribute("data-message");
  var opener = window.opener;
  if (!message || !opener) return;

  // Same origin only, in both directions: the token must never be posted to,
  // or released on the say-so of, another site.
  var origin = window.location.origin;
  var provider = "github";
  var handshake = "authorizing:" + provider;
  var sent = false;

  function onMessage(event) {
    if (sent || event.origin !== origin || event.data !== handshake) return;
    sent = true;
    window.removeEventListener("message", onMessage, false);
    opener.postMessage(message, origin);
    setTimeout(function () {
      window.close();
    }, 250);
  }

  window.addEventListener("message", onMessage, false);
  opener.postMessage(handshake, origin);

  // If the editor never answers (closed tab, blocked popup), do not leave a
  // window holding a token open indefinitely.
  setTimeout(function () {
    window.close();
  }, 30000);
})();
