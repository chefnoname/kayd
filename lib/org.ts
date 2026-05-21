"use client";

import { createClient } from "@/lib/supabase";

/**
 * Cache the current user's organisation_id for the lifetime of the page.
 * Keyed by auth user id so it self-invalidates on sign-in / sign-out.
 */
let cache: { userId: string; orgId: string | null } | null = null;

/**
 * Returns the current authenticated user's organisation_id, or null if the
 * user is not signed in / not provisioned yet.
 *
 * Every Supabase query in the app should filter by this value
 * (`.eq("organisation_id", orgId)`) and every insert should include it.
 */
export async function getOrganisationId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cache = null;
    return null;
  }

  if (cache && cache.userId === user.id) {
    return cache.orgId;
  }

  const { data } = await supabase
    .from("staff_users")
    .select("organisation_id")
    .eq("id", user.id)
    .maybeSingle();

  const orgId = (data?.organisation_id as string | null) ?? null;
  cache = { userId: user.id, orgId };
  return orgId;
}

/** Force the next `getOrganisationId()` call to refetch (e.g. on sign-out). */
export function clearOrganisationCache(): void {
  cache = null;
}
