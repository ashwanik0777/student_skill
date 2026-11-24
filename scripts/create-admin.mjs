#!/usr/bin/env node
/**
 * Create the first admin, or turn an existing account into an admin.
 *
 *   npm run admin:create -- --email you@school.com --password "a-strong-password" --name "Your Name"
 *
 * - New email: creates the account (email + password sign-in) with the admin role.
 * - Existing email: gives it the admin role; pass --password to also reset its password.
 * Admins are only ever created here (never from the web UI), so nobody can promote themselves.
 */
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";

const { values } = parseArgs({
  options: { email: { type: "string" }, password: { type: "string" }, name: { type: "string" } },
});

const email = values.email?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email you@school.com --password "min 8 chars" [--name "Your Name"]');
  process.exit(1);
}
if (values.password !== undefined && (values.password.length < 8 || values.password.length > 128)) {
  console.error("The password must be 8–128 characters.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Run this from the project folder so .env is loaded.");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
const ssl = !local && url.searchParams.get("sslmode") !== "disable";
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const client = new pg.Client({ connectionString: url.toString(), ssl });
await client.connect();
const q = async (text, params = []) => (await client.query(text, params)).rows;

try {
  const [existing] = await q('select id, name from "user" where email = $1', [email]);
  if (existing) {
    await q(`update "user" set role = 'admin', permissions = '[]'::jsonb, suspended_at = null, suspended_reason = null, updated_at = now() where id = $1`, [existing.id]);
    if (values.password) {
      const hash = await hashPassword(values.password);
      const updated = await q(`update account set password = $1, updated_at = now() where user_id = $2 and provider_id = 'credential' returning id`, [hash, existing.id]);
      if (updated.length === 0) {
        await q(`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at) values ($1, $2, 'credential', $2, $3, now(), now())`, [randomUUID(), existing.id, hash]);
      }
      await q('update "user" set sessions_revoked_at = now() where id = $1', [existing.id]);
      await q("delete from session where user_id = $1", [existing.id]);
    }
    console.log(`✓ ${existing.name} (${email}) is now an admin${values.password ? " — password updated" : ""}.`);
  } else {
    if (!values.password) {
      console.error("No account uses this email yet — pass --password to create it.");
      process.exit(1);
    }
    const id = randomUUID().replaceAll("-", "");
    const name = values.name?.trim() || "Admin";
    const hash = await hashPassword(values.password);
    await q("begin");
    try {
      await q(`insert into "user" (id, name, email, email_verified, role, permissions, created_at, updated_at) values ($1, $2, $3, true, 'admin', '[]'::jsonb, now(), now())`, [id, name, email]);
      await q(`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at) values ($1, $2, 'credential', $2, $3, now(), now())`, [randomUUID(), id, hash]);
      await q("commit");
    } catch (e) {
      await q("rollback");
      throw e;
    }
    console.log(`✓ Admin account created for ${name} (${email}). Sign in at /sign-in.`);
  }
} finally {
  await client.end();
}
