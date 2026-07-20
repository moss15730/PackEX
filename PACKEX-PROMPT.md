สร้างผลิตภัณฑ์ SaaS ชื่อ:

PackEX — Packing Video Systems
RECORDING SYSTEM

แบรนด์: PackEX
สัญลักษณ์: หัวแมวสีดำ มีตาข้างหนึ่งเป็นเลนส์กล้องสีเขียว
ภาษาหลัก: ไทย (รองรับ English / 中文)
ธีม: Light / Dark mode
กลุ่มลูกค้า: ขายให้หลายโกดัง/หลายบริษัท (B2B Multi-tenant SaaS)

==================================================
0) วิสัยทัศน์ผลิตภัณฑ์
==================================================
PackEX เป็นระบบบันทึกวิดีโอตอนบรรจุพัสดุ (packing) เพื่อเก็บเป็นหลักฐานต่อออเดอร์
ใช้พิสูจน์กรณีเคลม: สินค้าหาย, เสียหาย, สลับชิ้น, แพ็คไม่ครบ, หรือไม่ได้แพ็คตามที่สั่ง

ต้องออกแบบให้:
1. ใช้จริงในโกดังได้แม้เน็ตไม่เสถียร
2. ขายให้หลายลูกค้าพร้อมกันโดยข้อมูลไม่ปน
3. หลักฐานวิดีโอน่าเชื่อถือ ตรวจสอบย้อนหลังได้
4. ลดความผิดพลาดของพนักงานและระบบให้มากที่สุด
5. มีชั้น Platform สำหรับทีม PackEX ดูแลลูกค้า/แพ็กเกจ/ซัพพอร์ต

==================================================
1) โมเดลธุรกิจและการขาย
==================================================
- PackEX เป็นแพลตฟอร์มกลางที่ผู้ขายระบบเป็นเจ้าของ
- ลูกค้าแต่ละราย = 1 Tenant (บริษัท/โกดัง) แยกข้อมูล 100%
- เข้าใช้ผ่าน subdomain หรือ path แยก tenant เช่น:
  - acme.PackEX.app
  - app.PackEX.com/t/acme
- รองรับ custom domain ในแพ็กเกจ Enterprise

ผู้ดูแล 2 ระดับ:
A) Platform Super Admin (ทีม PackEX)
- จัดการ tenants, แพ็กเกจ, billing, feature flags, system health, support access
B) Tenant Admin (ลูกค้าโกดัง)
- จัดการพนักงาน, สถานี, กล้อง, วิดีโอ, เคลม, ตั้งค่าในโกดังตัวเองเท่านั้น

แพ็กเกจขายอย่างน้อย 3 ระดับ:

1) Starter
- 1–3 packing stations
- storage 100–500 GB
- retention 30–60 วัน
- ผู้ใช้จำกัด
- Webcam
- trial 7–14 วัน

2) Business
- สถานีมากขึ้น
- storage 1–5 TB
- retention 90–180 วัน
- IP Camera + multi-cam
- shared link สำหรับเคลม
- integrations พื้นฐาน
- alerts

3) Enterprise
- สถานีตามสัญญา
- retention 1 ปี+
- custom domain / SLA
- SSO
- API access
- AI assist
- private/hybrid deployment
- dedicated support

คิดเงินหลักตาม:
- จำนวนสถานีแพ็ค
- พื้นที่จัดเก็บ (GB/TB)
- จำนวนผู้ใช้ (seats)
- ระยะ retention
- ฟีเจอร์เสริม (AI, integration, private cloud)

ทุกแพ็กเกจต้องมี:
- หน้า usage จริง (stations/storage/users)
- soft limit เตือน + hard limit บล็อกตามนโยบาย
- อัปเกรด/ลดแพ็กเกจ
- ระงับบัญชีเมื่อค้างชำระ
- ประวัติบิล/ใบเสร็จ (อย่างน้อย data model พร้อมต่อ payment gateway)

==================================================
2) บทบาทผู้ใช้ (RBAC)
==================================================
Platform:
- Platform Super Admin
- Platform Support (สิทธิ์จำกัด + ต้องขอ grant)

Tenant:
- Tenant Admin
- Supervisor
- Packer
- Viewer
- Claim Officer

สิทธิ์สำคัญที่ต้องแยกได้:
- เริ่ม/หยุดอัด
- ดูวิดีโอ
- ดาวน์โหลด
- แชร์ลิงก์
- ลบ/archive
- จัดการพนักงาน
- จัดการกล้อง/สถานี
- ดู billing
- จัดการเคลม
- ดู audit log

