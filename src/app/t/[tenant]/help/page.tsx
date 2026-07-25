import {
  Camera,
  FileWarning,
  LifeBuoy,
  Mail,
  MonitorPlay,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

const GUIDES: { title: string; body: string; icon: LucideIcon }[] = [
  {
    icon: Camera,
    title: "เริ่มอัดวิดีโอ",
    body: "ไปที่ Station Console → สแกนเลขออเดอร์ → กดเริ่มอัด → แพ็คสินค้า → กดหยุดอัด",
  },
  {
    icon: MonitorPlay,
    title: "ตรวจสอบวิดีโอ",
    body: "เมนูวิดีโอ → คลิกเลขออเดอร์ → ดูหลายมุมกล้อง ตรวจ hash และแชร์ลิงก์ให้ทีมเคลม",
  },
  {
    icon: FileWarning,
    title: "จัดการเคลม",
    body: "เมนูเคลม → สร้างเคสจากออเดอร์ → แนบวิดีโอ → เปิด Legal Hold เพื่อกันการลบ",
  },
  {
    icon: Wrench,
    title: "แก้ปัญหากล้องออฟไลน์",
    body: "ดูแจ้งเตือน → ตรวจ Station Agent ที่เมนูสถานี → ซ่อมกล้องก่อนแพ็คต่อ",
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="ช่วยเหลือ"
        description="คู่มือใช้งานด่วนสำหรับทีมคลังสินค้า"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((guide) => (
          <Card key={guide.title} interactive>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-ink">
              <guide.icon size={18} strokeWidth={1.9} />
            </span>
            <h2 className="mt-4 text-[15px] font-semibold text-ink">{guide.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{guide.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-muted">
            <LifeBuoy size={18} strokeWidth={1.9} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">ยังหาคำตอบไม่เจอ?</h2>
            <p className="mt-1 text-[13px] text-muted">
              ทีมซัพพอร์ตพร้อมช่วยเหลือในเวลาทำการ · เอกสารฉบับเต็มจะพร้อมในเวอร์ชันถัดไป
            </p>
          </div>
        </div>
        <ButtonLink href="mailto:support@packex.app" variant="secondary" icon={Mail}>
          support@packex.app
        </ButtonLink>
      </Card>
    </div>
  );
}
