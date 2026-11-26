const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const ACCESS_COOKIE = "codlytic_access";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}
function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const item = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}
async function supa(path, options = {}, token = "") {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase environment variables are missing.");
  const response = await fetch(SUPABASE_URL + path, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
  if (!response.ok) {
    const error = new Error(data.message || data.msg || data.error_description || "Analytics request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
function validUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && req.headers.host && new URL(origin).host !== req.headers.host) {
    return send(res, 403, { error: "Invalid request origin." });
  }
  try {
    if (req.method === "POST") {
      const body = parseBody(req);
      const visitor_id = String(body.visitorId || "");
      const session_id = String(body.sessionId || "");
      const page_path = String(body.pagePath || "");
      const device_type = String(body.deviceType || "");
      const referrer_host = body.referrerHost ? String(body.referrerHost).toLowerCase().slice(0, 253) : null;
      if (!validUUID(visitor_id) || !validUUID(session_id)) return send(res, 400, { error: "Invalid anonymous visitor token." });
      if (!page_path.startsWith("/") || page_path.length > 240 || /[?#\r\n]/.test(page_path)) return send(res, 400, { error: "Invalid page path." });
      if (!["mobile", "desktop", "tablet"].includes(device_type)) return send(res, 400, { error: "Invalid device type." });
      if (referrer_host && !/^[a-z0-9.-]+$/.test(referrer_host)) return send(res, 400, { error: "Invalid referrer." });
      await supa("/rest/v1/portfolio_visits?on_conflict=visitor_id,session_id,page_path", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ visitor_id, session_id, page_path, device_type, referrer_host })
      });
      return send(res, 202, { tracked: true });
    }
    if (req.method === "GET") {
      const token = getCookie(req, ACCESS_COOKIE);
      if (!token) return send(res, 401, { error: "Please sign in first." });
      await supa("/auth/v1/user", {}, token);
      const admin = await supa("/rest/v1/rpc/is_admin", { method: "POST", body: "{}" }, token);
      if (admin !== true) return send(res, 403, { error: "Admin access required." });
      const analytics = await supa("/rest/v1/rpc/get_portfolio_analytics", { method: "POST", body: "{}" }, token);
      return send(res, 200, { analytics });
    }
    return send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "Analytics request failed." });
  }
}
