import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth middleware:
 *  - Public routes: /login, /signup, /verify-email, /set-password, /auth/*
 *  - Unauthenticated → /login
 *  - Authenticated but email not verified → /verify-email
 *  - /admin (root) → superadmin only
 *  - /admin/team → admin or superadmin (staff → /dashboard?denied=team)
 *  - Verified user without today's rate → /setup
 */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/verify-email",
  "/set-password",
  "/auth",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, API routes, and files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
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

  const publicPath = isPublicPath(pathname);

  // Not signed in → only public pages allowed
  if (!user) {
    if (publicPath) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const emailConfirmed = Boolean(user.email_confirmed_at);

  // Signed in but email not verified → /verify-email holding page.
  // /set-password and /auth/* must remain reachable so invited users can
  // complete their flow.
  if (!emailConfirmed) {
    const allowedUnverified =
      pathname.startsWith("/verify-email") ||
      pathname.startsWith("/set-password") ||
      pathname.startsWith("/auth");
    if (allowedUnverified) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/verify-email";
    return NextResponse.redirect(url);
  }

  // Authenticated + verified → bounce off auth-only pages
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
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

  // Verified dashboard users without today's rate → /setup
  const isSetup = pathname.startsWith("/setup");
  const today = new Date().toISOString().slice(0, 10);

  // Without an organisation we can't look up a rate; skip the redirect.
  if (!orgId) return response;

  const { data: rate } = await supabase
    .from("daily_rates")
    .select("id")
    .eq("organisation_id", orgId)
    .eq("date", today)
    .maybeSingle();

  if (!rate && !isSetup) {
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
