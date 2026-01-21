import { drizzle as d1Drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import {
  drizzle as libsqlDrizzle,
  type LibSQLDatabase,
} from "drizzle-orm/libsql";
import * as schema from "./schema";

export const db = (
  typeof env.db === "string"
    ? libsqlDrizzle(env.db, { schema })
    : d1Drizzle(env.db as any, { schema })
) as LibSQLDatabase<typeof schema>;
