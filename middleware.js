import { next } from "@vercel/functions";

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function readCookie(request, name) {
  const value = request.headers.get("cookie") || "";
  const entry = value.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
}
function cookieHeader(name, value, maxAge) {
  return name + "=" + encodeURIComponent(value) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAge;
}
export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };

export default async function middleware(request) {
  const url = new URL(request.url);
  let access = readCookie(request, "codlytic_access");
  let refresh = readCookie(request, "codlytic_refresh");
  const headers = new Headers();
  let authenticated = false;

  if (SUPABASE_URL && KEY && access) {
    try {
      const check = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + access } });
      authenticated = check.ok;
    } catch {}
  }
  if (!authenticated && SUPABASE_URL && KEY && refresh) {
    try {
      const renewed = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh })
      });
      if (renewed.ok) {
        const session = await renewed.json();
        access = session.access_token;
        refresh = session.refresh_token;
        const userCheck = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: KEY, Authorization: "Bearer " + access } });
        authenticated = userCheck.ok;
        if (authenticated) {
          headers.append("Set-Cookie", cookieHeader("codlytic_access", access, session.expires_in || 3600));
          headers.append("Set-Cookie", cookieHeader("codlytic_refresh", refresh, 60 * 60 * 24 * 60));
        }
      }
    } catch {}
  }
  if (!authenticated) {
    const login = new URL("/login.html", url.origin);
    login.searchParams.set("next", url.pathname + url.search);
    return Response.redirect(login, 302);
  }
  const response = next();
  for (const value of headers.getSetCookie ? headers.getSetCookie() : []) response.headers.append("Set-Cookie", value);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