==================================================
3) User Flows หลัก
==================================================

3.1 Onboarding ลูกค้าใหม่
1. สมัครองค์กร / ถูกสร้างโดยฝ่ายขาย
2. เลือกแพ็กเกจหรือเริ่ม trial
3. สร้าง tenant + admin คนแรก
4. Wizard ตั้งค่า:
   - สร้างสถานีแพ็ค
   - เชื่อมกล้อง + บังคับทดสอบอัด 10 วินาที
   - เชิญพนักงาน
   - ตั้งภาษา/timezone/retention
   - อัดคลิปทดสอบ 1 รายการ
5. แสดง checklist “พร้อมใช้งาน”
6. มีคู่มือสั้นในระบบภาษาไทย

3.2 フローแพ็คหน้างาน (Station Console)
1. พนักงาน login ที่สถานี
2. ระบบตรวจ health: กล้องออนไลน์, disk พอ, sync เวลา OK, คิวอัปโหลดไม่วิกฤต
3. สแกนบาร์โค้ด/QR ออเดอร์หรือ tracking
4. แสดงยืนยันออเดอร์ (สินค้า/จำนวนแบบสรุป ถ้าระบบดึงข้อมูลได้)
5. เริ่มอัดอัตโนมัติหลังยืนยัน
6. แสดงสถานะ REC ชัดเจน (สี/ข้อความ/เสียงสั้นๆ)
7. แพ็คสินค้า
8. บังคับถ่าย snapshot ก่อนปิดกล่อง (ถ้านโยบายเปิด)
9. สแกนปิดงาน (scan-to-close) เพื่อหยุดอัด
10. อัปโหลด/เข้าคิว sync
11. คำนวณ completeness score
12. ถ้าผ่าน → สถานะ Ready
   ถ้าไม่ผ่าน → Warning ให้ Supervisor ตรวจ

3.3 ค้นหาและใช้หลักฐาน
1. ค้นด้วย order/tracking/วันที่/พนักงาน/สถานี/สถานะเคลม
2. เล่นวิดีโอหลายมุมกล้อง
3. ตรวจ hash
4. แชร์ลิงก์ชั่วคราวหรือสร้าง Claim Package
5. ทุกการดู/ดาวน์โหลด/แชร์มี audit

==================================================
4) ฟีเจอร์ระบบแบบครบ
==================================================

-------------------------
4.1 Recording Core
-------------------------
- รองรับ Webcam + IP Camera (RTSP/ONVIF)
- Multi-camera ต่อสถานี (เช่น มุมกว้าง + มุมมือแพ็ค) อัดพร้อมกัน sync เวลา
- เริ่ม/จบด้วยบาร์โค้ดเป็นหลัก ปุ่มมือเป็นทางรอง
- ผูกวิดีโอกับ: tenant_id, order_id, tracking_no, station_id, employee_id,
  camera_ids, started_at, ended_at, duration, completeness_score, status
- Preview realtime บน Station Console
- Auto-stop เมื่อ idle นานเกินกำหนด
- ป้องกันอัดซ้ำออเดอร์ที่มีคลิปสมบูรณ์แล้ว (ต้องมีเหตุผล reopen)
- กันสแกนสลับออเดอร์ระหว่างกำลังอัด
- ยกเลิกคลิปต้องระบุเหตุผล (สแกนผิด/แพ็คใหม่/ทดสอบ)
- Offline queue: เน็ตหลุดยังอัดและเก็บ local ได้ แล้ว sync เมื่อเน็ตกลับ
- Watchdog: คลิปสั้นผิดปกติ / ไม่มี snapshot / อัปโหลดล้ม → แจ้งเตือน

สถานะสถานี:
Idle, Recording, Uploading, Syncing, Ready, Warning, Offline, Camera Error, Disk Full, Blocked

-------------------------
4.2 Evidence Trust (ความน่าเชื่อถือ)
-------------------------
- Burn-in Overlay ตลอดคลิป:
  order id, tracking, วันที่-เวลา (+timezone), พนักงาน, สถานี, รหัส tenant
- Snapshot ก่อนปิดกล่อง อย่างน้อย 1 ภาพ ต่อออเดอร์ (ตั้งค่าบังคับได้)
- SHA-256 hash ของวิดีโอและ snapshot เก็บใน DB
- Verify hash ตอนเล่น/ดาวน์โหลด/export ได้
- Shared link ชั่วคราว:
  วันหมดอายุ, รหัสผ่าน optional, จำกัดจำนวนครั้งเปิด, watermark ผู้เปิด, audit ทุกครั้ง
