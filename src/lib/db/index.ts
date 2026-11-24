import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set. Add it to your .env file.");
  // TLS is configured explicitly (verified certificates) instead of through `sslmode` in the URL, whose meaning
  // pg is changing; local databases skip TLS.
  const url = new URL(raw);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const ssl = !local && url.searchParams.get("sslmode") !== "disable";
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");

  const pool = new Pool({
    connectionString: url.toString(),
    ssl,
    // node-postgres sends Parse/Bind/Execute/Sync together: one network round trip per query. (postgres.js with
    // `prepare: false` first waits for a Describe, which doubled every query against the remote database.)
    // No named prepared statements are used, so this is safe behind Neon's PgBouncer pooler.
    max: 20,
    // Keep connections warm between a student's clicks (a fresh TLS + auth handshake costs several round trips),
    // but not so long that the server drops them first and we hand out dead sockets.
    idleTimeoutMillis: 60_000,
    // Opening a connection to a far-away region can take several seconds on a slow network.
    connectionTimeoutMillis: 30_000,
    // A stalled connection fails fast instead of hanging a request for minutes.
    query_timeout: 30_000,
    statement_timeout: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  // Idle connections are dropped when Neon suspends the compute. Without a listener pg would crash the process;
  // the pool already discards the broken client and opens a new one on the next query.
  pool.on("error", (error) => console.warn(`[db] idle connection closed: ${error.message}`));
  return pool;
}

/** Opens a few connections at boot so the first visitors don't wait for TLS + auth handshakes. */
export async function warmUpDatabase(connections = 3) {
  await Promise.all(Array.from({ length: connections }, () => pool.query("select 1").catch(() => undefined)));
}

// One pool per process, shared by every bundle that imports this module (app routes, route handlers and
// instrumentation are compiled separately) and kept across dev hot reloads.
const pool = (globalForDb.pgPool ??= createPool());

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export { schema };
