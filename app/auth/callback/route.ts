import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth/email-link callback. Supabase redirects here after the user clicks
 * a confirmation, invite, magic-link, or recovery link. We exchange the
 * `code` for a session cookie, then forward to `next` (or sensible default).
 *
 *   /auth/callback?code=...&next=/dashboard
 *
 * For invites and password recovery we override `next` to /set-password so
 * the user is forced to pick a password before entering the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "signup" | "invite" | "recovery" | "magiclink" | ...
  let next = searchParams.get("next") ?? "/dashboard";

  if (type === "invite" || type === "recovery") {
    next = "/set-password";
  }

  const response = NextResponse.redirect(new URL(next, origin));

  if (!code) {
    return response;
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  return response;
}
