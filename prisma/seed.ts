import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.shareLinkAccess.deleteMany();
  await prisma.shareLink.deleteMany();
  await prisma.claimPackage.deleteMany();
  await prisma.claimCase.deleteMany();
  await prisma.claimReason.deleteMany();
  await prisma.aiCheck.deleteMany();
  await prisma.timelineMarker.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.recordingFile.deleteMany();
  await prisma.recording.deleteMany();
  await prisma.order.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.camera.deleteMany();
  await prisma.stationAgent.deleteMany();
  await prisma.station.deleteMany();
  await prisma.user.deleteMany();
  await prisma.onboardingState.deleteMany();
  await prisma.usageMeter.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.supportAccessGrant.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.tenantSettings.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.platformAdmin.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.dataRequest.deleteMany();

  const starter = await prisma.plan.create({
    data: {
      code: "starter",
      nameTh: "Starter",
      nameEn: "Starter",
      maxStations: 3,
      maxStorageGb: 500,
      retentionDays: 60,
      maxUsers: 10,
      allowIpCamera: false,
      allowMultiCam: false,
      allowShareLink: false,
      priceMonthly: 2900,
      trialDays: 14,
    },
  });

  const business = await prisma.plan.create({
    data: {
      code: "business",
      nameTh: "Business",
      nameEn: "Business",
      maxStations: 20,
      maxStorageGb: 5000,
      retentionDays: 180,
      maxUsers: 50,
      allowIpCamera: true,
      allowMultiCam: true,
      allowShareLink: true,
      allowIntegrations: true,
      priceMonthly: 9900,
      trialDays: 14,
    },
  });

  await prisma.plan.create({
    data: {
      code: "enterprise",
      nameTh: "Enterprise",
      nameEn: "Enterprise",
      maxStations: 999,
      maxStorageGb: 50000,
      retentionDays: 365,
      maxUsers: 500,
      allowIpCamera: true,
      allowMultiCam: true,
      allowShareLink: true,
      allowIntegrations: true,
      allowAi: true,
      allowSso: true,
      allowCustomDomain: true,
      priceMonthly: 0,
      trialDays: 30,
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.platformAdmin.create({
    data: {
      email: "admin@packex.app",
      name: "PackEX Super Admin",
      passwordHash,
      role: "super_admin",
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      slug: "acme",
      name: "ACME Warehouse",
      status: "active",
      locale: "th",
      timezone: "Asia/Bangkok",
      settings: {
        create: {
          theme: "light",
          overlayEnabled: true,
          snapshotRequired: true,
          minRecordingSeconds: 15,
        },
      },
      subscription: {
        create: {
          planId: business.id,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      usageMeters: {
        create: {
          stationsUsed: 2,
          storageUsedGb: 128.5,
          usersUsed: 4,
        },
      },
      onboarding: {
        create: {
          stationCreated: true,
          cameraTested: true,
          employeesInvited: true,
          localeSet: true,
          testClipDone: true,
          completed: true,
        },
      },
    },
  });

  const claimReasons = await Promise.all(
    [
      "สินค้าหายจากกล่อง",
      "ส่งผิดชิ้น / ผิดรุ่น",
      "สินค้าเสียหาย",
      "จำนวนไม่ครบ",
      "แพ็คไม่ตรงออเดอร์",
      "อื่นๆ",
    ].map((label, i) =>
      prisma.claimReason.create({
        data: {
          tenantId: tenant.id,
          label,
          active: true,
          sortOrder: i + 1,
        },
      }),
    ),
  );

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@acme.local",
      name: "สมชาย แอดมิน",
      passwordHash,
      role: "tenant_admin",
      consentAt: new Date(),
      stationAccess: "*",
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "supervisor@acme.local",
      name: "วิภา สุเปอร์ไวเซอร์",
      passwordHash,
      role: "supervisor",
      consentAt: new Date(),
      stationAccess: "*",
    },
  });

  const packer = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "packer@acme.local",
      name: "ณัฐ พนักงานแพ็ค",
      passwordHash,
      role: "packer",
      consentAt: new Date(),
      stationAccess: "*",
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "claim@acme.local",
      name: "พิมพ์ เคลม",
      passwordHash,
      role: "claim_officer",
      consentAt: new Date(),
    },
  });

  const station1 = await prisma.station.create({
    data: {
      tenantId: tenant.id,
      code: "ST-01",
      name: "สถานีแพ็ค 1",
      status: "idle",
      location: "โซน A",
      cameras: {
        create: [
          {
            tenantId: tenant.id,
            name: "มุมกว้าง",
            type: "webcam",
            status: "online",
            active: true,
            testedAt: new Date(),
          },
          {
            tenantId: tenant.id,
            name: "มุมมือแพ็ค",
            type: "ip",
            streamUrl: "rtsp://192.168.1.20/stream",
            status: "online",
            active: true,
            testedAt: new Date(),
          },
        ],
      },
      agent: {
        create: {
          tenantId: tenant.id,
          version: "0.1.0",
          lastHeartbeatAt: new Date(),
          cpuPercent: 22,
          diskFreeGb: 84.2,
          queueSize: 0,
          timeDriftMs: 12,
          online: true,
        },
      },
    },
  });

  const station2 = await prisma.station.create({
    data: {
      tenantId: tenant.id,
      code: "ST-02",
      name: "สถานีแพ็ค 2",
      status: "warning",
      location: "โซน B",
      cameras: {
        create: [
          {
            tenantId: tenant.id,
            name: "มุมกว้าง",
            type: "webcam",
            status: "offline",
            active: true,
            testedAt: new Date(),
          },
        ],
      },
      agent: {
        create: {
          tenantId: tenant.id,
          version: "0.1.0",
          lastHeartbeatAt: new Date(Date.now() - 5 * 60 * 1000),
          cpuPercent: 41,
          diskFreeGb: 12.1,
          queueSize: 3,
          timeDriftMs: 180,
          online: true,
        },
      },
    },
  });

  const order1 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      orderNo: "ORD-10001",
      trackingNo: "TH1234567890",
      source: "shopee",
      status: "packed",
      itemSummary: "เสื้อยืด x2, กางเกงยีนส์ x1",
    },
  });

  const order2 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      orderNo: "ORD-10002",
      trackingNo: "TH9876543210",
      source: "lazada",
      status: "claimed",
      itemSummary: "หูฟัง Bluetooth x1",
    },
  });

  const recording1 = await prisma.recording.create({
    data: {
      tenantId: tenant.id,
      orderId: order1.id,
      stationId: station1.id,
      employeeId: packer.id,
      status: "ready",
      completenessScore: 96,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 95 * 1000),
      durationSec: 95,
      files: {
        create: [
          {
            cameraLabel: "มุมกว้าง",
            storagePath: `/${tenant.id}/recordings/ORD-10001/wide.mp4`,
            sizeBytes: 42_000_000,
            sha256: "a".repeat(64),
            thumbnailPath: "/thumbnails/demo-wide.svg",
          },
          {
            cameraLabel: "มุมมือแพ็ค",
            storagePath: `/${tenant.id}/recordings/ORD-10001/hands.mp4`,
            sizeBytes: 38_000_000,
            sha256: "b".repeat(64),
            thumbnailPath: "/thumbnails/demo-hands.svg",
          },
        ],
      },
      snapshots: {
        create: [
          {
            storagePath: `/${tenant.id}/snapshots/ORD-10001/preclose.jpg`,
            sha256: "c".repeat(64),
          },
        ],
      },
      markers: {
        create: [
          { label: "สแกนเริ่ม", atSec: 0, kind: "scan" },
          { label: "Snapshot ก่อนปิดกล่อง", atSec: 80, kind: "snapshot" },
          { label: "สแกนจบ", atSec: 95, kind: "scan" },
        ],
      },
    },
  });

  const recording2 = await prisma.recording.create({
    data: {
      tenantId: tenant.id,
      orderId: order2.id,
      stationId: station1.id,
      employeeId: packer.id,
      status: "ready",
      completenessScore: 88,
      legalHold: true,
      startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 26 * 60 * 60 * 1000 + 70 * 1000),
      durationSec: 70,
      files: {
        create: [
          {
            cameraLabel: "มุมกว้าง",
            storagePath: `/${tenant.id}/recordings/ORD-10002/wide.mp4`,
            sizeBytes: 30_000_000,
            sha256: "d".repeat(64),
          },
        ],
      },
      snapshots: {
        create: [
          {
            storagePath: `/${tenant.id}/snapshots/ORD-10002/preclose.jpg`,
            sha256: "e".repeat(64),
          },
        ],
      },
    },
  });

  await prisma.claimCase.create({
    data: {
      tenantId: tenant.id,
      orderId: order2.id,
      reason: claimReasons[0].label,
      reasonId: claimReasons[0].id,
      status: "reviewing",
      packages: {
        create: {
          recordingId: recording2.id,
          exportPath: `/${tenant.id}/claims/ORD-10002/package.zip`,
        },
      },
    },
  });

  await prisma.shareLink.create({
    data: {
      tenantId: tenant.id,
      recordingId: recording1.id,
      token: "demo-share-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxOpens: 10,
      openCount: 2,
    },
  });

  await prisma.alert.createMany({
    data: [
      {
        tenantId: tenant.id,
        severity: "critical",
        title: "กล้องออฟไลน์",
        message: "สถานี ST-02 มุมกว้างออฟไลน์ — ห้ามแพ็คต่อจนกว่าจะซ่อม",
      },
      {
        tenantId: tenant.id,
        severity: "warning",
        title: "Disk ใกล้เต็ม",
        message: "Station Agent ST-02 เหลือพื้นที่ 12.1 GB",
      },
      {
        tenantId: tenant.id,
        severity: "info",
        title: "อัปโหลดสำเร็จ",
        message: "ORD-10001 sync ครบทุกมุมกล้องแล้ว",
        acknowledged: true,
      },
    ],
  });

  await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      amount: 9900,
      status: "paid",
      description: "Business plan — เดือน กรกฎาคม 2026",
    },
  });

  await prisma.integration.createMany({
    data: [
      { tenantId: tenant.id, provider: "shopee", enabled: true },
      { tenantId: tenant.id, provider: "lazada", enabled: false },
      { tenantId: tenant.id, provider: "webhook", enabled: true },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: tenant.id,
        userId: packer.id,
        action: "recording.start",
        entityType: "recording",
        entityId: recording1.id,
        meta: JSON.stringify({ orderNo: "ORD-10001" }),
      },
      {
        tenantId: tenant.id,
        userId: packer.id,
        action: "recording.stop",
        entityType: "recording",
        entityId: recording1.id,
      },
      {
        tenantId: tenant.id,
        userId: supervisor.id,
        action: "video.view",
        entityType: "recording",
        entityId: recording1.id,
      },
      {
        tenantId: tenant.id,
        userId: admin.id,
        action: "share_link.create",
        entityType: "share_link",
        entityId: recording1.id,
      },
    ],
  });

  await prisma.announcement.create({
    data: {
      title: "Maintenance Window",
      body: "วันอาทิตย์ 02:00–04:00 น. ระบบอัปโหลดอาจช้าลงชั่วคราว",
      active: true,
    },
  });

  // Second demo tenant for isolation demos
  const tenantB = await prisma.tenant.create({
    data: {
      slug: "beta",
      name: "Beta Logistics",
      status: "trial",
      subscription: {
        create: {
          planId: starter.id,
          status: "trialing",
          trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      },
      usageMeters: { create: { stationsUsed: 1, storageUsedGb: 12, usersUsed: 1 } },
      settings: { create: {} },
      onboarding: { create: { stationCreated: true } },
      users: {
        create: {
          email: "admin@beta.local",
          name: "Beta Admin",
          passwordHash,
          role: "tenant_admin",
          consentAt: new Date(),
        },
      },
    },
  });

  console.log("Seed complete");
  console.log("Platform: admin@packex.app / password123");
  console.log("Tenant ACME: admin@acme.local / password123");
  console.log("Packer: packer@acme.local / password123");
  console.log("Tenant slug:", tenant.slug, "| Beta:", tenantB.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
