/* Lead storage on Upstash Redis over its REST API. No dependencies.
 * Add "Upstash for Redis" to the project from Vercel > Storage and the two variables appear by themselves:
 *   KV_REST_API_URL + KV_REST_API_TOKEN            (names Vercel injects)   or
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (names Upstash uses)
 * Files in /api that start with "_" are helpers, not endpoints. */
const crypto = require("crypto");

const P = "tsb:"; // key prefix, so one database can be shared with other sites
const STATUSES = ["New", "Contacted", "Estimate booked", "Quoted", "Won", "Lost", "Spam"];

function cfg() {
  return {
    url: (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, ""),
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
  };
}
function configured() { const c = cfg(); return Boolean(c.url && c.token); }

async function pipe(cmds) {
  const c = cfg();
  const r = await fetch(c.url + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) { throw new Error("store " + r.status); }
  const out = await r.json();
  return out.map((o) => { if (o && o.error) { throw new Error(o.error); } return o ? o.result : null; });
}

function ttlSeconds() {
  const d = parseInt(process.env.LEAD_RETENTION_DAYS || "730", 10);
  return (d > 0 ? d : 730) * 86400;
}
function validId(id) { return typeof id === "string" && /^[a-z0-9]{6,14}-[a-f0-9]{8}$/.test(id); }

async function saveLead(fields) {
  const now = Date.now();
  const id = now.toString(36) + "-" + crypto.randomBytes(4).toString("hex");
  const rec = Object.assign({ id, created: new Date(now).toISOString(), status: "New", notes: "" }, fields);
  await pipe([["SET", P + "lead:" + id, JSON.stringify(rec), "EX", ttlSeconds()], ["ZADD", P + "leads", now, id]]);
  return rec;
}

async function listLeads(limit) {
  const ids = (await pipe([["ZREVRANGE", P + "leads", 0, (limit || 1000) - 1]]))[0] || [];
  if (!ids.length) { return []; }
  const vals = (await pipe([["MGET"].concat(ids.map((i) => P + "lead:" + i))]))[0] || [];
  const out = [], gone = [];
  vals.forEach((v, i) => {
    if (!v) { gone.push(ids[i]); return; }
    try { out.push(JSON.parse(v)); } catch (e) { gone.push(ids[i]); }
  });
  if (gone.length) { await pipe([["ZREM", P + "leads"].concat(gone)]); } // expired leads drop out of the index
  return out;
}

async function updateLead(id, patch) {
  if (!validId(id)) { return null; }
  const key = P + "lead:" + id;
  const res = await pipe([["GET", key], ["TTL", key]]);
  if (!res[0]) { return null; }
  const rec = JSON.parse(res[0]);
  if (typeof patch.status === "string" && STATUSES.indexOf(patch.status) !== -1) { rec.status = patch.status; }
  if (typeof patch.notes === "string") { rec.notes = patch.notes.slice(0, 4000); }
  rec.updated = new Date().toISOString();
  const ttl = res[1] > 0 ? res[1] : ttlSeconds();
  await pipe([["SET", key, JSON.stringify(rec), "EX", ttl]]);
  return rec;
}

async function deleteLead(id) {
  if (!validId(id)) { return false; }
  const res = await pipe([["DEL", P + "lead:" + id], ["ZREM", P + "leads", id]]);
  return res[0] === 1 || res[1] === 1;
}

/* Counter with a time window. Returns the count after this hit. */
async function hit(name, windowSeconds) {
  const key = P + name;
  const res = await pipe([["INCR", key], ["TTL", key]]);
  if (res[1] < 0) { await pipe([["EXPIRE", key, windowSeconds]]); }
  return res[0];
}
async function peek(name) { const v = (await pipe([["GET", P + name]]))[0]; return v ? parseInt(v, 10) : 0; }
async function clear(name) { await pipe([["DEL", P + name]]); }

function clientIp(req) {
  const f = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = f || req.headers["x-real-ip"] || "unknown";
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 24); // never store raw IPs
}

module.exports = { STATUSES, configured, saveLead, listLeads, updateLead, deleteLead, hit, peek, clear, clientIp };
