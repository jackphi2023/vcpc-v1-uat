/*
 * VCPC UI Safe Helper
 * Version: 1.0.0
 *
 * Visual state only.
 * - Does NOT listen for form submissions.
 * - Does NOT call APIs, Supabase or storage.
 * - Does NOT change URLs, redirects, authentication or payment.
 * - Does NOT add/remove business content.
 */
(function () {
  "use strict";

  if (window.__VCPC_UI_SAFE_LOADED__) return;
  window.__VCPC_UI_SAFE_LOADED__ = true;

  var root = document.documentElement;
  root.classList.add("vcpc-ui-safe");
  root.setAttribute("data-vcpc-ui-version", "1.0.0");

  /*
   * Mobile viewport CSS variable.
   * Useful for visual components that need the real browser viewport height.
   */
  function updateViewportUnit() {
    root.style.setProperty("--vcpc-vh", (window.innerHeight * 0.01) + "px");
  }

  updateViewportUnit();
  window.addEventListener("resize", updateViewportUnit, { passive: true });
  window.addEventListener("orientationchange", updateViewportUnit, { passive: true });

  /*
   * Keyboard-modality marker for optional focus styling.
   * No default actions are cancelled.
   */
  function markKeyboardNavigation(event) {
    if (event.key === "Tab") {
      root.classList.add("vcpc-keyboard-nav");
    }
  }

  function markPointerNavigation() {
    root.classList.remove("vcpc-keyboard-nav");
  }

  document.addEventListener("keydown", markKeyboardNavigation, { passive: true });
  document.addEventListener("pointerdown", markPointerNavigation, { passive: true });

  function markReady() {
    root.classList.add("vcpc-ui-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markReady, { once: true });
  } else {
    markReady();
  }
})();