- Consent acknowledgment สำหรับพนักงานว่ามีการบันทึกภาพตอนทำงาน
- Soft delete + ช่วงกู้คืน
- Legal hold: ถ้าติดเคลม ห้าม hard delete ตาม retention ปกติ
- Claim Package export:
  วิดีโอทุกมุม + snapshots + metadata + hashes + audit ที่เกี่ยวข้อง

-------------------------
4.3 Storage / Search / Playback
-------------------------
- Object storage แบบ S3-compatible
- path แยก tenant ชัดเจน: /{tenant_id}/recordings/...
- thumbnail + multi-cam grouping ต่อออเดอร์
- Transcode MP4 H.264 ด้วย FFmpeg เมื่อจำเป็น
- ค้นหา: order, tracking, วันที่, พนักงาน, สถานี, สถานะไฟล์, tag เคลม, completeness
- Player: seek, ความเร็วเล่น, สลับมุมกล้อง, timeline marker ตอนสแกนบาร์โค้ด
- ดาวน์โหลดตามสิทธิ์
- Retention ตามแพ็กเกจ: เตือนก่อนลบ → archive → delete (ยกเว้น legal hold)
- Preset คุณภาพวิดีโอตามแพ็กเกจ กัน storage พองเกินจำเป็น

-------------------------
4.4 Dashboard & Operations
-------------------------
Tenant Dashboard:
- วิดีโอวันนี้, สถานีออนไลน์, storage เหลือ, คิวอัปโหลดค้าง, กล้องมีปัญหา
- กราฟปริมาณแพ็คต่อวัน/สถานี/พนักงาน
- รายการเตือนล่าสุด
- สถานะพร้อมใช้งานรวม

Supervisor Wall / Station Monitor:
- เห็นทุกสถานี realtime
- ใครกำลังอัดออเดอร์อะไร
- สถานีไหนมี warning

-------------------------
4.5 Employees & Stations
-------------------------
- CRUD พนักงาน + กำหนด role + สถานีที่เข้าถึงได้
- เปิด/ปิดบัญชี, force logout, เปลี่ยนรหัสผ่าน, MFA สำหรับ Admin/Supervisor
- จัดการสถานีแพ็คและกล้องต่อสถานี
- บังคับกล้องผ่านการทดสอบอัดก่อนตั้งสถานะ Active
- Remote diagnostics เบื้องต้นของ Station Agent

-------------------------
4.6 Audit Log
-------------------------
บันทึกอย่างน้อย:
- login/logout/failed login
- เริ่มอัด/หยุดอัด/ยกเลิกอัด
- อัปโหลดสำเร็จ/ล้มเหลว/retry
- ดู/ดาวน์โหลด/แชร์/เปิด shared link
- verify hash
- แก้ตั้งค่า, จัดการผู้ใช้, ลบ/archive/restore
- support access ของ platform
ค้นหาและ export ได้ในขอบเขตสิทธิ์

-------------------------
4.7 Alerts & Notifications
-------------------------
ช่องทาง: Email และ/หรือ LINE / webhook
เหตุการณ์:
- กล้องออฟไลน์, สถานีออฟไลน์
- disk ใกล้เต็ม/เต็ม
- อัปโหลดล้มซ้ำ, offline queue ค้างนาน
- storage ใกล้โควต้า
- trial/subscription ใกล้หมดอายุหรือค้างชำระ
- completeness ต่ำผิดปกติ
- time drift ของสถานี
- ความผิดปกติระบบระดับ platform

-------------------------
4.8 Integrations
-------------------------
- ดึงออเดอร์จาก Shopee / Lazada / Shopify / WMS (API/webhook)
- แสดงสรุปรายการสินค้าบนหน้าแพ็คหลังสแกน
- Webhook ออกเมื่อ recording ready / upload completed / claim package created
- เปิดใช้ตามแพ็กเกจ
- ออกแบบให้เพิ่ม connector ใหม่ได้ในอนาคต

-------------------------
4.9 AI Assist (แพ็กเกจสูง / optional)
-------------------------
- ตรวจคร่าวๆ ว่ากล่องว่างหรือมีสินค้า
- นับชิ้นคร่าวๆ เทียบออเดอร์
- ให้ confidence score
- ต้องมี human confirm เสมอ
- เก็บผล AI เป็น metadata ไม่ใช่คำตัดสินเด็ดขาด

