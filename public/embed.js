/**
 * CyberAgent Studio — Embed Script  v12
 * Drop a single <script> tag anywhere; no other JS required.
 *
 * Usage:
 *   <script src="https://your-domain.com/embed.js"
 *           data-agent-id="YOUR_AGENT_ID"
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
 *
 * readyState guard (v11 fix):
 *   document.readyState === "loading"     → wait for DOMContentLoaded
 *   document.readyState === "interactive" → init immediately (DOM ready)
 *   document.readyState === "complete"    → init immediately (all loaded)
 *
 *   The previous guard only fired on "complete", missing the "interactive"
 *   state that Next.js afterInteractive scripts land in — causing the
 *   widget to register a "load" listener that had already fired and
 *   never triggered, so the bubble never mounted.
 */
(function () {

  /* ── 1. Config — MUST be read synchronously here.
     document.currentScript is only valid during the script's
     initial synchronous execution. Once DOMContentLoaded fires
     it returns null, so all attribute reads happen NOW before
     any deferred call path.                                    ── */
  var me          = document.currentScript;
  var agentId     = me ? me.getAttribute("data-agent-id")    : null;
  var accentColor = me ? me.getAttribute("data-accent-color") : null;
  if (!accentColor) accentColor = "#00f2ff";

  if (!agentId) {
    console.warn("[Nexa Widget] data-agent-id is missing on the embed script tag.");
    return;
  }

  var scriptSrc = me ? (me.getAttribute("src") || "") : "";
  var base      = scriptSrc.replace(/\/embed\.js.*$/, "") ||
                  (typeof window !== "undefined" ? window.location.origin : "");
  var widgetUrl = base + "/widget/" + agentId;

  console.log("[Nexa Widget] v11 — Initializing | agentId:", agentId, "| base:", base);

  /* ── 2. Mobile detection (evaluated at click-time) ── */
  function isMobile() {
    return window.innerWidth <= 640 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }

  /* ── 3. State ── */
  var open          = false;
  var savedOverflow = "";
  var container, btn, frame;

  /* ── 4. SVG icons ── */
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

  /* ── 5. Collapse / Expand ── */
  function collapse() {
    container.classList.remove("nexa-expanded");
    btn.innerHTML = BOT_SVG;
    btn.setAttribute("aria-label", "Open CyberAgent chat");
    /* Restore launcher bubble — it was hidden on expand so the iframe
       input area was never obscured by the circular button backdrop.  */
    btn.style.display = "";
    document.body.style.overflow = savedOverflow || "";
    savedOverflow = "";
    open = false;
    console.log("[Nexa Widget] Closed");
  }

  function expand() {
    container.classList.add("nexa-expanded");
    /* Hide the launcher button entirely when the panel is open.
       The iframe's own X button is the sole close trigger (via postMessage).
       This eliminates the circular button overlapping the chat text input.  */
    btn.style.display = "none";
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

  /* ── 6. Core init — all DOM work lives here ─────────────────────────────
     Called once, only after the DOM is confirmed ready.
     Guards against duplicate mounts (HMR / multiple script tags).
  ──────────────────────────────────────────────────────────────────────── */
  function initCyberAgentWidget() {
    if (document.getElementById("nexa-agent-root")) {
      console.warn("[Nexa Widget] Already mounted — skipping duplicate init.");
      return;
    }

    /* ── 6a. CSS ── */
    var A = accentColor;
    var styleTag = document.createElement("style");
    styleTag.textContent = [

      /* Container: collapsed (60×60 launcher bubble) */
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

      /* Expanded: desktop panel */
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

      /* iframe: hidden + inert when collapsed */
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

      /* iframe: visible when expanded */
      "#nexa-agent-root.nexa-expanded iframe {",
      "  opacity:        1    !important;",
      "  pointer-events: auto !important;",
      "}",

      /* Launcher button */
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

      /* Mobile overrides — full-viewport modal */
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

      /* Hide launcher button — eliminates touch-target collision */
      "  #nexa-agent-root.nexa-expanded #nexa-widget-btn {",
      "    display:        none        !important;",
      "    pointer-events: none        !important;",
      "    visibility:     hidden      !important;",
      "  }",

      /* Pristine full-screen iframe */
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

    /* ── 6b. Container ── */
    container = document.createElement("div");
    container.id = "nexa-agent-root";

    /* ── 6c. Iframe ── */
    frame = document.createElement("iframe");
    frame.src   = widgetUrl;
    frame.title = "CyberAgent Chat";
    frame.allow = "microphone";
    frame.setAttribute("loading", "lazy");
    frame.onerror = function () {
      console.error("[Nexa Widget] iframe failed to load:", widgetUrl);
    };
    container.appendChild(frame);

    /* ── 6d. Button ── */
    btn = document.createElement("button");
    btn.id = "nexa-widget-btn";
    btn.setAttribute("aria-label", "Open CyberAgent chat");
    btn.innerHTML = BOT_SVG;
    container.appendChild(btn);

    /* ── 6e. Touch propagation guard ── */
    container.addEventListener("touchstart", function (e) {
      if (container.classList.contains("nexa-expanded")) {
        e.stopPropagation();
      }
    }, { passive: true });

    /* ── 6f. Button bindings (direct property — SES-safe) ── */
    btn.onclick = function (e) {
      if (e) e.stopPropagation();
      toggleWidget();
    };

    btn.ontouchend = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      console.log("[Nexa Widget] touchend fired");
      toggleWidget();
    };

    /* ── 6g. postMessage collapse handler ───────────────────────────────────
       WidgetChat inner X posts { channel:'nexa-agent', command:'CLOSE' }.
       Uses addEventListener (not window.onmessage) so we never overwrite
       other message handlers registered by the host page.
    ──────────────────────────────────────────────────────────────────────── */
    window.addEventListener("message", function (e) {
      if (
        e.data &&
        e.data.channel === "nexa-agent" &&
        e.data.command  === "CLOSE" &&
        open
      ) {
        collapse();
        console.log("[Nexa Widget] Collapsed via postMessage");
      }
    });

    /* ── 6h. Mount ── */
    document.body.appendChild(container);
    console.log("[Nexa Widget] ✓ Mounted — agentId:", agentId);
  }

  /* ── 7. readyState guard ────────────────────────────────────────────────
     Three possible states when this script executes:

       "loading"     — HTML parser not done; DOM nodes may not exist yet.
                       Wait for DOMContentLoaded (fires when parsing ends,
                       before stylesheets/images/iframes finish loading).

       "interactive" — DOM is fully parsed and safe to query/mutate.
                       Sub-resources (images, iframes) may still be loading
                       but document.body is guaranteed to exist.
                       Call init immediately — this is the state Next.js
                       afterInteractive scripts land in.

       "complete"    — DOM ready AND all sub-resources loaded.
                       Also call init immediately.

     The previous version only matched "complete", so "interactive" fell
     through to window.addEventListener("load", init). If the "load" event
     had already fired at that point (common with fast networks or SSR),
     the listener was registered but never invoked — widget never mounted.
  ──────────────────────────────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCyberAgentWidget);
  } else {
    /* "interactive" or "complete" — DOM is ready right now */
    initCyberAgentWidget();
  }

})();
