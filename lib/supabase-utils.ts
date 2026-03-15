/**
 * Database Integration Utilities
 * Uses PostgreSQL (Neon) for direct SQL execution
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = postgres(DATABASE_URL);

export async function executeQuery(query: string) {
  try {
    const result = await sql.unsafe(query);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
