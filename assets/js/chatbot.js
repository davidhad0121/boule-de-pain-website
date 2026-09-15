/* Boule de Pain chatbot loader.
   The chat button comes from your Cloudflare worker (set chatbot.workerUrl in
   site-config.js). Pages opened straight from your computer use it too; if
   there's no worker address (or it can't be reached), they use preview mode. */
(function () {
  if (document.querySelector("script[data-bdp-chatbot]")) return;
  var cfg = (window.SITE && window.SITE.chatbot) || {};
  var url = String(cfg.workerUrl || "").trim().replace(/\/+$/, "");
  var valid = /^https:\/\/[^\s\/?#]+$/i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
  var fromComputer = location.protocol === "file:";
  function add(src, onError) {
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.setAttribute("data-bdp-chatbot", "");
    if (onError) s.onerror = onError;
    document.body.appendChild(s);
  }
  function preview() { add("assets/js/chatbot-local.js"); }
  if (valid) add(url + "/widget.js", fromComputer ? preview : null);
  else if (fromComputer) preview();
})();
