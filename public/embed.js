/**
 * CyberAgent Studio — Embed Script  v10
 * Drop a single <script> tag anywhere; no other JS required.
 *
 * Usage:
 *   <script src="https://your-domain.com/embed.js"
 *           data-agent-id="YOUR_AGENT_ID"
 *           data-api-key="4u_live_..."
 *           data-accent-color="#00f2ff"
 *           async></script>
 *
 * Architecture — single-class CSS state machine:
 *   .nexa-expanded controls all states; a media query morphs it
 *   from a desktop panel into a mobile full-screen modal.
 *
 *   On mobile the launcher button is hidden via CSS when expanded so
 *   it cannot intercept touches over the iframe. The inner iframe
 *   close button (postMessage) is the sole collapse trigger on mobile.
 */
(function () {

  /* ── 1. Config ── */
  var me          = document.currentScript;
  var agentId     = me && me.getAttribute("data-agent-id");
  var apiKey      = me && me.getAttribute("data-api-key");
  var accentColor = (me && me.getAttribute("data-accent-color")) || "#00f2ff";

  if (!agentId) {
    console.warn("[Nexa Widget] data-agent-id is missing on the embed script tag.");
    return;
  }

  var scriptSrc = (me && me.getAttribute("src")) || "";
  var base      = scriptSrc.replace(/\/embed\.js.*$/, "") || window.location.origin;
  var widgetUrl = base + "/widget/" + agentId + (apiKey ? "?key=" + encodeURIComponent(apiKey) : "");

  console.log("[Nexa Widget] Initializing — agentId:", agentId, "| base:", base);

  /* ── 2. Mobile detection (evaluated at click-time) ── */
  function isMobile() {
    return window.innerWidth <= 640 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }

  /* ── 3. Inject static CSS ── */
  var A = accentColor;

  var styleTag = document.createElement("style");
  styleTag.textContent = [

    /* ── Container: collapsed (60×60 launcher bubble) ── */
    "#nexa-agent-root {",
    "  position:      fixed !important;",
    "  bottom:        20px  !important;",
    "  right:         20px  !important;",
    "  z-index:       2147483646 !important;",
    "  width:         60px  !important;",
    "  height:        60px  !important;",
    "  border-radius: 50%   !important;",
    "  overflow:      hidden !important;",
    "  background:    transparent !important;",
    "  transform:     none  !important;",
    "  transition:",
    "    width         .32s cubic-bezier(.4,0,.2,1),",
    "    height        .32s cubic-bezier(.4,0,.2,1),",
    "    border-radius .26s ease,",
    "    bottom        .32s cubic-bezier(.4,0,.2,1),",
    "    right         .32s cubic-bezier(.4,0,.2,1),",
    "    box-shadow    .25s ease;",
    "}",

    /* ── Expanded: desktop panel (default, overridden on mobile) ── */
    "#nexa-agent-root.nexa-expanded {",
    "  width:         400px   !important;",
    "  height:        600px   !important;",
    "  max-height:    85vh    !important;",
    "  border-radius: 16px    !important;",
    "  bottom:        24px    !important;",
    "  right:         24px    !important;",
    "  background:    #050508 !important;",
    "  transform:     none    !important;",
    "  box-shadow:    0 12px 40px rgba(0,0,0,.65), 0 0 0 1px " + A + "22 !important;",
    "}",

    /* ── iframe: hidden + inert when collapsed ── */
    "#nexa-agent-root iframe {",
    "  position:       absolute !important;",
    "  top:            0 !important;",
    "  left:           0 !important;",
    "  width:          100% !important;",
    "  height:         100% !important;",
    "  border:         none !important;",
    "  display:        block !important;",
    "  opacity:        0 !important;",
    "  pointer-events: none !important;",
    "  touch-action:   auto !important;",
    "  transition:     opacity .22s ease .3s;",
    "}",

    /* ── iframe: visible when expanded (desktop) ── */
    "#nexa-agent-root.nexa-expanded iframe {",
    "  opacity:        1    !important;",
    "  pointer-events: auto !important;",
    "}",

    /* ── Launcher / close button ── */
    "#nexa-widget-btn {",
    "  position:   absolute !important;",
    "  bottom:     0 !important;",
    "  right:      0 !important;",
    "  z-index:    2 !important;",
    "  width:      60px !important;",
    "  height:     60px !important;",
    "  border-radius: 50% !important;",
    "  border:     none   !important;",
    "  cursor:     pointer !important;",
    "  background: linear-gradient(135deg," + A + ",#a855f7) !important;",
    "  box-shadow: 0 4px 20px " + A + "80, 0 2px 8px rgba(0,0,0,.4) !important;",
    "  display:        flex   !important;",
    "  align-items:    center !important;",
    "  justify-content:center !important;",
    "  padding:    0 !important;",
    "  outline:    none !important;",
    "  touch-action:              manipulation !important;",
    "  user-select:               none !important;",
    "  -webkit-tap-highlight-color: transparent !important;",
    "  transition: transform .2s ease, box-shadow .2s ease;",
    "}",

    /* Hover glow — pointer-capable devices only */
    "@media (hover: hover) {",
    "  #nexa-widget-btn:hover {",
    "    transform:  scale(1.08) !important;",
    "    box-shadow: 0 6px 28px " + A + "aa, 0 2px 8px rgba(0,0,0,.5) !important;",
    "  }",
    "}",

    /* ── Mobile overrides ────────────────────────────────────────────────
       On mobile, .nexa-expanded becomes a full-viewport fixed modal.

       CRITICAL: the launcher button is fully hidden when expanded on
       mobile. Without this it sits over the iframe footer and intercepts
       every touch targeting the input field and send button.
       The inner iframe X button (postMessage) is the sole close trigger
       on mobile.
    ──────────────────────────────────────────────────────────────────── */
    "@media (max-width: 640px) {",

    "  #nexa-agent-root.nexa-expanded {",
    "    position:      fixed       !important;",
    "    top:           0px         !important;",
    "    left:          0px         !important;",
    "    bottom:        0px         !important;",
    "    right:         0px         !important;",
    "    width:         100%        !important;",
    "    height:        100%        !important;",
    "    max-height:    100%        !important;",
    "    border-radius: 0px         !important;",
    "    box-shadow:    none        !important;",
    "    margin:        0           !important;",
    "    padding:       0           !important;",
    "    transform:     none        !important;",
    "    transition:    none        !important;",
    "    z-index:       2147483647  !important;",
    "    background:    #050508     !important;",
    "  }",

    /* Hide launcher button entirely — eliminates touch-target collision */
    "  #nexa-agent-root.nexa-expanded #nexa-widget-btn {",
    "    display:        none        !important;",
    "    pointer-events: none        !important;",
    "    visibility:     hidden      !important;",
    "  }",

    /* Pristine full-screen iframe canvas */
    "  #nexa-agent-root.nexa-expanded iframe {",
    "    position:       absolute    !important;",
    "    top:            0px         !important;",
    "    left:           0px         !important;",
    "    width:          100%        !important;",
    "    height:         100%        !important;",
    "    border:         none        !important;",
    "    display:        block       !important;",
    "    pointer-events: auto        !important;",
    "    visibility:     visible     !important;",
    "    opacity:        1           !important;",
    "    z-index:        2147483647  !important;",
    "    transition:     none        !important;",
    "  }",

    "}",

  ].join("\n");

  document.head.appendChild(styleTag);

  /* ── 4. Container ── */
  var container = document.createElement("div");
  container.id  = "nexa-agent-root";

  /* ── 5. Iframe ── */
  var frame    = document.createElement("iframe");
  frame.src    = widgetUrl;
  frame.title  = "CyberAgent Chat";
  frame.allow  = "microphone";
  frame.setAttribute("loading", "lazy");
  frame.onerror = function () {
    console.error("[Nexa Widget] iframe failed to load:", widgetUrl);
  };
  container.appendChild(frame);

  /* ── 6. Button ── */
  var BOT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"' +
    ' fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="11" width="18" height="10" rx="2"/>' +
    '<path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>' +
    '<path d="M8 15h0M16 15h0"/>' +
    '</svg>';

  var CLOSE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"' +
    ' fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">' +
    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
    '</svg>';

  var btn = document.createElement("button");
  btn.id  = "nexa-widget-btn";
  btn.setAttribute("aria-label", "Open CyberAgent chat");
  btn.innerHTML = BOT_SVG;
  container.appendChild(btn);

  /* ── 7. Touch propagation guard ─────────────────────────────────────────
     Prevents host-page global touch handlers from swallowing events that
     belong to the widget when the container is expanded.
  ──────────────────────────────────────────────────────────────────────── */
  container.addEventListener("touchstart", function (e) {
    if (container.classList.contains("nexa-expanded")) {
      e.stopPropagation();
    }
  }, { passive: true });

  /* ── 8. State ── */
  var open          = false;
  var savedOverflow = "";

  function collapse() {
    container.classList.remove("nexa-expanded");
    btn.innerHTML = BOT_SVG;
    btn.setAttribute("aria-label", "Open CyberAgent chat");
    document.body.style.overflow = savedOverflow || "";
    savedOverflow = "";
    open = false;
    console.log("[Nexa Widget] Closed");
  }

  function expand() {
    container.classList.add("nexa-expanded");
    btn.innerHTML = CLOSE_SVG;
    btn.setAttribute("aria-label", "Close CyberAgent chat");
    /* Lock body scroll on mobile so host page doesn't scroll behind chat */
    if (isMobile()) {
      savedOverflow = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
    }
    open = true;
    console.log("[Nexa Widget] ✓ Opened");
  }

  function toggleWidget() {
    if (open) { collapse(); } else { expand(); }
  }

  /* ── 9. Button bindings (direct property — SES-safe) ── */
  btn.onclick = function (e) {
    if (e) e.stopPropagation();
    toggleWidget();
  };

  btn.ontouchend = function (e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    console.log("[Nexa Widget] touchend fired");
    toggleWidget();
  };

  /* ── 10. postMessage collapse handler ───────────────────────────────────
     WidgetChat inner X posts { channel:'nexa-agent', command:'CLOSE' }.
     On mobile this is the ONLY collapse trigger (button is hidden).
     On desktop it provides a second collapse path alongside the button.
  ──────────────────────────────────────────────────────────────────────── */
  window.onmessage = function (e) {
    if (e.data && e.data.command === "CLOSE") {
      var root = document.getElementById("nexa-agent-root");
      if (root) root.classList.remove("nexa-expanded");
      btn.innerHTML = BOT_SVG;
      btn.setAttribute("aria-label", "Open CyberAgent chat");
      document.body.style.overflow = savedOverflow || "";
      savedOverflow = "";
      open = false;
      console.log("[Nexa Widget] Collapsed via postMessage");
    }
  };

  /* ── 11. Mount ── */
  function init() {
    if (document.getElementById("nexa-agent-root")) {
      console.warn("[Nexa Widget] Already mounted — skipping duplicate init.");
      return;
    }
    document.body.appendChild(container);
    console.log("[Nexa Widget] ✓ Mounted — agentId:", agentId);
  }

  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }

})();
