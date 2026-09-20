/* Leads dashboard. Lead data is only ever written to the page with textContent, never as HTML. */
(function () {
  "use strict";
  var KEY = "tsb-admin", pw = "", leads = [], statuses = [], current = null;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  try { pw = sessionStorage.getItem(KEY) || ""; } catch (e) { pw = ""; }

  function api(method, body, query) {
    return fetch("/api/leads" + (query || ""), {
      method: method, headers: { "x-admin-password": pw, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined, cache: "no-store"
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.httpStatus = r.status; return j; }); });
  }
  function show(login) { $("login").hidden = !login; $("dash").hidden = login; }
  function fmt(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }

  function load() {
    $("dash-msg").textContent = "Loading leads.";
    return api("GET").then(function (j) {
      if (!j.ok) {
        if (j.httpStatus === 401 || j.httpStatus === 429) { signOut(j.error); return; }
        show(false); $("dash-msg").textContent = j.error || "Couldn't load leads. Refresh to try again."; return;
      }
      try { sessionStorage.setItem(KEY, pw); } catch (e) { /* private mode */ }
      leads = j.leads || []; statuses = j.statuses || [];
      fillSelect($("f-status"), "All statuses", statuses);
      fillSelect($("f-service"), "All services", uniq(leads.map(function (l) { return l.service; })));
      show(false); $("dash-msg").textContent = ""; render();
    }).catch(function () { show(false); $("dash-msg").textContent = "Couldn't reach the server. Check your connection and refresh."; });
  }
  function signOut(msg) {
    pw = ""; try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    leads = []; current = null; show(true); $("login-msg").textContent = msg || ""; $("pw").value = ""; $("pw").focus();
  }
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }).sort(); }
  function fillSelect(sel, allLabel, values) {
    var keep = sel.value; sel.textContent = ""; sel.appendChild(new Option(allLabel, ""));
    values.forEach(function (v) { sel.appendChild(new Option(v, v)); }); sel.value = keep;
  }
  function filtered() {
    var q = $("q").value.trim().toLowerCase(), st = $("f-status").value, sv = $("f-service").value;
    return leads.filter(function (l) {
      if (st && l.status !== st) { return false; }
      if (sv && l.service !== sv) { return false; }
      if (!q) { return true; }
      return [l.name, l.phone, l.email, l.address, l.details, l.notes].join(" ").toLowerCase().indexOf(q) !== -1;
    });
  }
  function render() {
    var week = Date.now() - 7 * 86400000, c = $("counters"); c.textContent = "";
    [["All leads", leads.length], ["New", leads.filter(function (l) { return l.status === "New"; }).length],
      ["Last 7 days", leads.filter(function (l) { return new Date(l.created).getTime() >= week; }).length],
      ["Won", leads.filter(function (l) { return l.status === "Won"; }).length]].forEach(function (p) {
      var d = el("div", "adm-count"); d.appendChild(el("b", "", String(p[1]))); d.appendChild(el("span", "", p[0])); c.appendChild(d);
    });
    var list = $("list"), rows = filtered(); list.textContent = "";
    if (!rows.length) { list.appendChild(el("li", "adm-empty", leads.length ? "No leads match those filters." : "No leads yet. Send a test request from the home page form.")); }
    rows.forEach(function (l) {
      var li = el("li"), b = el("button", "adm-row"); b.type = "button";
      if (current && current.id === l.id) { b.setAttribute("aria-current", "true"); }
      b.appendChild(el("span", "n", l.name)); var pill = el("span", "pill", l.status); pill.setAttribute("data-s", l.status); b.appendChild(pill);
      b.appendChild(el("span", "m", l.service + ", " + l.address)); b.appendChild(el("span", "d", fmt(l.created)));
      b.addEventListener("click", function () { current = l; render(); detail(l, true); });
      li.appendChild(b); list.appendChild(li);
    });
  }
  function detail(l, scroll) {
    var box = $("detail"); box.textContent = "";
    box.appendChild(el("h2", "", l.name));
    var dl = el("dl");
    function row(k, v, href) {
      dl.appendChild(el("dt", "", k)); var dd = el("dd");
      if (href && v) { var a = el("a", "", v); a.href = href; dd.appendChild(a); } else { dd.textContent = v || "-"; }
      dl.appendChild(dd);
    }
    row("Phone", l.phone, "tel:" + String(l.phone).replace(/[^\d+]/g, ""));
    row("Email", l.email, l.email ? "mailto:" + l.email : "");
    row("Service", l.service); row("Address", l.address); row("Details", l.details); row("Sent from", l.page); row("Received", fmt(l.created));
    box.appendChild(dl);
    var f1 = el("div", "field"), lab1 = el("label", "", "Status"), sel = el("select"); lab1.htmlFor = "d-status"; sel.id = "d-status";
    statuses.forEach(function (s) { sel.appendChild(new Option(s, s)); }); sel.value = l.status; f1.appendChild(lab1); f1.appendChild(sel); box.appendChild(f1);
    var f2 = el("div", "field"), lab2 = el("label", "", "Private notes"), ta = el("textarea"); lab2.htmlFor = "d-notes"; ta.id = "d-notes"; ta.value = l.notes || "";
    f2.appendChild(lab2); f2.appendChild(ta); box.appendChild(f2);
    var r = el("div", "row"), save = el("button", "btn btn-primary", "Save changes"), del = el("button", "btn btn-danger", "Delete lead"), msg = el("span", "adm-msg is-ok");
    save.type = "button"; del.type = "button"; r.appendChild(save); r.appendChild(del); r.appendChild(msg); box.appendChild(r);
    save.addEventListener("click", function () {
      save.disabled = true; msg.textContent = "Saving.";
      api("PATCH", { id: l.id, status: sel.value, notes: ta.value }).then(function (j) {
        save.disabled = false;
        if (!j.ok) { msg.className = "adm-msg"; msg.textContent = j.error || "Changes weren't saved. Try again."; return; }
        leads = leads.map(function (x) { return x.id === l.id ? j.lead : x; }); current = j.lead; render(); detail(j.lead);
        $("detail").querySelector(".adm-msg").textContent = "Changes saved.";
      });
    });
    del.addEventListener("click", function () {
      if (!window.confirm("Delete this lead from " + l.name + "? This can't be undone.")) { return; }
      api("DELETE", null, "?id=" + encodeURIComponent(l.id)).then(function (j) {
        if (!j.ok) { msg.className = "adm-msg"; msg.textContent = j.error || "The lead wasn't deleted. Try again."; return; }
        leads = leads.filter(function (x) { return x.id !== l.id; }); current = null; render();
        box.textContent = ""; box.appendChild(el("p", "small", "Lead deleted."));
      });
    });
    if (scroll && window.matchMedia("(max-width:979px)").matches) { box.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  function csvCell(v) {
    v = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(v)) { v = "'" + v; } // stops spreadsheet formula injection
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function exportCsv() {
    var cols = ["created", "status", "name", "phone", "email", "service", "address", "details", "page", "notes"];
    var lines = [cols.join(",")].concat(filtered().map(function (l) { return cols.map(function (k) { return csvCell(l[k]); }).join(","); }));
    var a = el("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv" }));
    a.download = "leads-" + new Date().toISOString().slice(0, 10) + ".csv"; document.body.appendChild(a); a.click(); a.remove();
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault(); pw = $("pw").value; $("login-msg").textContent = "";
    api("GET").then(function (j) {
      if (!j.ok) { pw = ""; $("login-msg").textContent = j.error || "That didn't work. Try again."; return; }
      load();
    }).catch(function () { $("login-msg").textContent = "Couldn't reach the server. Check your connection."; });
  });
  ["q", "f-status", "f-service"].forEach(function (id) { $(id).addEventListener("input", render); });
  $("refresh").addEventListener("click", load);
  $("export").addEventListener("click", exportCsv);
  $("signout").addEventListener("click", function () { signOut(""); });

  if (pw) { load(); } else { show(true); }
})();
