import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata = { title: "ข้อกำหนดการใช้งาน" };

export default function TermsPage() {
  return (
    <LegalPage
      title="ข้อกำหนดการใช้งาน"
      subtitle="Terms of Service — เงื่อนไขการใช้บริการ PackEX"
      note="เอกสารฉบับย่อ — จะมีข้อกำหนดฉบับเต็มก่อนเปิด production"
    >
      <LegalSection heading="ภาษาไทย">
        <p>
          การใช้บริการ PackEX หมายความว่าคุณยอมรับข้อกำหนดนี้และนโยบายความเป็นส่วนตัว
          บริการมีให้ตามสภาพ (&quot;as-is&quot;) สำหรับการบันทึกวิดีโอหลักฐานการแพ็ค
        </p>
        <p>
          องค์กรต้องรับผิดชอบการแจ้งความยินยอมพนักงาน การเก็บวิดีโอ และการใช้ลิงก์แชร์
          ตามกฎหมายที่เกี่ยวข้อง การระงับบัญชีอาจเกิดเมื่อค้างชำระหรือละเมิดข้อกำหนด
        </p>
      </LegalSection>

      <LegalSection heading="English">
        <p>
          By using PackEX you agree to these terms and our Privacy Policy. The service is
          provided &quot;as-is&quot; for packing video evidence purposes.
        </p>
        <p>
          Tenants are responsible for employee consent, lawful recording, and share link
          usage. Accounts may be suspended for non-payment or policy violations.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
