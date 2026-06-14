import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

/** Applica le migrazioni pendenti. Eseguito via `npm run db:migrate`. */
async function main() {
  console.info("Applico le migrazioni…");
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  console.info("✅ Migrazioni applicate.");
}

main().catch((err) => {
  console.error("❌ Migrazione fallita:", err);
  process.exit(1);
});
