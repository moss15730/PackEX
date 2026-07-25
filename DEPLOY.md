# Deploy PackEX → Vercel + Supabase (Postgres + Storage)

## 1) Supabase (PostgreSQL)

1. สร้างโปรเจกต์ที่ https://supabase.com/dashboard
2. ไปที่ **Project Settings → Database → Connection string**
3. คัดลอก 2 ค่า:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL` (ใส่ `?pgbouncer=true`)
   - **Session / Direct** (port `5432`) → `DIRECT_URL`
4. รัน migrate จากเครื่องคุณ:

```bash
# ใส่ค่าใน .env.local ก่อน
npx prisma db push
npx tsx prisma/seed.ts
```

## 2) Supabase Storage (เก็บวิดีโอ)

1. ไปที่ **Project Settings → API**
2. คัดลอก:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (อย่าเปิดเผยฝั่ง client)
3. (ถ้าต้องการ) ตั้งชื่อ bucket: `SUPABASE_STORAGE_BUCKET=recordings`
4. สร้าง bucket:

```bash
npx tsx scripts/setup-storage.ts
```

หรือสร้างเองใน Dashboard → Storage → New bucket ชื่อ `recordings` (แนะนำเป็น **Private**)

อัปโหลดผ่าน:
- **Production (แนะนำ):** เบราว์เซอร์ขอ signed URL จาก `/api/t/[tenant]/upload/sign` แล้วอัปตรงไป Supabase → ลงทะเบียนด้วย `/upload/complete`  
  (หลีกเลี่ยงขีดจำกัด body ~4.5MB ของ Vercel)
- **Local fallback:** `POST /api/t/[tenant]/upload` (multipart)

หน้า Videos จะเล่นผ่าน **signed URL**

Env ที่ต้องมีบน Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (optional, default `recordings`)

ถ้ายังไม่ตั้งค่า Storage ระบบจะเก็บไฟล์ไว้ในโฟลเดอร์ `storage/` ของเครื่อง (ใช้ได้ตอน local เท่านั้น)

**ขีดจำกัดขนาดไฟล์:** แผน Free สูงสุด **50 MB/ไฟล์** (ตั้งที่ Storage → Settings → Global file size limit)  
แอปอัดที่ ~1.2 Mbps เพื่อให้คลิปสั้น–กลางขึ้นได้ — ถ้าต้องการคลิปยาว/คมชัด ต้องอัปเกรด Pro แล้วเพิ่ม global limit

## 3) Vercel

โปรเจกต์ชื่อ `packex`  
Production URL ปัจจุบัน: https://packex-mosss-projects-44a2e3d4.vercel.app

> **หมายเหตุ `packex.vercel.app`:** โดเมนนี้ถูกจองโดยบัญชี Vercel อื่นอยู่แล้ว  
> (`domain_taken` / aliased to another account) — บัญชีนี้เพิ่มไม่ได้  
> วิธีแก้: เข้าบัญชีที่เคยสร้างโปรเจกต์ชื่อ `packex` แล้วลบ/เปลี่ยนชื่อโปรเจกต์นั้น  
> จากนั้นรัน `npx vercel alias set <deployment> packex.vercel.app`

```bash
npx vercel link
npx vercel env add DATABASE_URL
npx vercel env add DIRECT_URL
npx vercel env add AUTH_SECRET
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add SUPABASE_STORAGE_BUCKET
npx vercel env add CRON_SECRET
npx vercel env add STATION_AGENT_KEY
npx vercel env add NEXT_PUBLIC_APP_URL
npx vercel env add NEXT_PUBLIC_SUPPORT_EMAIL
npx vercel env add NEXT_PUBLIC_BILLING_EMAIL
npx vercel env add NEXT_PUBLIC_PRIVACY_EMAIL
npx vercel --prod
```

### Cron ที่ตั้งไว้ (`vercel.json`)

| Path | Schedule | หน้าที่ |
| --- | --- | --- |
| `/api/cron/retention` | ทุกวัน 03:00 | ลบวิดีโอที่พ้นกำหนด, ยกเลิก recording ค้าง, suspend trial ที่หมดอายุ, mark agent offline |
| `/api/cron/billing` | วันที่ 1 เวลา 02:00 | ออกใบแจ้งหนี้รายเดือนจาก subscription ที่ใช้งานอยู่ (idempotent — รันซ้ำไม่ออกซ้ำ) |

ทั้งสอง endpoint ต้องมี `Authorization: Bearer $CRON_SECRET` เมื่ออยู่บน production

### บริการเสริม (ไม่ตั้งก็ทำงานได้ แต่แนะนำสำหรับ production)

| บริการ | Env | ถ้าไม่ตั้งค่าจะเป็นอย่างไร |
| --- | --- | --- |
| อีเมล (Resend) | `RESEND_API_KEY`, `MAIL_FROM` | ลิงก์รีเซ็ตรหัสผ่านส่งอีเมลไม่ได้ — ต้องให้ platform admin ส่งให้เอง (มี log ใน audit) |
| Rate limit แบบกระจาย (Upstash) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | ใช้ตัวนับใน memory ซึ่งแยกกันในแต่ละ serverless instance — กัน brute force ได้อ่อนกว่า |
| Error tracking (Sentry) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | ไม่ส่ง error ออกไปไหน (ยังเห็นใน Vercel logs) |

### การทดลองใช้ด้วยตนเอง (self-serve trial)

องค์กรสมัครเองได้ที่ `/signup` โดยไม่ต้องรออนุมัติ ขอบเขตการทดลองกำหนดที่
**Platform → ตั้งค่าแพลตฟอร์ม**:

| ตั้งค่า | ผลที่เกิด |
| --- | --- |
| เปิด/ปิดรับสมัคร | ปิดแล้วหน้า `/signup` จะแจ้งให้ติดต่อทีมงานแทน |
| แผนที่ใช้ตอนทดลอง | ถ้าไม่เลือกจะใช้แผนที่ถูกที่สุด |
| จำนวนวัน | ค่าเริ่มต้น 7 วัน (1–365) |
| โควต้า สถานี/พื้นที่/ผู้ใช้ | เขียนเป็น override ของ tenant นั้น — แก้รายองค์กรทีหลังได้ที่หน้า Tenants |
| ข้อความแจ้งผู้สมัคร | แสดงบนหน้าสมัคร และส่งเป็นข้อความต้อนรับในแชท |

**เมื่อหมดช่วงทดลอง** องค์กรจะเข้าสู่ **โหมดดูอย่างเดียว**:

- เข้าสู่ระบบได้ปกติ ดูวิดีโอ เคลม รายงาน และ audit log ได้ครบ
- ทุก API ที่เขียนข้อมูลตอบ `403` พร้อมข้อความอธิบาย (บังคับที่ฝั่งเซิร์ฟเวอร์ ไม่ใช่แค่ซ่อนปุ่ม)
- แชทกับผู้ดูแลระบบยังใช้ได้ — เป็นทางเดียวที่จะขอปลดล็อก
- ต่ออายุ: `npm run trial:set -- <slug> <จำนวนวัน>` หรือเปลี่ยนแผนที่หน้า Tenants

```bash
npm run trial:set -- acme 14   # ต่ออายุ 14 วัน (เปิดสิทธิ์เขียนกลับมา)
npm run trial:set -- acme -1   # หมดอายุทันที (เข้าโหมดดูอย่างเดียว)
```

### แชทซัพพอร์ต

- องค์กรคุยผ่านปุ่มแชทมุมขวาล่างของทุกหน้าในแอป
- ผู้ดูแลตอบที่ **Platform → กล่องข้อความ** เห็นทุกองค์กรพร้อมจำนวนข้อความที่ยังไม่อ่าน
- ใช้การ poll (8 วิเมื่อเปิดแชท / 60 วิเมื่อปิด) จึงไม่ต้องมี WebSocket server
- **สถานะอ่านแล้ว**: ทำเครื่องหมายว่าอ่านเมื่อ "เปิดหน้าต่างแชทจริง" เท่านั้น
  (ฝั่งองค์กรส่ง `?open=1`, ฝั่งแอดมินคือตอนคลิกเข้าไปในเธรด) — การ poll เบื้องหลัง
  หรือแค่เห็นรายการในกล่องข้อความ **ไม่นับว่าอ่าน** ผู้ส่งจะเห็น "ส่งแล้ว → อ่านแล้ว"
  ใต้ข้อความล่าสุดของตัวเอง

### คำสั่งดูแลระบบ

```bash
npm run verify              # typecheck + lint + unit tests
npm test                    # unit tests อย่างเดียว
npm run audit:credentials   # หาบัญชีที่ยังใช้รหัส demo + tenant ค้าง + env ที่ขาด
npm run set-password -- <email> [password]   # ตั้งรหัสผ่านให้ user/platform admin
npm run db:purge-deleted    # dry run: ลบถาวรเฉพาะ tenant ที่ status=deleted
npm run db:purge-deleted -- --yes
npm run trial:set -- <slug> <days>           # ต่อ/หมดอายุช่วงทดลองใช้
npm run create-admin -- <email> <password>   # สร้าง platform admin
```

> `npm run db:purge-tenants` ลบ **ทุก** องค์กร — ใช้กับฐานข้อมูล dev เท่านั้น
> บน production ให้ใช้ `db:purge-deleted` ซึ่งแตะเฉพาะ tenant ที่ถูกทำเครื่องหมายลบแล้ว

### Health check

`GET /api/health` — ตอบ `200` เมื่อระบบพร้อม และ `503` เมื่อ dependency หลักล่ม  
ใช้ตั้ง uptime monitor ได้ทันที (ตรวจ database, storage bucket, env, และ cron ล่าสุด)  
ดูรายละเอียดแบบเต็มได้ที่ **Platform → สุขภาพระบบ**

หรือตั้งค่า env ใน Vercel Dashboard → Project → Settings → Environment Variables

## Supabase

- ชื่อโปรเจกต์ (display): **packex**
- Project ID (เปลี่ยนไม่ได้): `sybzcdsbkjwrfiycmjep`
- URL: `https://sybzcdsbkjwrfiycmjep.supabase.co`

