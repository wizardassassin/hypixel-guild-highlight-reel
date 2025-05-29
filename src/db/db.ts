import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema.js";

const client = createClient({ url: process.env.DB_FILE_NAME! });
const db = drizzle({ client, schema });

export default db;
