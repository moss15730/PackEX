/**
 * Ensure the Supabase Storage bucket exists.
 *
 * Usage:
 *   npx tsx scripts/setup-storage.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvFile(filePath: string) {
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
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

async function main() {
  const { ensureRecordingsBucket, getStorageBucket, isStorageConfigured } = await import(
    "../src/lib/storage"
  );

  if (!isStorageConfigured()) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const bucket = await ensureRecordingsBucket();
  console.log(`OK — bucket ready: ${bucket || getStorageBucket()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
