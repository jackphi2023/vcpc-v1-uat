/* ========================================================================== 
   VCPC — Shared behaviour for all pages
   - Bilingual VI/EN (supports: window.VCPC_DICT + [data-i18n]/[data-i18n-placeholder]/[data-ph],
     and attribute pairs [data-vi]/[data-en] + [data-placeholder-vi]/[data-placeholder-en])
   - Language choice is remembered across every page (localStorage)
   - Sticky-header shadow, hamburger drawer, scroll reveal, back-to-top, hero parallax
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "vcpc_lang";
  var dict = window.VCPC_DICT || null;

  /* ===================================================================
     CONTACT FORM ENDPOINT
     Paste your Google Apps Script Web App URL between the quotes below
     (see setup steps shared by VCPC). Leave empty to use mailto fallback.
     =================================================================== */
  var FORM_ENDPOINT = window.VCPC_FORM_ENDPOINT || "";

  /* --- Google Form integration (active): submissions land in the linked Sheet --- */
  var GFORM_REV = ["Dưới 50 tỷ đồng/năm", "50 tỷ - 300 tỷ đồng/năm", "Trên 300 tỷ đồng/năm"];
  window.VCPC_GFORM = window.VCPC_GFORM || {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSeyawS4DehXfdps4t4KkM1Dwpfj7zRdgd7m9sATMqAlCVmnMw/formResponse",
    map: {
      name: "entry.496797271",
      company: "entry.362973045",
      email: "entry.416504852",
      phone: "entry.1852096315",
      revenue: "entry.1502938468",
      need: "entry.1694363992",
      message: "entry.308416007",
      title: "entry.211713636",
      industry: "entry.795175222"
    },
    /* Fields the Google Form marks required — filled with "-" when the page form leaves them empty */
    required: ["name", "company", "email", "phone", "need", "message"]
  };

  /* Normalise any revenue answer to the Form's 3 dropdown choices */
  function normRevenue(v) {
    if (!v) return GFORM_REV[0];
    var s = String(v).toLowerCase().replace(/\./g, "");
    if (/dưới|duoi|under|<\s*50/.test(s)) return GFORM_REV[0];
    if (/trên|tren|over|>/.test(s) && /(2000|1000|500|300)/.test(s)) return GFORM_REV[2];
    var m = s.match(/\d+/g);
    if (!m) return GFORM_REV[0];
    var first = parseInt(m[0], 10);
    if (first < 50) return GFORM_REV[0];
    if (first >= 300) return GFORM_REV[2];
    return GFORM_REV[1];
  }

  function getLang() {
    try { return localStorage.getItem(KEY) || "vi"; } catch (e) { return "vi"; }
  }
  function saveLang(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }

  function setText(el, val) {
    if (val == null) return;
    if (String(val).indexOf("<") !== -1) el.innerHTML = val; else el.textContent = val;
  }

  function rememberBodyCopy() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (!el.hasAttribute("data-i18n-body-vi")) {
        el.setAttribute("data-i18n-body-vi", el.innerHTML);
      }
    });
    document.querySelectorAll("[data-i18n-placeholder], [data-ph]").forEach(function (el) {
      if (!el.hasAttribute("data-i18n-body-placeholder-vi")) {
        el.setAttribute("data-i18n-body-placeholder-vi", el.getAttribute("placeholder") || "");
      }
    });
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;

    /* Attribute-pair driven copy has the highest priority. */
    document.querySelectorAll("[data-" + lang + "]").forEach(function (el) {
      setText(el, el.getAttribute("data-" + lang));
    });
    document.querySelectorAll("[data-placeholder-" + lang + "]").forEach(function (el) {
      el.placeholder = el.getAttribute("data-placeholder-" + lang);
    });

    /* Dictionary-driven fallback.
       Important: Vietnamese HTML body is treated as the source of truth.
       This prevents old window.VCPC_DICT values from overwriting updated body copy. */
    if (dict && dict[lang]) {
      var d = dict[lang];
      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var key = el.dataset.i18n;
        if (lang === "vi" && el.hasAttribute("data-i18n-body-vi")) {
          setText(el, el.getAttribute("data-i18n-body-vi"));
        } else if (!el.hasAttribute("data-" + lang) && d[key] != null) {
          setText(el, d[key]);
        }
      });
      document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
        var key = el.dataset.i18nPlaceholder;
        if (lang === "vi" && el.hasAttribute("data-i18n-body-placeholder-vi")) {
          el.placeholder = el.getAttribute("data-i18n-body-placeholder-vi");
        } else if (!el.hasAttribute("data-placeholder-" + lang) && d[key] != null) {
          el.placeholder = d[key];
        }
      });
      document.querySelectorAll("[data-ph]").forEach(function (el) {
        var key = el.dataset.ph;
        if (lang === "vi" && el.hasAttribute("data-i18n-body-placeholder-vi")) {
          el.placeholder = el.getAttribute("data-i18n-body-placeholder-vi");
        } else if (!el.hasAttribute("data-placeholder-" + lang) && d[key] != null) {
          el.placeholder = d[key];
        }
      });
    } else if (lang === "vi") {
      document.querySelectorAll("[data-i18n][data-i18n-body-vi]").forEach(function (el) {
        setText(el, el.getAttribute("data-i18n-body-vi"));
      });
      document.querySelectorAll("[data-i18n-body-placeholder-vi]").forEach(function (el) {
        el.placeholder = el.getAttribute("data-i18n-body-placeholder-vi");
      });
    }

    /* Localisable "featured" badges (optional) */
    document.querySelectorAll("[data-badge-" + lang + "]").forEach(function (el) {
      el.setAttribute("data-badge", el.getAttribute("data-badge-" + lang));
    });

    /* Active toggle state */
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });

    saveLang(lang);
    document.dispatchEvent(new CustomEvent("vcpc:langchange", { detail: { lang: lang } }));
  }
  window.vcpcSetLang = applyLang;

  function init() {
    rememberBodyCopy();

    /* ---- Language buttons ---- */
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () { applyLang(btn.getAttribute("data-lang")); });
    });
    applyLang(getLang());

    /* ---- Sticky header shadow + back-to-top ---- */
    var header = document.querySelector("header.vcpc-header") || document.getElementById("header");
    var backTop = document.getElementById("backTop") || document.querySelector(".back-top");
    var orb = document.getElementById("orb");
    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if (header) header.classList.toggle("scrolled", y > 12);
      if (backTop) backTop.classList.toggle("show", y > 600);
      if (orb) orb.style.transform = "translate3d(" + (y * -0.02) + "px," + (y * -0.05) + "px,0)";
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (backTop) backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* ---- Hamburger drawer ---- */
    var burger = document.getElementById("hamburger") ||
                 document.querySelector("header.vcpc-header .hamburger, header.vcpc-header .menu-btn");
    var links = document.getElementById("navLinks") || document.querySelector("header.vcpc-header .nav-links");
    function closeMenu() {
      if (!links) return;
      links.classList.remove("open");
      document.body.classList.remove("menu-open");
      if (burger) burger.setAttribute("aria-expanded", "false");
    }
    function toggleMenu() {
      if (!links) return;
      var open = links.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      if (burger) burger.setAttribute("aria-expanded", String(open));
    }
    if (burger) burger.addEventListener("click", toggleMenu);
    if (links) links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1000) closeMenu(); });
    window.vcpcCloseMenu = closeMenu;

    /* ---- Scroll reveal ---- */
    var revealEls = document.querySelectorAll(".reveal, .stagger");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("visible"); });
    }

    /* ---- Contact form: send to Google Sheet (Apps Script) or mailto ---- */
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || form.id !== "contactForm") return;
      e.preventDefault();
      e.stopImmediatePropagation(); /* override any page-level mailto handler */
      var lang = getLang();
      var fd = new FormData(form);
      fd.append("_page", document.title);
      fd.append("_url", location.href);
      var btn = form.querySelector('[type="submit"]');
      var msg = form.querySelector(".vcpc-form-msg");
      if (!msg) { msg = document.createElement("p"); msg.className = "vcpc-form-msg"; form.appendChild(msg); }
      function show(ok) {
        msg.className = "vcpc-form-msg " + (ok ? "ok" : "err");
        msg.textContent = ok
          ? (lang === "vi" ? "Đã gửi! VCPC sẽ liên hệ lại trong thời gian sớm nhất." : "Sent! VCPC will get back to you shortly.")
          : (lang === "vi" ? "Gửi chưa thành công, vui lòng thử lại hoặc email partner@vietcapitalpartners.com." : "Could not send — please retry or email partner@vietcapitalpartners.com.");
      }
      var orig = btn ? btn.textContent : "";
      function sending(){ if (btn) { btn.disabled = true; btn.textContent = (lang === "vi" ? "Đang gửi…" : "Sending…"); } }
      function done(ok){ show(ok); if (ok) form.reset(); if (btn) { btn.disabled = false; btn.textContent = orig; } }
      var gf = window.VCPC_GFORM;
      if (gf && gf.action && gf.map && Object.keys(gf.map).length) {
        sending();
        var gp = new URLSearchParams();
        Object.keys(gf.map).forEach(function (k) {
          var v = fd.get(k);
          if (k === "revenue") v = normRevenue(v);
          if ((v == null || v === "") && gf.required && gf.required.indexOf(k) !== -1) v = "-";
          if (v != null && v !== "") gp.append(gf.map[k], v);
        });
        fetch(gf.action, { method: "POST", mode: "no-cors", body: gp })
          .then(function () { done(true); })
          .catch(function () { done(true); }); /* opaque (no-cors): treat as sent */
      } else if (FORM_ENDPOINT) {
        sending();
        var params = new URLSearchParams();
        fd.forEach(function (v, k) { params.append(k, v); });
        fetch(FORM_ENDPOINT, { method: "POST", mode: "no-cors", body: params })
          .then(function () { done(true); })
          .catch(function () { done(false); });
      } else {
        var lines = [];
        fd.forEach(function (v, k) { if (v && k.charAt(0) !== "_") lines.push(k + ": " + v); });
        var subject = encodeURIComponent("[VCPC] " + (fd.get("company") || "Lien he"));
        window.location.href = "mailto:partner@vietcapitalpartners.com?subject=" + subject + "&body=" + encodeURIComponent(lines.join("\n"));
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
