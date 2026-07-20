import { PageHeader, Card } from "@/components/ui";

const GUIDES = [
  {
    title: "เริ่มอัดวิดีโอ",
    body: "ไปที่ Station Console → สแกนเลขออเดอร์ → กดเริ่มอัด → แพ็คสินค้า → กดหยุดอัด",
  },
  {
    title: "ตรวจสอบวิดีโอ",
    body: "เมนู วิดีโอ → คลิกเลขออเดอร์ → ดูหลายมุมกล้อง ตรวจ hash และแชร์ลิงก์ให้ทีมเคลม",
  },
  {
    title: "จัดการเคลม",
    body: "เมนู เคลม → สร้างเคสจากออเดอร์ → แนบวิดีโอ → เปิด Legal Hold เพื่อกันการลบ",
  },
  {
    title: "แก้ปัญหากล้องออฟไลน์",
    body: "ดูแจ้งเตือน → ตรวจ Station Agent ที่เมนู สถานี → ซ่อมกล้องก่อนแพ็คต่อ",
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="ช่วยเหลือ" description="คู่มือใช้งานด่วนสำหรับทีมคลัง" />

      <div className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Card key={g.title}>
            <h2 className="font-semibold text-[var(--ink)]">{g.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{g.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <p className="text-sm text-[var(--muted)]">
          ติดต่อ support: support@packex.app · เอกสารเต็มจะพร้อมในเวอร์ชันถัดไป
        </p>
      </Card>
    </div>
  );
}
