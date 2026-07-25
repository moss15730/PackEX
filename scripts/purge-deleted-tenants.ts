/**
 * Hard-deletes ONLY tenants already marked `status: "deleted"`.
 *
 * Unlike `db:purge-tenants` (which wipes every organisation) this is safe to run
 * on a live platform. It prints what it will remove and requires --yes to act.
 *
 * Usage:
 *   npm run db:purge-deleted            # dry run
 *   npm run db:purge-deleted -- --yes   # actually delete
 */
import { loadProjectEnv } from "./load-env";

loadProjectEnv();

import { prisma } from "../src/lib/db";
import { deleteRecordingFiles } from "../src/lib/storage";

async function main() {
  const confirmed = process.argv.includes("--yes");

  const tenants = await prisma.tenant.findMany({
    where: { status: "deleted" },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { users: true, recordings: true, stations: true } },
    },
  });

  if (tenants.length === 0) {
    console.log("ไม่มี tenant สถานะ deleted — ไม่ต้องทำอะไร");
    return;
  }

  console.log(`\nพบ ${tenants.length} tenant ที่ถูกทำเครื่องหมายลบไว้:\n`);
  for (const t of tenants) {
    console.log(
      `  - ${t.slug} (${t.name}): ${t._count.users} ผู้ใช้, ${t._count.stations} สถานี, ${t._count.recordings} วิดีโอ`,
    );
  }

  if (!confirmed) {
    console.log("\nนี่คือ dry run — ยังไม่มีอะไรถูกลบ");
    console.log("ลบจริง: npm run db:purge-deleted -- --yes\n");
    return;
  }

  for (const tenant of tenants) {
    // Remove stored media first so deleting rows cannot orphan files.
    const files = await prisma.recordingFile.findMany({
      where: { recording: { tenantId: tenant.id } },
      select: { storagePath: true },
    });
    if (files.length) {
      await deleteRecordingFiles(files.map((f) => f.storagePath)).catch((error) => {
        console.warn(`  ! ลบไฟล์ของ ${tenant.slug} ไม่ครบ: ${error?.message ?? error}`);
      });
    }

    // Cascades from Tenant clear the rest of the graph.
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log(`  ✔ ลบ ${tenant.slug} แล้ว (${files.length} ไฟล์)`);
  }

  await prisma.auditLog.create({
    data: {
      action: "tenant.hard_delete",
      entityType: "cron",
      meta: JSON.stringify({ slugs: tenants.map((t) => t.slug) }),
    },
  });

  console.log(`\nลบเสร็จ ${tenants.length} tenant\n`);
}

main()
  .catch((error) => {
    console.error("purge failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
