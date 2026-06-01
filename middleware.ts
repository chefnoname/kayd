import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth middleware:
 *  - Public routes: /login, /signup, /set-password, /auth/*
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

  const publicPath = isPublicPath(pathname);

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
