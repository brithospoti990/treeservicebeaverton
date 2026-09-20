/* /api/leads : dashboard API. Password protected with the ADMIN_PASSWORD environment variable (12+ characters).
 *   GET                       list leads, newest first
 *   PATCH  {id,status,notes}  update one lead
 *   DELETE ?id=...            delete one lead
 * Ten wrong passwords from one address lock that address out for 15 minutes. */
const crypto = require("crypto");
const store = require("./_store.js");

function same(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest(), hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
async function readJson(req) {
  if (req.body && typeof req.body === "object") { return req.body; }
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const raw = await new Promise((resolve) => { let d = ""; req.on("data", (c) => { d += c; }); req.on("end", () => resolve(d)); req.on("error", () => resolve("")); });
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Content-Type", "application/json");
  const send = (code, body) => { res.statusCode = code; res.end(JSON.stringify(body)); };

  const pw = process.env.ADMIN_PASSWORD || "";
  if (pw.length < 12) { return send(503, { ok: false, error: "Set ADMIN_PASSWORD (12 or more characters) in Vercel, then redeploy." }); }
  if (!store.configured()) { return send(503, { ok: false, error: "No database connected. Add Upstash for Redis from the Vercel Storage tab, then redeploy." }); }

  try {
    const lockKey = "lock:" + store.clientIp(req);
    if ((await store.peek(lockKey)) >= 10) { return send(429, { ok: false, error: "Too many wrong passwords. Try again in 15 minutes." }); }
    const given = req.headers["x-admin-password"] || "";
    if (!given || !same(given, pw)) { await store.hit(lockKey, 900); return send(401, { ok: false, error: "Wrong password." }); }

    if (req.method === "GET") {
      return send(200, { ok: true, statuses: store.STATUSES, leads: await store.listLeads(1000) });
    }
    if (req.method === "PATCH") {
      const b = await readJson(req);
      const rec = await store.updateLead(String(b.id || ""), { status: b.status, notes: b.notes });
      return rec ? send(200, { ok: true, lead: rec }) : send(404, { ok: false, error: "Lead not found." });
    }
    if (req.method === "DELETE") {
      const id = String((req.query && req.query.id) || new URL(req.url, "http://x").searchParams.get("id") || "");
      return (await store.deleteLead(id)) ? send(200, { ok: true }) : send(404, { ok: false, error: "Lead not found." });
    }
    res.setHeader("Allow", "GET, PATCH, DELETE");
    return send(405, { ok: false, error: "Method not allowed." });
  } catch (e) {
    console.error("leads error", e && e.message);
    return send(500, { ok: false, error: "Server error. Check the function logs in Vercel." });
  }
};