## Go-live checklist (production)

ก่อนเปิดใช้จริง ตรวจให้ครบ:

**ตั้งค่า**

- [ ] `AUTH_SECRET` สุ่มใหม่ ≥ 32 ตัวอักษร (ไม่ใช่ค่าตัวอย่าง)
- [ ] `DATABASE_URL` + `DIRECT_URL` จาก Supabase pooler/direct
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + bucket `recordings` (Private)
- [ ] Storage Global file size limit ≥ 50MB (แนะนำ Pro ถ้าคลิปยาว)
- [ ] `CRON_SECRET` ตั้งแล้ว และ Vercel Cron ทั้ง 2 ตัวทำงาน
- [ ] `STATION_AGENT_KEY` ถ้าใช้ Agent heartbeat
- [ ] `NEXT_PUBLIC_APP_URL` + อีเมลติดต่อ (support / billing / privacy) ชี้ไปกล่องจดหมายที่มีคนอ่านจริง
- [ ] เปิด **Platform → สุขภาพระบบ** แล้วต้องไม่มีรายการสีแดง

**ข้อมูล**

- [ ] รัน `npm run audit:credentials` แล้วต้องไม่มี ❌ (ไม่มีบัญชีใช้ `password123`)
- [ ] ลบ tenant ที่ค้างสถานะ deleted ด้วย `npm run db:purge-deleted -- --yes`
- [ ] ตรวจว่าแผนบริการใน **Platform → แผนบริการ** เป็นราคาจริงที่ขาย (หน้าแรกดึงตัวเลขจากตารางนี้)

