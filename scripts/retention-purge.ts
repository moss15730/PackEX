import { runRetentionMaintenance } from "../src/lib/retention";

async function main() {
  const result = await runRetentionMaintenance();
  console.log(JSON.stringify({ ok: true, at: new Date().toISOString(), ...result }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
