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

function getPool(): Pool {
  if (!globalThis.__pgPool__) {
    globalThis.__pgPool__ = new Pool({
      connectionString: getConnectionString(),
    });
  }
  return globalThis.__pgPool__;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}
