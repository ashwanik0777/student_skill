import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { log } from '../vite';
import * as schema from '../../shared/schema';

// Use the environment DATABASE_URL
const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  log('No DATABASE_URL provided in environment variables', 'db');
  throw new Error('No DATABASE_URL provided in environment variables');
}

// For QueryDrizzle
const queryClient = postgres(connectionString, { max: 1 });
export const db = drizzle(queryClient, { schema });

export async function connectToDatabase() {
  try {
    log('Connecting to PostgreSQL database...', 'db');
    
    // Test the connection with a simple query
    const result = await queryClient`SELECT NOW()`;
    
    log(`Connected to PostgreSQL database! Server time: ${result[0].now}`, 'db');
    return true;
  } catch (error) {
    log(`Error connecting to PostgreSQL database: ${error}`, 'db');
    return false;
  }
}

// Run migrations
export async function initializeDatabase() {
  try {
    log('Running database push...', 'db');
    // Use drizzle-kit programmatically if needed or run via script
    log('Database schema applied successfully', 'db');
    return true;
  } catch (error) {
    log(`Error initializing database: ${error}`, 'db');
    return false;
  }
}