**ทดสอบก่อนเปิดใช้**

- [ ] login → อัด → อัปโหลด → เล่น → ตรวจ hash → แชร์ (มี/ไม่มีรหัส) → เคลม export
- [ ] trial หมดอายุแล้ว tenant ถูก suspend โดย cron
- [ ] Support Grant → ปุ่ม «เข้าองค์กร» เข้าได้เฉพาะ grantee / super_admin
- [ ] `/api/health` ตอบ `200` และ uptime monitor ชี้มาที่ endpoint นี้
- [ ] ยื่นคำขอ PDPA จาก **ตั้งค่า → ข้อมูลองค์กร** แล้วปิดงานได้จาก **Platform → Data requests**
- [ ] ลืมรหัสผ่าน → ได้อีเมล → ตั้งรหัสใหม่ → ลิงก์เดิมใช้ซ้ำไม่ได้ (ต้องตั้ง `RESEND_API_KEY` ก่อน)
- [ ] สมัครที่ `/signup` → เข้าสู่ระบบได้ → ได้โควต้าตามที่ตั้งไว้
- [ ] `npm run trial:set -- <slug> -1` → ยัง login/ดูข้อมูลได้ แต่เพิ่ม/แก้/ลบไม่ได้ และแชทยังใช้งานได้
- [ ] องค์กรทักแชท → ขึ้นใน **Platform → กล่องข้อความ** → ตอบกลับแล้วองค์กรเห็นข้อความ
- [ ] เรียก `/api/cron/billing` แล้วมีใบแจ้งหนี้ขึ้นใน **Platform → การเรียกเก็บเงิน**
- [ ] ลิงก์แชร์ที่ผิดรูปแบบตอบ `404` และลิงก์หมดอายุแสดงหน้าแจ้งเตือน

**ขอบเขต go-live ที่รองรับตอนนี้:** สถานีอัดผ่านเบราว์เซอร์บนเครื่องที่เน็ตเสถียร คลิปสั้น–กลาง  
**ยังไม่ใช่:** offline-first Agent เต็มระบบ / IP camera RTSP / คลิปยาวหลายชั่วโมงโดยไม่ปรับ storage limit

## หมายเหตุ

- บน Vercel ใช้ **pooler URL** เป็น `DATABASE_URL` เสมอ
- `AUTH_SECRET` ควรเป็นสตริงยาวสุ่ม (อย่างน้อย 32 ตัวอักษร)
- ตั้ง `CRON_SECRET` สำหรับ cron ทั้งสองตัว
- ตั้ง `STATION_AGENT_KEY` ถ้าจะใช้ Station Agent heartbeat
- Google Drive เป็น interim storage — ภายหลังย้ายไป S3/R2 ได้โดยเปลี่ยน adapter ใน `src/lib/drive.ts`
- ทุกหน้าใน `/t/*` และ `/platform/*` เป็น `force-dynamic` โดยเจตนา — ข้อมูล tenant ต้องไม่ถูก prerender หรือแคชข้ามผู้ใช้
- ลิงก์แชร์ที่ **รูปแบบผิด** จะถูก proxy ตอบ `404` ทันที ส่วนลิงก์ที่รูปแบบถูกแต่ไม่มีในระบบจะได้ `200`
  พร้อม `<meta name="robots" content="noindex">` — เป็นข้อจำกัดของ streaming ใน Next.js
  (เปลี่ยน status หลังเริ่ม stream ไม่ได้) ไม่กระทบการ index เพราะมี noindex กำกับ
