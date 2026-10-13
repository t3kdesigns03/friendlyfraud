// Delete the embedded local database; it's recreated and re-migrated on next boot.
import { rmSync } from "node:fs";

const dir = process.env.LOCAL_DB_DIR ?? ".data/pglite";
rmSync(dir, { recursive: true, force: true });
console.log(`Removed ${dir}`);
