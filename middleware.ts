import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LANG_COOKIE, isLocale } from "@/components/landing/i18n";

/**
 * Auth middleware:
 *  - / → /home (marketing landing page, always public)
 *  - Public routes: /home, /login, /signup, /set-password, /auth/*
 *  - Unauthenticated → /login
 *  - /admin (root) → superadmin only
 *  - /admin/team → admin or superadmin (staff → /dashboard?denied=team)
 *  - Redirect old /settlement → /agent-deposits
 */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/set-password",
  "/auth",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isConsolePath(pathname: string): boolean {
  return pathname === "/console" || pathname.startsWith("/console/");
}

function isConsoleApi(pathname: string): boolean {
  return pathname === "/api/console" || pathname.startsWith("/api/console/");
}

/** Console pages reachable without a session. */
const CONSOLE_PUBLIC = ["/console/login", "/console/set-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Kayd console host separation ─────────────────────────────────────
  // With CONSOLE_HOST set (e.g. console.kayd.live), the console only answers
  // on that host and the client app never serves it. Without it (local dev,
  // previews) the console is reachable at /console on any host.
  const consoleHost = process.env.CONSOLE_HOST;
  const host = request.headers.get("host") ?? "";
  if (consoleHost) {
    const onConsoleHost = host === consoleHost;
    if (!onConsoleHost && (isConsolePath(pathname) || isConsoleApi(pathname))) {
      return new NextResponse("Not found", { status: 404 });
    }
    if (
      onConsoleHost &&
      !isConsolePath(pathname) &&
      !isConsoleApi(pathname) &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/auth/") &&
      !pathname.includes(".")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/console";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Skip static assets, API routes, and files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // The site root always lands on the marketing page, signed in or not.
  // Query params (e.g. ?lang=so) carry through.
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Public marketing landing page — no session lookup needed.
  // An explicit ?lang= choice is remembered for later visits.
  if (pathname === "/home") {
    const response = NextResponse.next();
    const lang = request.nextUrl.searchParams.get("lang");
    if (isLocale(lang)) {
      response.cookies.set(LANG_COOKIE, lang, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  }

  // /set-password must always be reachable so invited users can finish
  // signing up before any of the org / rate gating below kicks in.
  if (pathname === "/set-password" || pathname.startsWith("/set-password/")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Console pages: a session is required; kayd_staff is checked by the
  // console layout and every console API route on the server.
  if (isConsolePath(pathname)) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    if (CONSOLE_PUBLIC.includes(pathname)) return response;
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/console/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const publicPath = isPublicPath(pathname);

  // Signed-in pages must never be stored by the browser or a shared cache,
  // so Back after sign-out (or a new login on the same device) can't show
  // the previous account's data.
  if (user && !publicPath) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  // Not signed in → only public pages allowed
  if (!user) {
    if (publicPath) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated → bounce off auth-only pages
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Kayd staff have no organisation; send them to the console.
  if (user.app_metadata?.kayd_staff === true || user.app_metadata?.kayd_staff === "true") {
    const url = request.nextUrl.clone();
    if (consoleHost) url.host = consoleHost;
    url.pathname = "/console";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Locked people and suspended organisations are signed out at once.
  // (Their data is already hidden: current_org_id() returns null for them.)
  const { data: accountState } = await supabase.rpc("my_account_state");
  const state = Array.isArray(accountState) ? accountState[0] : accountState;
  if (state?.locked || state?.org_suspended) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("blocked", state.locked ? "locked" : "suspended");
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Caller's row — used for both role gating and org scoping below.
  const { data: staffUser } = await supabase
    .from("staff_users")
    .select("role, organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = staffUser?.role ?? "staff";
  const orgId = (staffUser?.organisation_id as string | null) ?? null;

  // Role-based access for /admin routes
  if (pathname.startsWith("/admin")) {

    if (pathname.startsWith("/admin/team")) {
      if (role !== "admin" && role !== "superadmin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("denied", "team");
        return NextResponse.redirect(url);
      }
      return response;
    }

    // /admin (root) → superadmin only
    if (role !== "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Redirect old /settlement path to /agent-deposits
  if (pathname === "/settlement" || pathname.startsWith("/settlement/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/agent-deposits";
    // Preserve query params (e.g. ?agentId=...)
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
