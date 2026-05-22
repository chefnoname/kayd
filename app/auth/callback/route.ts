import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth / email-link callback. Supabase redirects here after the user clicks
 * a confirmation, invite, magic-link, or recovery link. We exchange the
 * `code` for a session cookie and then forward the user.
 *
 * Invite detection (in order):
 *   1. ?type=invite | ?type=recovery in the query string
 *   2. The session user's email-provider identity has `invited_at`,
 *      meaning they were created via inviteUserByEmail.
 *
 * Invited / recovery users land on /set-password; everyone else on /dashboard
 * (or whatever ?next= specified).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const requestedNext = searchParams.get("next");

  // We build the response first so the cookie writer below can attach cookies
  // to it; the final redirect location is rewritten before returning.
  const response = NextResponse.redirect(new URL("/dashboard", origin));

  if (!code) {
    return NextResponse.redirect(new URL(requestedNext ?? "/dashboard", origin));
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

  // PKCE constraint: the auth code is single-use and valid for 5 minutes.
  // The exchange MUST happen on the same browser/device that initiated the
  // flow (the code verifier is stored locally). If the code has expired,
  // was already used, or the verifier is missing, we restart the flow.
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const url = new URL("/login", origin);
    const isExpiredOrUsed =
      error.message.toLowerCase().includes("expired") ||
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("invalid") ||
      error.status === 400 ||
      error.status === 401;

    url.searchParams.set(
      "error",
      isExpiredOrUsed
        ? "Your sign-in link has expired or was already used. Please sign in again."
        : error.message
    );
    return NextResponse.redirect(url);
  }

  // Decide where to send them.
  let destination = requestedNext ?? "/dashboard";

  // Fetch the session user once — used for both last_active_at and invite detection.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Stamp last_active_at now that the session is established.
  // This is more reliable than the DB trigger for PKCE / invite flows.
  if (user) {
    await supabase
      .from("staff_users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  if (type === "invite" || type === "recovery") {
    destination = "/set-password";
  } else {
    const emailIdentity = user?.identities?.find(
      (i) => i.provider === "email"
    );
    const identityData =
      (emailIdentity?.identity_data as Record<string, unknown> | undefined) ??
      undefined;

    const wasInvited =
      Boolean(identityData?.invited_at) || Boolean((user as any)?.invited_at);

    if (wasInvited) {
      destination = "/set-password";
    }
  }

  response.headers.set("location", new URL(destination, origin).toString());
  return response;
}

