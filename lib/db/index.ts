import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { pg?: postgres.Sql };

// prepare: false is required by Supabase's transaction pooler (port 6543).
const client =
  globalForDb.pg ?? postgres(env.DATABASE_URL, { prepare: false, connect_timeout: 10 });
if (env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });

export type Db = typeof db;
/** The database or an open transaction; pass `tx` to write inside a transaction. */
export type DbExecutor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];
