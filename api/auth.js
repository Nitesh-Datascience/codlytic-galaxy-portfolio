const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const COOKIE_ACCESS = "codlytic_access";
const COOKIE_REFRESH = "codlytic_refresh";
const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

function cookie(req, name) {
  const raw = req.headers.cookie || "";
  const item = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
function setCookie(res, name, value, maxAge) {
  res.setHeader("Set-Cookie", [
    ...(res.getHeader("Set-Cookie") || []),
    name + "=" + encodeURIComponent(value) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + maxAge + secure
  ]);
}
function clearCookies(res) {
  res.setHeader("Set-Cookie", [
    COOKIE_ACCESS + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + secure,
    COOKIE_REFRESH + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + secure
  ]);
}
function saveSession(res, session) {
  if (session?.access_token) setCookie(res, COOKIE_ACCESS, session.access_token, Math.max(60, session.expires_in || 3600));
  if (session?.refresh_token) setCookie(res, COOKIE_REFRESH, session.refresh_token, 60 * 60 * 24 * 60);
}
async function supa(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase environment variables are missing.");
  const response = await fetch(SUPABASE_URL + "/auth/v1/" + path, {
    ...options,
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.msg || body.message || body.error_description || body.error || "Authentication request failed.");
    error.status = response.status;
    throw error;
  }
  return body;
}
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host && new URL(origin).host !== host) return json(res, 403, { error: "Invalid request origin." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const action = body.action;
    const callback = "https://codlytic-galaxy-portfolio.vercel.app/auth/callback.html";
    if (action === "signup") {
      const result = await supa("signup?redirect_to=" + encodeURIComponent(callback), {
        method: "POST", body: JSON.stringify({ email: body.email, password: body.password, data: { full_name: body.fullName || "" } })
      });
      if (result.access_token) saveSession(res, result);
      return json(res, 200, { message: result.access_token ? "Account created and signed in." : "Account created. Check your email to confirm it, then sign in." });
    }
    if (action === "signin") {
      const result = await supa("token?grant_type=password", {
        method: "POST", body: JSON.stringify({ email: body.email, password: body.password })
      });
      saveSession(res, result);
      return json(res, 200, { message: "Signed in.", user: { id: result.user?.id, email: result.user?.email } });
    }
    if (action === "store-session") {
      const access = body.access_token;
      const refresh = body.refresh_token;
      if (!access || !refresh) return json(res, 400, { error: "Missing session tokens." });
      const user = await supa("user", { headers: { Authorization: "Bearer " + access } });
      saveSession(res, { access_token: access, refresh_token: refresh, expires_in: body.expires_in || 3600 });
      return json(res, 200, { message: "Session saved.", user: { id: user.id, email: user.email } });
    }
    if (action === "session") {
      const access = cookie(req, COOKIE_ACCESS);
      if (!access) return json(res, 401, { error: "Not signed in." });
      const user = await supa("user", { headers: { Authorization: "Bearer " + access } });
      return json(res, 200, { user: { id: user.id, email: user.email } });
    }
    if (action === "signout") {
      const access = cookie(req, COOKIE_ACCESS);
      if (access) await supa("logout", { method: "POST", headers: { Authorization: "Bearer " + access } }).catch(() => {});
      clearCookies(res);
      return json(res, 200, { message: "Signed out." });
    }
    if (action === "recover") {
      await supa("recover?redirect_to=" + encodeURIComponent("https://codlytic-galaxy-portfolio.vercel.app/reset-password.html"), {
        method: "POST", body: JSON.stringify({ email: body.email })
      });
      return json(res, 200, { message: "If that email is registered, a password reset link has been sent." });
    }
    if (action === "update-password") {
      const access = body.access_token || cookie(req, COOKIE_ACCESS);
      if (!access) return json(res, 401, { error: "Password reset session is missing. Open the email link again." });
      const user = await supa("user", { method: "PUT", headers: { Authorization: "Bearer " + access }, body: JSON.stringify({ password: body.password }) });
      if (body.refresh_token) saveSession(res, { access_token: access, refresh_token: body.refresh_token, expires_in: 3600 });
      return json(res, 200, { message: "Password updated.", user: { id: user.id, email: user.email } });
    }
    return json(res, 400, { error: "Unknown authentication action." });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Authentication failed." });
  }
}
