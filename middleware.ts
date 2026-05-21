import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Auth middleware:
 *  - Unauthenticated → /login (except /login itself)
 *  - /admin → only superadmin
 *  - /admin/team → admin or superadmin
 *  - Authenticated without today's rate set → /setup (skip for /admin routes)
 *  - Otherwise → allow
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and Next internals
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

  const isLogin = pathname.startsWith("/login");
  const isSetup = pathname.startsWith("/setup");
  const isAdmin = pathname.startsWith("/admin");

  if (!user) {
    if (isLogin) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated — bounce off /login
  if (isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Role-based access for /admin routes
  if (isAdmin) {
    const { data: staffUser } = await supabase
      .from("staff_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = staffUser?.role ?? "staff";

    // /admin/team → admin or superadmin
    if (pathname.startsWith("/admin/team")) {
      if (role !== "admin" && role !== "superadmin") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
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

  // Check today's rate (skip for /setup itself)
  const today = new Date().toISOString().slice(0, 10);
  const { data: rate } = await supabase
    .from("daily_rates")
    .select("id")
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
