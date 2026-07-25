import { existsSync, readFileSync } from "fs";
import path from "path";

/**
 * Minimal .env reader so CLI scripts see the same values Next.js loads.
 *
 * A key already present but EMPTY is treated as unset: Prisma's own dotenv runs
 * on import and fills placeholder keys from `.env` with "", which would
 * otherwise mask the real value in `.env.local`.
 */
export function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

/** Loads .env.local then .env from the project root. */
export function loadProjectEnv() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));
}
