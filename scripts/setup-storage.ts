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
import { loadProjectEnv } from "./load-env";

loadProjectEnv();

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
