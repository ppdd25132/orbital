import { ORBITAL_SCHEMA_SQL } from "@/lib/orbital-schema";

let poolPromise = null;
let schemaPromise = null;

export function getDatabaseUrl() {
  return (
    process.env.ORBITAL_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ""
  );
}

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}

function shouldUseSsl(connectionString) {
  return /^postgres(ql)?:\/\//.test(connectionString) && !connectionString.includes("localhost");
}

async function getPool() {
  if (!hasDatabaseConfig()) {
    const error = new Error("Postgres is not configured. Set ORBITAL_DATABASE_URL or DATABASE_URL.");
    error.status = 503;
    throw error;
  }

  if (!poolPromise) {
    poolPromise = import("pg").then(({ Pool }) => {
      const connectionString = getDatabaseUrl();
      return new Pool({
        connectionString,
        ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
      });
    });
  }

  return poolPromise;
}

export async function dbQuery(text, params = []) {
  const pool = await getPool();
  return pool.query(text, params);
}

export async function ensureOrbitalSchema() {
  if (!schemaPromise) {
    schemaPromise = dbQuery(ORBITAL_SCHEMA_SQL);
  }
  return schemaPromise;
}
