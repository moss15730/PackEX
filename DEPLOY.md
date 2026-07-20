# Deploy PackEX → Vercel + Supabase + Google Drive

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

## 2) Google Drive (เก็บวิดีโอชั่วคราว)

1. สร้าง Google Cloud project → เปิด **Google Drive API**
2. สร้าง **Service Account** → Download JSON key
3. สร้างโฟลเดอร์ใน Google Drive แล้ว **Share** ให้ email ของ service account (สิทธิ์ Editor)
4. คัดลอก Folder ID จาก URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`
5. ตั้งค่า env:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (ใส่ `\n` ในบรรทัด)
   - `GOOGLE_DRIVE_FOLDER_ID`

อัปโหลดผ่าน `POST /api/t/[tenant]/upload` (multipart: `file`, `recordingId`, `cameraLabel`, `kind`)

ถ้ายังไม่ตั้ง Drive ระบบจะเก็บ path แบบ `drive:pending/...` เป็น placeholder

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
npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
npx vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
npx vercel env add GOOGLE_DRIVE_FOLDER_ID
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
