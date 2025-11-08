## Quick context

- Stack: React + Vite (JSX), TailwindCSS. Entrypoint: `src/main.jsx` -> `src/App.jsx`.
- Auth & backend: Supabase JS v2 is used for authentication and data. Clients live in `src/supabaseClient.js` and `src/lib/supabaseClient.js` (both verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
- Routing: `react-router-dom` with `PrivateRoute` / `PublicRoute` implemented in `src/App.jsx`. The primary authenticated route is `/perfil` (see `App.jsx`).

## What an AI coding agent should know first

1. Environment & run commands
   - Dev: `npm run dev` (uses Vite). Build: `npm run build`. Preview: `npm run preview`.
   - Important env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The app intentionally throws if these are missing (see `src/lib/supabaseClient.js` / `src/supabaseClient.js`). Use a `.env` or `.env.local` with the `VITE_` prefix.

2. Authentication flow
   - `AuthProvider` (`src/context/AuthContext.jsx`) wraps the app in `src/main.jsx`.
   - It calls `supabase.auth.getSession()` on load and listens to `supabase.auth.onAuthStateChange` to keep `session` in sync.
   - Exposed helpers used by UI: `signInWithGoogle` (OAuth), `signOut`, and `session` via `useAuth()` hook.
   - Login page (`src/pages/Login.jsx`) calls `signInWithGoogle()` and expects the supabase OAuth redirect handled by `detectSessionInUrl: true` in the client config.

3. Routing & UI conventions
   - `App.jsx` contains `PrivateRoute`/`PublicRoute`. When authenticated the `Navbar` is shown and the default authenticated route is `/perfil`.
   - Routes of interest: `/` (login), `/perfil`, `/facturas`, `/reportes`.

4. Files and examples to reference
   - Auth client: `src/lib/supabaseClient.js`, `src/supabaseClient.js` (guards on missing env vars).
   - Auth context: `src/context/AuthContext.jsx` (subscribe to auth state updates, provides signInWithGoogle/signOut).
   - Router example: `src/App.jsx` (PrivateRoute/PublicRoute usage and redirect logic).
   - Login: `src/pages/Login.jsx` (how sign-in is triggered and error handling).

## Common tasks and how to approach them (practical guidance)

- Add a new protected page: create `src/pages/YourPage.jsx`, then add a `<Route path="/yourpage" element={<PrivateRoute><YourPage/></PrivateRoute>} />` to `src/App.jsx` so it follows the project's authentication gating pattern.

- Calling Supabase from components: import `supabase` from `src/supabaseClient.js` (or `src/lib/supabaseClient.js`). Assume session persistence and token refresh are handled by client config.

- Debugging auth/OAuth problems:
  - Ensure `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` exist locally.
  - Check browser console for Supabase errors (client throws on missing env vars).
  - OAuth redirect handling: Vite dev server and production must have correct redirect URIs configured in Supabase dashboard; client sets `detectSessionInUrl: true`.

## Project-specific conventions & gotchas

- The app uses plain JSX files (`.jsx`) although some devDependencies include `@types/*` — do not convert the repo to TypeScript without user approval.
- There are two supabase client files (`src/supabaseClient.js` and `src/lib/supabaseClient.js`) that are similar; prefer importing whichever the module that the current file already imports to avoid duplicate clients.
- AuthContext returns `session`, `signInWithGoogle`, and `signOut`. Use `useAuth()` in components rather than directly accessing `supabase.auth` to keep behavior consistent.
- The code assumes Tailwind is configured (see `tailwind.config.js`) and global styles are imported in `src/main.jsx` (`global.css`). Keep class names consistent with existing utilities.

## Build & lint rules

- Lint: `npm run lint` (uses ESLint). Keep hooks rules and react-refresh plugin in mind.
- Build: `npm run build` (Vite). If adding runtime env usage, use `import.meta.env.VITE_*`.

## When to ask the user before making changes

- Major changes to auth flow (replacing Supabase, changing session persistence) — these are security-sensitive.
- Converting codebase from JSX to TypeScript.
- Consolidating duplicate supabase client files — ask which one should be canonical.

## Quick checklist for PRs the AI prepares

- Run `npm run dev` and verify the app boots and the Login page loads (or report dev-start errors).
- Ensure `VITE_*` env vars are documented in the PR description and in any test instructions.
- Use the `useAuth()` hook for auth-related UI interactions.
- Add tests or an explicit manual verification note if touching auth, routing, or build config.

---

If any of the above is unclear or you want the file to be stricter/longer, tell me which areas to expand (examples, more file references, or developer runbook). I'll iterate quickly.
