/* POST /api/lead : estimate-form handler.
 * 1. saves the lead (if the Upstash database is connected)   2. emails it (if Resend is set up)   3. posts it to a webhook (if set)
 * If none of the three is configured it answers 503 and the page tells the visitor to call, so a lead is never silently lost.
 * Optional environment variables: RESEND_API_KEY, LEAD_TO, LEAD_FROM, LEAD_WEBHOOK_URL, LEAD_RETENTION_DAYS. */
const store = require("./_store.js");

const SERVICES = ["Tree removal", "Emergency tree service", "Tree trimming and maintenance", "Stump grinding", "Stump removal", "Not sure yet"];

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

async function readBody(req) {
  if (req.body && typeof req.body === "object") { return req.body; }
  let raw = typeof req.body === "string" ? req.body : "";
  if (!raw) {
    raw = await new Promise((resolve) => {
      let d = ""; req.on("data", (c) => { d += c; if (d.length > 20000) { req.destroy(); } });
      req.on("end", () => resolve(d)); req.on("error", () => resolve(""));
    });
  }
  try { return JSON.parse(raw); } catch (e) { /* not JSON */ }
  const out = {}; new URLSearchParams(raw).forEach((v, k) => { out[k] = v; }); return out;
}

async function sendEmail(lead) {
  const key = process.env.RESEND_API_KEY, to = process.env.LEAD_TO, from = process.env.LEAD_FROM;
  if (!key || !to || !from) { return false; }
  const rows = [["Name", lead.name], ["Phone", lead.phone], ["Email", lead.email || "-"], ["Service", lead.service],
    ["Address", lead.address], ["Details", lead.details || "-"], ["Page", lead.page]];
  const html = "<table cellpadding='6' style='font:15px Arial,sans-serif;border-collapse:collapse'>" +
    rows.map((r) => "<tr><td style='color:#4A5B53;vertical-align:top'>" + esc(r[0]) + "</td><td><b>" + esc(r[1]).replace(/\n/g, "<br>") + "</b></td></tr>").join("") + "</table>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: to.split(",").map((s) => s.trim()), subject: "New estimate request: " + lead.service + " (" + lead.name + ")",
      html, reply_to: lead.email || undefined }),
  });
  return r.ok;
}

async function sendWebhook(lead) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) { return false; }
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
  return r.ok;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const wantsJson = /json/.test(req.headers.accept || "") || /json/.test(req.headers["content-type"] || "");
  const done = (code, body) => {
    if (wantsJson) { res.statusCode = code; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify(body)); }
    res.statusCode = 303; res.setHeader("Location", body.ok ? "/thank-you/" : "/?form=error#estimate"); return res.end();
  };
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return done(405, { ok: false, error: "method" }); }

  const b = await readBody(req);
  // Bot traps: a filled honeypot, or a form sent faster than a person can type. Answer "ok" so bots learn nothing.
  if (clean(b.website, 200) !== "" || (b.elapsed !== undefined && Number(b.elapsed) < 2500)) { return done(200, { ok: true }); }

  const lead = {
    name: clean(b.name, 80), phone: clean(b.phone, 30), email: clean(b.email, 120), address: clean(b.address, 160),
    service: SERVICES.indexOf(clean(b.service, 60)) !== -1 ? clean(b.service, 60) : "Not sure yet",
    details: clean(b.details, 2000), page: clean(b.page, 200) || "/",
  };
  if (lead.name.length < 2 || lead.phone.replace(/\D/g, "").length < 7 || lead.address.length < 3) { return done(400, { ok: false, error: "missing" }); }
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) { lead.email = ""; }

  try {
    if (store.configured()) {
      const n = await store.hit("rl:" + store.clientIp(req), 600);
      if (n > 6) { return done(429, { ok: false, error: "rate" }); }
    }
    const results = await Promise.allSettled([
      store.configured() ? store.saveLead(lead).then(() => true) : Promise.resolve(false),
      sendEmail(lead), sendWebhook(lead),
    ]);
    const delivered = results.some((r) => r.status === "fulfilled" && r.value === true);
    if (!delivered) { return done(503, { ok: false, error: "not_configured" }); }
    return done(200, { ok: true });
  } catch (e) {
    console.error("lead error", e && e.message);
    return done(500, { ok: false, error: "server" });
  }
};
