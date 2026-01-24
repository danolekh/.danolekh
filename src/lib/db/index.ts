import { drizzle as d1Drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "./schema";
import { relations } from "./relations";

export const db = d1Drizzle(env.db as any, { schema, relations });
