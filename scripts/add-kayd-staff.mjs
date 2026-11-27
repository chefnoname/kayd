#!/usr/bin/env node
/**
 * Creates a Kayd staff account for the console. Run once for the first
 * person; after that, staff add each other from the console's Kayd staff page.
 *
 *   npm run console:add-staff -- "Full Name" name@example.com
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 * SUPABASE_SERVICE_ROLE_KEY and CONSOLE_URL (or NEXT_PUBLIC_SITE_URL) from the
 * environment or .env.local (CONSOLE_HOST also works). The person gets an email to choose a password.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const [name, rawEmail] = process.argv.slice(2);
const email = (rawEmail ?? "").trim().toLowerCase();
if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run console:add-staff -- "Full Name" name@example.com');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const base = (
  process.env.CONSOLE_URL ||
  (process.env.CONSOLE_HOST ? `https://${process.env.CONSOLE_HOST}` : "") ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  ""
).replace(/\/$/, "");
if (!base) {
  console.error("Set CONSOLE_URL (e.g. https://console.kayd.live) so the email link points at the console.");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  email_confirm: true,
  app_metadata: { kayd_staff: true },
  user_metadata: { name },
});
if (createError) {
  console.error(`Could not create the account: ${createError.message}`);
  console.error("If this email already uses Kayd as a client, use a different email for console access.");
  process.exit(1);
}

const { error: insertError } = await admin.from("kayd_staff").insert({ id: created.user.id, email, name });
if (insertError) {
  await admin.auth.admin.deleteUser(created.user.id);
  console.error(`Could not add to kayd_staff (has migration 019 been run?): ${insertError.message}`);
  process.exit(1);
}

const mailer = createClient(url, anon, {
  auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
});
const { error: mailError } = await mailer.auth.resetPasswordForEmail(email, { redirectTo: `${base}/console/login` });
if (mailError) {
  console.error(`Account created, but the email failed: ${mailError.message}`);
  console.error("Ask another Kayd staff member to remove and re-add you, or delete the user in Supabase and run this again.");
  process.exit(1);
}

console.log(`Done. ${name} <${email}> is Kayd staff. They have an email to choose a password.`);
