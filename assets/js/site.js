/* Tree Service Beaverton. Small, dependency-free behaviors. Everything here enhances markup that already works without it. */
(function () {
  "use strict";
  var loadedAt = Date.now();
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---- Menu: dropdown buttons + mobile panel ---- */
  var nav = $("#site-nav"), toggle = $(".nav-toggle"), subBtns = $$(".nav-btn");
  function closeSubs(except) {
    subBtns.forEach(function (b) { if (b !== except) { b.setAttribute("aria-expanded", "false"); } });
  }
  subBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") === "true";
      closeSubs(b);
      b.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      nav.classList.toggle("is-open", !open);
      if (open) { closeSubs(); }
    });
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".nav-list")) { closeSubs(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") { return; }
    var openBtn = subBtns.filter(function (b) { return b.getAttribute("aria-expanded") === "true"; })[0];
    if (openBtn) { closeSubs(); openBtn.focus(); return; }
    if (toggle && toggle.getAttribute("aria-expanded") === "true") { toggle.click(); toggle.focus(); }
  });

  /* ---- Tagged drawings (home page site plan, hazard diagrams): tags select a panel ---- */
  $$(".plan").forEach(function (plan) {
    var tags = $$(".tag", plan), panels = $$(".plan-panel", plan);
    var pick = function (n) {
      plan.setAttribute("data-active", n);
      tags.forEach(function (t) { t.setAttribute("aria-pressed", t.getAttribute("data-tree") === n ? "true" : "false"); });
      panels.forEach(function (p) { p.classList.toggle("is-active", (p.getAttribute("data-panel") || p.id.replace("panel-", "")) === n); });
    };
    tags.forEach(function (t) { t.addEventListener("click", function () { pick(t.getAttribute("data-tree")); }); });
  });

  /* ---- Switchers: tabs or a select choose which drawing layers and which text panel show ---- */
  $$(".switcher").forEach(function (sw) {
    var tabs = $$(".sw-tab", sw), sel = $(".sw-select", sw);
    var set = function (state) {
      sw.setAttribute("data-state", state);
      $$("[data-layer]", sw).forEach(function (el) {
        el.classList.toggle("is-on", (" " + el.getAttribute("data-layer") + " ").indexOf(" " + state + " ") !== -1);
      });
      tabs.forEach(function (t) { t.setAttribute("aria-pressed", t.getAttribute("data-set") === state ? "true" : "false"); });
    };
    tabs.forEach(function (t) { t.addEventListener("click", function () { set(t.getAttribute("data-set")); }); });
    if (sel) { sel.addEventListener("change", function () { set(sel.value); }); }
    set(sw.getAttribute("data-state") || "");
  });

  /* ---- Permit checker ---- */
  var where = $("#pc-where"), extra = $("#pc-extra"), out = $("#pc-out");
  if (where && extra && out) {
    var update = function () {
      $$(".verdict", out).forEach(function (v) { v.classList.toggle("is-on", v.getAttribute("data-where") === where.value); });
      $$(".extra", out).forEach(function (x) { x.classList.toggle("is-on", where.value !== "" && x.getAttribute("data-extra") === extra.value); });
    };
    where.addEventListener("change", update);
    extra.addEventListener("change", update);
    update();
  }

  /* ---- FAQ page: filter questions as you type ---- */
  var ff = $("#faq-filter");
  if (ff) {
    var qa = $$(".faq details"), groups = $$(".faq-group"), none = $("#faq-none");
    ff.addEventListener("input", function () {
      var q = ff.value.trim().toLowerCase(), shown = 0;
      qa.forEach(function (d) { var hit = !q || d.textContent.toLowerCase().indexOf(q) !== -1; d.hidden = !hit; if (hit) { shown++; } });
      groups.forEach(function (g) { g.hidden = !$$("details", g).some(function (d) { return !d.hidden; }); });
      if (none) { none.hidden = shown > 0; }
    });
  }

  /* ---- Estimate form ---- */
  $$(".lead-form").forEach(function (form) {
    var status = $(".form-status", form), btn = $('button[type="submit"]', form);
    var telLink = $(".bigtel") || $(".tel");
    var telText = telLink ? telLink.textContent.replace(/^\s*Call\s*/i, "").trim() : "us";
    function say(msg, cls) { status.textContent = msg; status.className = "form-status full " + (cls || ""); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      $$("input,select,textarea", form).forEach(function (el) { if (el.name) { data[el.name] = el.value.trim(); } });
      if (data.name.length < 2) { say("Add your name so we know who to ask for.", "is-err"); form.elements.name.focus(); return; }
      if (data.phone.replace(/\D/g, "").length < 7) { say("Add a phone number we can call you back on.", "is-err"); form.elements.phone.focus(); return; }
      if (data.address.length < 3) { say("Add the street address or neighborhood of the tree.", "is-err"); form.elements.address.focus(); return; }
      data.elapsed = Date.now() - loadedAt;
      btn.disabled = true; say("Sending your request.");
      fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (res.ok) { form.reset(); say("Request sent. We'll call you back at the number you gave.", "is-ok"); }
          else { say("That didn't send. Call " + telText + " instead.", "is-err"); }
        })
        .catch(function () { btn.disabled = false; say("That didn't send. Call " + telText + " instead.", "is-err"); });
    });
  });
})();
