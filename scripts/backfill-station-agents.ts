import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Backfill StationAgent for stations that don't have one yet (counts as online on dashboard). */
async function main() {
  const stations = await prisma.station.findMany({
    include: { agent: true },
  });

  let created = 0;
  for (const s of stations) {
    if (s.agent) continue;
    await prisma.stationAgent.create({
      data: {
        tenantId: s.tenantId,
        stationId: s.id,
        version: "web",
        lastHeartbeatAt: new Date(),
        online: true,
        queueSize: 0,
      },
    });
    created += 1;
    console.log(`Created agent for ${s.code} (${s.id})`);
  }

  console.log(`Done. Created ${created} agent(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