-------------------------
4.10 Claims & Reports
-------------------------
- แท็กออเดอร์/วิดีโอว่าเป็นเคสเคลม
- รายงาน:
  ปริมาณแพ็ค, อัตราคลิปไม่สมบูรณ์, เคสเคลม, เวลาเฉลี่ยหาคลิป,
  สถานี/พนักงานที่เกี่ยวกับเคลมบ่อย
- สร้างและส่ง Claim Package
- ดูประวัติว่าใครเปิดหลักฐานนี้บ้าง

-------------------------
4.11 Settings
-------------------------
- กล้อง/สถานี: ความละเอียด, bitrate, overlay on/off, snapshot บังคับ
- timezone, ภาษา, dark mode
- retention, watchdog thresholds
- นโยบาย completeness (ขั้นต่ำกี่วินาที, ต้องมีกี่มุมกล้อง, ต้องมี snapshot)
- แจ้งเตือน
- consent policy
- integration keys
- billing profile ของ tenant

-------------------------
4.12 Billing / Subscription (ฝั่งลูกค้า)
-------------------------
- แผนปัจจุบัน, วันหมดอายุ, trial remaining
- usage: storage used/remaining, stations used/limit, users used/limit
- อัปเกรดแพ็กเกจ
- ประวัติชำระเงิน/ใบเสร็จ
- แบนเนอร์เตือนใกล้เต็ม/ใกล้หมดอายุ
- หน้าบล็อกเมื่อ suspended พร้อมวิธีต่ออายุ

-------------------------
4.13 Platform Admin (ฝั่ง PackEX)
-------------------------
- Tenants management (create/suspend/reactivate/delete request)
- Plans & pricing config
- Feature flags ต่อแพ็กเกจหรือต่อ tenant
- Usage & revenue overview แบบ aggregate
- System health: queues, error rate, storage, station online ratio
- Support access grants แบบชั่วคราว ต้องขอ/มีเหตุผล/มีหมดอายุ/มี audit
- Announcements / maintenance mode
- Data export/deletion requests ของลูกค้า
- ห้ามมองเห็นคลิปลูกค้าโดยไม่มี grant

==================================================
5) ชั้นป้องกันข้อผิดพลาด (Mandatory)
==================================================

5.1 กันพลาดพนักงาน
- ยืนยันออเดอร์ก่อนเริ่มอัด
- ห้ามเริ่มอัดซ้ำออเดอร์ที่ Ready แล้วโดยไม่มีเหตุผล
- บังคับ scan-to-close
- กันสแกนคนละออเดอร์ตอนกำลังอัด
- UI สถานีใหญ่ ชัด ปุ่มน้อย เน้นสแกนเนอร์
- แสดง REC ชัดเจนมาก
- error message ภาษาคน เช่น “กล้องมุมมือออฟไลน์ ห้ามแพ็คต่อ”

5.2 กันพังหน้างาน
- Camera heartbeat ต่อเนื่อง
- ตรวจ disk เครื่องสถานีก่อนรับงาน
- บังคับทดสอบอัดตอนตั้งค่ากล้อง
- NTP/time drift detection
- Idempotent upload
- Checksum ตอนอัปโหลด
- Retry มีเพดาน + Dead Letter Queue
- Self-heal / re-sync ของ Station Agent
- Station Agent ต้องทำงานได้แบบ offline-first

5.3 กันหลักฐานอ่อน
- Completeness score ก่อนสถานะ Ready for claim
- Soft delete + restore window
- Legal hold เมื่อมีเคลม
- Hash verify
- Watermark ตอนแชร์/เปิดลิงก์ภายนอก
- แยก metadata ออกจากไฟล์ media

5.4 กันพลาดแบบ Multi-tenant
- ทุกตารางธุรกิจมี tenant_id และบังคับ filter ทุก query
- signed URL ตรวจสิทธิ์ tenant ก่อนออกลิงก์
- ทดสอบ isolation อัตโนมัติ Tenant A/B
- rate limit ต่อ tenant
- suspend แล้วเข้าใช้งานไม่ได้ (ยกเว้นหน้าบิล)
- support access แบบ grant เท่านั้น

