import Link from "next/link";
import {
  ArrowRight,
  Camera,
  FileCheck2,
  Link2,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { PackExWordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { prisma } from "@/lib/db";

export const revalidate = 3600;

const FEATURES = [
  {
    icon: Camera,
    title: "บันทึกอัตโนมัติทุกสถานี",
    body: "เริ่มอัดเมื่อสแกนออเดอร์ หยุดเมื่อปิดกล่อง ได้วิดีโอครบทุกออเดอร์โดยไม่ต้องกดเอง",
  },
  {
    icon: ShieldCheck,
    title: "หลักฐานที่พิสูจน์ได้",
    body: "ทุกไฟล์มี checksum และ audit log กำกับ ตรวจสอบย้อนหลังได้ว่าไม่มีการแก้ไข",
  },
  {
    icon: Link2,
    title: "แชร์ลิงก์ให้ลูกค้า",
    body: "สร้างลิงก์หมดอายุพร้อมรหัสผ่าน ส่งให้ลูกค้าหรือขนส่งดูวิดีโอได้ทันที",
  },
  {
    icon: FileCheck2,
    title: "จัดการเคลมครบวงจร",
    body: "ผูกเคลมกับวิดีโอ แนบเหตุผล และส่งออกชุดหลักฐานเป็นไฟล์เดียว",
  },
];

const STEPS = [
  { step: "01", title: "สแกนออเดอร์", body: "พนักงานสแกนบาร์โค้ดที่สถานีแพ็ค ระบบเริ่มอัดทันที" },
  { step: "02", title: "แพ็คตามปกติ", body: "กล้องบันทึกทุกมุมพร้อม overlay เลขออเดอร์และเวลา" },
  { step: "03", title: "ปิดงาน", body: "วิดีโออัปโหลดขึ้นคลาวด์อัตโนมัติ ค้นหาได้ในไม่กี่วินาที" },
];

/**
 * Capability figures come from the live plan catalogue, so the marketing page
 * can never drift from what the platform actually sells.
 */
async function getPlanHighlights() {
  const plans = await prisma.plan.findMany({
    select: {
      retentionDays: true,
      maxStorageGb: true,
      maxStations: true,
      trialDays: true,
      allowMultiCam: true,
      allowShareLink: true,
    },
  });

  if (plans.length === 0) return null;

  const max = (pick: (p: (typeof plans)[number]) => number) =>
    plans.reduce((best, plan) => Math.max(best, pick(plan)), 0);

  return {
    retentionDays: max((p) => p.retentionDays),
    storageGb: max((p) => p.maxStorageGb),
    stations: max((p) => p.maxStations),
    trialDays: max((p) => p.trialDays),
    multiCam: plans.some((p) => p.allowMultiCam),
    shareLink: plans.some((p) => p.allowShareLink),
  };
}

export default async function HomePage() {
  const highlights = await getPlanHighlights().catch(() => null);

  const facts = highlights
    ? [
        { k: "เก็บหลักฐานสูงสุด", v: `${highlights.retentionDays} วัน` },
        { k: "พื้นที่วิดีโอสูงสุด", v: `${highlights.storageGb.toLocaleString()} GB` },
        { k: "สถานีต่อองค์กร", v: `${highlights.stations} สถานี` },
        {
          k: highlights.trialDays > 0 ? "ทดลองใช้ฟรี" : "รูปแบบระบบ",
          v: highlights.trialDays > 0 ? `${highlights.trialDays} วัน` : "Multi-tenant",
        },
      ]
    : [];

  return (
    <div className="aurora flex min-h-[100dvh] flex-col">
      <header className="glass sticky top-0 z-40 border-b border-line/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <PackExWordmark />
          <nav className="flex items-center gap-2">
            <ButtonLink href="/login?platform=1" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Platform
            </ButtonLink>
            <ButtonLink href="/login" variant="ghost" size="sm">
              เข้าสู่ระบบ
            </ButtonLink>
            <ButtonLink href="/signup" variant="primary" size="sm" iconRight={ArrowRight}>
              ทดลองใช้ฟรี
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="grid-lines relative mx-auto w-full max-w-6xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 lg:px-8">
          <div className="animate-rise mx-auto inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-soft-ink">
            <Sparkles size={13} strokeWidth={2.2} />
            ระบบหลักฐานการแพ็คสำหรับคลังสินค้าไทย
          </div>

          <h1 className="animate-rise mx-auto mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl lg:text-6xl">
            หลักฐานวิดีโอการแพ็ค
            <span className="mt-2 block text-brand">ที่พิสูจน์ได้ทุกออเดอร์</span>
          </h1>

          <p className="animate-rise mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            บันทึกวิดีโอหลายมุมกล้องจากสถานีแพ็ค ตรวจสอบความครบถ้วน
            และแชร์ลิงก์หลักฐานให้ทีมเคลมได้ในคลิกเดียว
          </p>

          <div className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/signup" variant="primary" size="lg" iconRight={ArrowRight}>
              เริ่มทดลองใช้ฟรี
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="lg">
              เข้าสู่ระบบองค์กร
            </ButtonLink>
          </div>

          {facts.length > 0 ? (
            <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {facts.map((item) => (
                <div
                  key={item.k}
                  className="rounded-xl border border-line bg-surface/70 p-4 shadow-xs backdrop-blur-sm"
                >
                  <dt className="text-[11px] font-medium text-muted">{item.k}</dt>
                  <dd className="tabular mt-1 text-lg font-semibold tracking-tight text-ink">
                    {item.v}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              ทุกอย่างที่ทีมคลังต้องใช้
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              ตั้งแต่หน้าสถานีจนถึงห้องเคลม PackEX ครอบคลุมทั้งกระบวนการในระบบเดียว
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="card-interactive rounded-2xl border border-line bg-surface p-6 shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-ink">
                  <feature.icon size={20} strokeWidth={1.9} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-10">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-brand uppercase">
              <Timer size={14} strokeWidth={2.2} />
              ใช้เวลาติดตั้งไม่ถึงหนึ่งวัน
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              ทำงานได้ทันทีในสามขั้นตอน
            </h2>

            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((item) => (
                <li key={item.step} className="relative">
                  <span className="text-sm font-semibold text-brand tabular">{item.step}</span>
                  <h3 className="mt-2 text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-brand-border bg-brand-soft px-6 py-12 text-center">
            <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              พร้อมลดข้อพิพาทเรื่องของหายแล้วหรือยัง
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-ink-2">
              เข้าสู่ระบบเพื่อจัดการสถานี วิดีโอ และเคลมขององค์กรคุณ
            </p>
            <ButtonLink href="/signup" variant="primary" size="lg" iconRight={ArrowRight}>
              สร้างองค์กรและทดลองใช้
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted sm:flex-row sm:px-6 lg:px-8">
          <PackExWordmark size="sm" />
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition hover:text-ink">
              นโยบายความเป็นส่วนตัว
            </Link>
            <Link href="/terms" className="transition hover:text-ink">
              ข้อกำหนดการใช้งาน
            </Link>
          </div>
          <p>© {new Date().getFullYear()} PackEX</p>
        </div>
      </footer>
    </div>
  );
}
