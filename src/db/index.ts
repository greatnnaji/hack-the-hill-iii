import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false is required for pooled (PgBouncer-style) connection strings.
const client = postgres(process.env.DATABASE_URL ?? "", { prepare: false });

export const db = drizzle({ client, schema });
