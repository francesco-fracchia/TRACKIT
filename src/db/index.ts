import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { serverEnv } from "../env";
import * as schema from "./schema";

/**
 * Client DB condiviso (Turso/libSQL + Drizzle). In dev punta a un file locale
 * (`file:./local.db`); in produzione a Turso via URL + auth token.
 */
const client = createClient({
  url: serverEnv.TURSO_DATABASE_URL,
  ...(serverEnv.TURSO_AUTH_TOKEN
    ? { authToken: serverEnv.TURSO_AUTH_TOKEN }
    : {}),
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
