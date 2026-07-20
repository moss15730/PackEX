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

อัปโหลดผ่าน `POST /api/t/[tenant]/upload`  
หน้า Videos จะเล่นผ่าน **signed URL**

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
npx vercel --prod
```

หรือตั้งค่า env ใน Vercel Dashboard → Project → Settings → Environment Variables

## Supabase

- ชื่อโปรเจกต์ (display): **packex**
- Project ID (เปลี่ยนไม่ได้): `sybzcdsbkjwrfiycmjep`
- URL: `https://sybzcdsbkjwrfiycmjep.supabase.co`

## หมายเหตุ

- บน Vercel ใช้ **pooler URL** เป็น `DATABASE_URL` เสมอ
- `AUTH_SECRET` ควรเป็นสตริงยาวสุ่ม (อย่างน้อย 32 ตัวอักษร)
- Google Drive เป็น interim storage — ภายหลังย้ายไป S3/R2 ได้โดยเปลี่ยน adapter ใน `src/lib/drive.ts`