==================================================
6) Station Agent (สำคัญมากต่อการขายจริง)
==================================================
สร้าง PackEX Station Agent สำหรับเครื่องที่สถานีแพ็ค:
- เชื่อม Webcam/IP Camera
- อัดวิดีโอ local ก่อน
- ใส่ overlay
- จัดการคิวอัปโหลด
- heartbeat ส่งกลับคลาวด์
- ทำงานได้ตอนเน็ตหลุด
- อัปเดตเวอร์ชันแบบ remote (ปลอดภัย)
- รายงานสุขภาพ: CPU, disk, camera status, queue size, time drift
- ล็อกอินผูกสถานี + พนักงาน

ไม่มี Agent นี้อย่าถือว่าระบบพร้อมขายหลายโกดัง

==================================================
7) Compliance / Legal / Trust
==================================================
- หน้า Privacy Policy และ Terms of Service
- PDPA-oriented flows:
  - ระยะเก็บข้อมูล
  - สิทธิ์เข้าถึงวิดีโอ
  - export ข้อมูลลูกค้า
  - ลบข้อมูลเมื่อเลิกสัญญา
- บันทึกความยินยอมพนักงานเรื่องการบันทึกภาพ
- นโยบายเข้าถึงข้อมูลโดยทีมซัพพอร์ต
- แยกข้อมูลส่วนบุคคลลูกค้าปลายทาง (ที่อยู่) แบบปกปิดใน UI ถ้าไม่จำเป็น

==================================================
8) หน้าจอที่ต้องมีครบ
==================================================

ฝั่ง Tenant:
1. Login / MFA / Consent
2. Onboarding Wizard
3. Dashboard
4. Station Recording Console
5. Stations & Cameras
6. Search Video + Player
7. Claim & Share Link Manager
8. Employees & Roles
9. Audit Log
10. Reports
11. Alerts Center
12. Settings
13. Billing / Plan / Usage
14. Change Password
15. Help Center / Quick Guides

ฝั่ง Platform:
1. Platform Login
2. Tenants Management
3. Plans & Feature Flags
4. Usage & Billing Overview
5. System Health
6. Support Access Grants
7. Announcements / Maintenance
8. Data Deletion / Export Requests

สถานะ UI ที่ต้องมีทุกหน้าสำคัญ:
loading, empty, error, offline, permission denied, quota exceeded

==================================================
9) Data Model ขั้นต่ำ
==================================================
tenants
tenant_settings
plans
subscriptions
invoices
payments
usage_meters
feature_flags
platform_admins
support_access_grants
users
roles
role_permissions
stations
cameras
station_agents
agent_heartbeats
orders
order_items (optional จาก integration)
recordings
recording_files
snapshots
file_hashes
timeline_markers
share_links
share_link_accesses
claim_cases
claim_packages
ai_checks
audit_logs
alerts
alert_subscriptions
integrations
integration_events
onboarding_states
data_export_requests
data_deletion_requests
announcements

ทุกตารางธุรกิจต้องอ้างอิง tenant_id ได้ (ยกเว้นตารางระดับ platform)

==================================================
10) สถาปัตยกรรมและ Tech Stack
==================================================
- Frontend: Next.js + TypeScript + Tailwind
- Backend: Next.js Route Handlers หรือ NestJS
- DB: PostgreSQL
- Object Storage: S3-compatible
- Queue/Workers: สำหรับ upload finalize, transcode, AI, email/LINE, retention jobs
- Realtime: WebSocket หรือ SSE
- Auth: session/JWT + RBAC + MFA
- Video: MediaRecorder / FFmpeg → MP4 H.264
- Payments: ออกแบบ entity พร้อมต่อ Stripe/Omise หรือระบบชำระเงินไทยภายหลัง
- Observability: structured logs, metrics, per-tenant error tracking, health checks
- Security: HTTPS, signed URLs มี expiry, encryption in transit, rate limit,
  soft delete, least-privilege access

Deployment modes:
1. Cloud SaaS (ค่าเริ่มต้น)
2. Hybrid (อัดหน้างาน อัปโหลดตามนโยบาย)
3. Enterprise Private/VPC

==================================================
11) นโยบายคุณภาพวิดีโอและต้นทุน
==================================================
- มี preset: Economy / Standard / High
- จำกัด bitrate ตามแพ็กเกจ
- แนะนำค่า default ที่บาลานซ์ระหว่างชัดพอพิสูจน์ของ กับต้นทุน storage
- แสดงประมาณการว่า retention ปัจจุบันจะกิน storage เท่าไร

==================================================
12) Acceptance Criteria (ต้องผ่านก่อนถือว่าพร้อมขาย)
==================================================

