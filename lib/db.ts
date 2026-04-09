import { Pool, type QueryResultRow } from "pg";

declare global {
  // Reuse pool in dev/HMR.
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
}

function getConnectionString(): string {
  const fromEnv = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!fromEnv) {
    throw new Error(
      "Missing PostgreSQL connection string. Set DATABASE_URL or POSTGRES_URL."
    );
  }
  return fromEnv;
}

const pool =
  globalThis.__pgPool__ ??
  new Pool({
    connectionString: getConnectionString(),
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool__ = pool;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(text, values);
  return result.rows;
}
