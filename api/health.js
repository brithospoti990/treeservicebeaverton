/* GET /api/health : set-up check for the lead form. Shows which pieces are configured, never any secret values.
 * Open https://treeservicebeaverton.net/api/health after adding the database and the environment variables, then redeploying. */
const store = require("./_store.js");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Content-Type", "application/json");
  const out = {
    database_connected: store.configured(),
    database_reachable: null,
    admin_password_set: (process.env.ADMIN_PASSWORD || "").length >= 12,
    email_alerts_set: Boolean(process.env.RESEND_API_KEY && process.env.LEAD_TO && process.env.LEAD_FROM),
    webhook_set: Boolean(process.env.LEAD_WEBHOOK_URL),
    retention_days: parseInt(process.env.LEAD_RETENTION_DAYS || "730", 10) || 730,
  };
  if (out.database_connected) {
    try { await store.peek("health"); out.database_reachable = true; } catch (e) { out.database_reachable = false; }
  }
  out.form_will_deliver = Boolean((out.database_connected && out.database_reachable) || out.email_alerts_set || out.webhook_set);
  out.dashboard_ready = Boolean(out.database_connected && out.database_reachable && out.admin_password_set);
  out.next_step = !out.database_connected ? "Vercel > Storage > Create Database > Upstash for Redis, connect it to this project, then redeploy."
    : out.database_reachable === false ? "The database variables are set but the database did not answer. Check the Upstash integration, then redeploy."
    : !out.admin_password_set ? "Add ADMIN_PASSWORD (12 or more characters) under Settings > Environment Variables, then redeploy."
    : "All set. Send a test request from the home page form, then open /admin/.";
  res.statusCode = 200;
  res.end(JSON.stringify(out, null, 2));
};