Functional:
- สแกนออเดอร์แล้วเริ่มอัด ผูกไฟล์กับออเดอร์นั้นได้
- สแกนจบแล้วหยุดอัด อัปโหลด และค้นหาเจอด้วย tracking
- overlay ข้อมูลปรากฏในวิดีโอ
- snapshot ถูกบังคับได้ตามตั้งค่า
- multi-cam ต่อ 1 ออเดอร์เล่นสลับมุมได้
- shared link หมดอายุแล้วเปิดไม่ได้ มี audit
- completeness ไม่ผ่านแล้วไม่ขึ้น Ready แบบเขียว

Reliability:
- เน็ตตัดระหว่างอัดอย่างน้อย 5 นาที แล้วกลับมา คลิปไม่หาย
- อัปโหลดซ้ำไม่สร้างไฟล์ซ้ำ
- กล้องหลุดระหว่างอัดมีเตือนทันที
- disk เต็มแล้วรับงานใหม่ไม่ได้แบบปลอดภัย
- time drift ถูกตรวจจับได้

Multi-tenant / Security:
- Tenant A ไม่เห็นข้อมูล/ไฟล์/URL ของ Tenant B
- จำกัดจำนวนสถานีตามแพ็กเกจได้จริง
- storage เต็มแล้วมีเตือนและนโยบายบล็อกตามที่กำหนด
- trial หมดแล้วพาไปต่ออายุ
- platform support เข้าคลิปลูกค้าไม่ได้ถ้าไม่มี grant
- ระงับ tenant ค้างชำระได้

Business readiness:
- onboarding wizard ทำให้ลูกค้าใหม่พร้อมอัดคลิปทดสอบได้
- หน้า usage/billing อธิบายได้ว่าใช้ไปเท่าไร เหลือเท่าไร
- มี Privacy/Terms ในแอป
- มี soft delete, retention, legal hold
- มี audit ครอบคลุมการดู/ดาวน์โหลด/แชร์หลักฐาน

==================================================
13) แผนทดสอบก่อน Go-Live ลูกค้าจริง
==================================================
ต้องมี test checklist อย่างน้อย:
1. อัด 2 สถานีพร้อมกัน คนละออเดอร์ ไฟล์ไม่สลับ
2. Offline record + sync
3. Upload ไฟล์ใหญ่เน็ตช้า
4. Tenant isolation + signed URL cross-access ต้อง fail
5. Quota station/storage
6. Shared link expiry/password
7. Hash mismatch detection
8. Camera disconnect mid-recording
9. Agent auto-reconnect
10. Claim package export ครบไฟล์
11. Suspended tenant gating
12. Data export/deletion request flow

==================================================
14) UX / UI Guidelines
==================================================
- โทนระบบทำงานจริงในโกดัง ไม่ใช่ marketing landing เละๆ
- Station Console: ตัวหนังสือใหญ่ คอนทราสต์สูง มือใช้งานเร็ว
- Dashboard/Admin: ชัด เรียบ เป็นมืออาชีพ
- มีแบรนด์ PackEX ชัดใน sidebar/header
- รองรับมือถือสำหรับค้นหา/ดูวิดีโอ/อนุมัติเคลม
- หน้าแพ็คเน้น desktop/tablet ที่สถานี
- ข้อความภาษาไทยเป็นหลัก สลับ EN/中 ได้
- หลีกเลี่ยง UI รก: ไม่ใส่การ์ด/สเตท/ชิปเกินจำเป็นในหน้าแพ็ค
- หน้าแพ็คมีงานเดียว: สแกน → อัด → จบงานอย่างปลอดภัย

==================================================
15) สิ่งที่ต้องส่งมอบ
==================================================
ไม่ใช่แค่ mock UI แต่ต้องมี:
1. Information architecture ทั้งระบบ
2. Data model
3. Role/permission matrix
4. Main user flows
5. หน้าจอหลักครบทั้ง Tenant และ Platform
6. Station Agent concept + states
7. Error/empty/loading/quota states
8. รายการ acceptance tests
9. ข้อเสนอแพ็กเกจขาย Starter/Business/Enterprise
10. จุดขยายในอนาคตที่ออกแบบไว้แล้ว (payment gateway จริง, connector ใหม่, AI)

เป้าหมายสูงสุด:
ได้ระบบ PackEX ที่พร้อมใช้ในโกดังจริง และพร้อมขายให้หลายลูกค้า
โดยหลักฐานวิดีโอน่าเชื่อถือ ข้อมูลไม่ปน ลดความผิดพลาดหน้างาน
และดูแลลูกค้าแบบ SaaS ได้จากศูนย์กลาง