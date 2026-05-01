import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { log } from './vite';

neonConfig.webSocketConstructor = ws;

// Create pool if DATABASE_URL is available
let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzle({ client: pool, schema });
  } catch (error) {
    log(`Error initializing database pool: ${error}`, "db");
  }
}

/**
 * Test the database connection and return true if successful
 */
export async function connectToDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    return false;
  }
  
  try {
    if (!pool) {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      dbInstance = drizzle({ client: pool, schema });
    }
    
    // Test the connection by querying the database
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      log('PostgreSQL connection successful', 'db');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    log(`PostgreSQL connection error: ${error}`, 'db');
    return false;
  }
}

// Export the database connection
export const postgresPool = pool;
export const db = drizzle({ 
  client: pool || new Pool({ connectionString: process.env.DATABASE_URL || '' }), 
  schema 
});
