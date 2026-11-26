const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const ACCESS_COOKIE = "codlytic_access";
const CATEGORIES = ["Python", "SQL", "Excel", "Power BI", "Machine Learning", "AI", "Interview Questions", "Projects", "Personal Ideas"];

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
    const error = new Error(data.message || data.msg || data.error_description || "Notes request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
function parseBody(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}
function cleanNote(body) {
  const title = String(body.title || "").trim().slice(0, 160);
  const content = String(body.content || "").trim().slice(0, 30000);
  const category = String(body.category || "Personal Ideas");
  const status = body.status === "published" ? "published" : "private";
  if (!title || !content) throw Object.assign(new Error("Title and note content are required."), { status: 400 });
  if (!CATEGORIES.includes(category)) throw Object.assign(new Error("Choose a valid category."), { status: 400 });
  return { title, content, category, status };
}
export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && req.headers.host && new URL(origin).host !== req.headers.host) return send(res, 403, { error: "Invalid request origin." });
  try {
    if (req.method === "GET") {
      const token = getCookie(req, ACCESS_COOKIE);
      if (token) {
        try {
          await supa("/auth/v1/user", {}, token);
          const admin = await supa("/rest/v1/rpc/is_admin", { method: "POST", body: "{}" }, token);
          if (admin === true) {
            const rows = await supa("/rest/v1/codlytic_notes?select=id,title,content,category,status,created_at,updated_at&order=updated_at.desc", {}, token);
            return send(res, 200, { notes: rows, admin: true });
          }
        } catch (error) {
          if (error.status && error.status !== 401 && error.status !== 403) throw error;
        }
      }
      const rows = await supa("/rest/v1/codlytic_notes?select=id,title,content,category,created_at,updated_at&status=eq.published&order=updated_at.desc");
      return send(res, 200, { notes: rows, admin: false });
    }
    const token = getCookie(req, ACCESS_COOKIE);
    if (!token) return send(res, 401, { error: "Please sign in first." });
    await supa("/auth/v1/user", {}, token);
    const admin = await supa("/rest/v1/rpc/is_admin", { method: "POST", body: "{}" }, token);
    if (admin !== true) return send(res, 403, { error: "This account does not have note-editor access yet." });
    if (req.method === "POST") {
      const note = cleanNote(parseBody(req));
      const rows = await supa("/rest/v1/codlytic_notes", {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(note)
      }, token);
      return send(res, 201, { note: rows[0] });
    }
    const id = String(parseBody(req).id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: "A valid note ID is required." });
    if (req.method === "PATCH") {
      const note = cleanNote(parseBody(req));
      const rows = await supa("/rest/v1/codlytic_notes?id=eq." + encodeURIComponent(id), {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(note)
      }, token);
      if (!rows.length) return send(res, 404, { error: "Note not found." });
      return send(res, 200, { note: rows[0] });
    }
    if (req.method === "DELETE") {
      await supa("/rest/v1/codlytic_notes?id=eq." + encodeURIComponent(id), { method: "DELETE" }, token);
      return send(res, 200, { deleted: true });
    }
    return send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "Notes request failed." });
  }
}
