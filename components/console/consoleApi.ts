"use client";

/** POST one action to the console API. Throws with the server's message. */
export async function consoleAction(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<{ message?: string; expiresAt?: string }> {
  const res = await fetch("/api/console", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body;
}
