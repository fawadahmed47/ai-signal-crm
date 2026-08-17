import "server-only";

import { Pool } from "pg";

const globalDatabase = globalThis as typeof globalThis & {
  signalCrmPool?: Pool;
};

export function getDatabasePool(): Pool {
  if (globalDatabase.signalCrmPool) return globalDatabase.signalCrmPool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database access");
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  if (process.env.NODE_ENV !== "production") {
    globalDatabase.signalCrmPool = pool;
  }
  return pool;
}
