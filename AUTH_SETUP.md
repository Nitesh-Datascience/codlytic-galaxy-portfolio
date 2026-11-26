# CODLYTIC Authentication

This repository uses a plain HTML/CSS/JavaScript frontend with Vercel Routing Middleware and Supabase Auth.

## Routes

- `/login.html` — email/password sign-in, account creation, and password recovery
- `/auth/callback.html` — receives Supabase email-confirmation tokens and stores a verified session
- `/reset-password.html` — password recovery form
- `/dashboard` — private dashboard, protected by root `middleware.js`
- `/api/auth` — server-side Supabase Auth proxy; session tokens are stored in HttpOnly cookies

## Vercel environment variables

Set for Production, Preview, and Development:

- `SUPABASE_URL` — the project's Supabase URL
- `SUPABASE_PUBLISHABLE_KEY` — the project's publishable key (never use a service-role/secret key here)

## Supabase Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration, set:

- Site URL: `https://codlytic-galaxy-portfolio.vercel.app`
- Redirect URL allow-list: `https://codlytic-galaxy-portfolio.vercel.app/auth/callback.html`
- Redirect URL allow-list: `https://codlytic-galaxy-portfolio.vercel.app/reset-password.html`

If you use a custom domain, add its matching callback and reset URLs too.

## Security notes

- The browser never receives a service-role key.
- The API verifies tokens with Supabase Auth and sets HttpOnly, Secure, SameSite=Lax cookies.
- Vercel middleware validates the Supabase user for every `/dashboard` request and refreshes expired sessions.
- Keep Row Level Security enabled on user-owned tables and write ownership policies; a protected page alone does not protect database rows.
- Never use user-editable user metadata as an authorization role.
