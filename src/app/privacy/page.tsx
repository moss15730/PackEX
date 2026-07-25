import { LegalPage, LegalSection } from "@/components/legal-page";
import { PRIVACY_EMAIL } from "@/lib/contact";

export const metadata = { title: "นโยบายความเป็นส่วนตัว" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="นโยบายความเป็นส่วนตัว"
      subtitle="Privacy Policy — ว่าด้วยการเก็บ ใช้ และเปิดเผยข้อมูลในระบบ PackEX"
      note="เอกสารฉบับย่อ — จะมีนโยบายฉบับเต็มก่อนเปิด production"
    >
      <LegalSection heading="ภาษาไทย">
        <p>
          PackEX เก็บรวบรวมข้อมูลองค์กร ผู้ใช้งาน วิดีโอการแพ็ค และ metadata
          เพื่อให้บริการหลักฐานการแพ็คสินค้า ข้อมูลถูกแยกตาม tenant (multi-tenant isolation)
          และเก็บตามระยะเวลาที่กำหนดในแพ็กเกจ
        </p>
        <p>
          ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณมีสิทธิขอเข้าถึง แก้ไข ส่งออก
          หรือลบข้อมูล โดยติดต่อ admin ขององค์กรหรือ {PRIVACY_EMAIL}
        </p>
      </LegalSection>

      <LegalSection heading="English">
        <p>
          PackEX processes organizational data, user accounts, packing videos, and related
          metadata to provide video evidence services. Data is isolated per tenant and
          retained per subscription plan limits.
        </p>
        <p>
          Under Thailand&apos;s PDPA, you may request access, correction, export, or deletion
          of personal data via your tenant administrator or {PRIVACY_EMAIL}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
