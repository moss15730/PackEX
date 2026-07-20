# PackEX — Packing Video Systems

ระบบบันทึกวิดีโอตอนบรรจุพัสดุ (B2B Multi-tenant SaaS) ตามสเปกใน `PACKEX-PROMPT.md`

**Production stack:** Vercel + Supabase (Postgres) + Google Drive (วิดีโอชั่วคราว)  
ดูขั้นตอนเต็มใน [DEPLOY.md](./DEPLOY.md)

## Quick start

```bash
npm install
cp .env.example .env.local   # ใส่ DATABASE_URL / DIRECT_URL จาก Supabase
npx prisma db push
npm run db:seed
npm run dev
```

เปิด http://localhost:3000

## Demo accounts

| บทบาท | Tenant | Email | Password |
|--------|--------|-------|----------|
| Tenant Admin | `acme` | `admin@acme.local` | `password123` |
| Packer | `acme` | `packer@acme.local` | `password123` |
| Platform Super Admin | — | `admin@PackEX.app` | `password123` |

Share link ตัวอย่าง: `/share/demo-share-token`

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Prisma + **Supabase PostgreSQL**
- JWT session cookie + RBAC
- Video files → **Google Drive** (interim; see `DEPLOY.md`)
- Hosting → **Vercel** — https://PackEX.vercel.app
- Station Agent concept: `agents/README.md`

## โครงสร้างหลัก

- `/` — Landing
- `/login` — Tenant / Platform login
- `/t/[tenant]/...` — Tenant app (Dashboard, Station Console, Videos, Claims, Billing, …)
- `/platform/...` — PackEX platform admin
- `/share/[token]` — Shared evidence link
- `/privacy`, `/terms` — PDPA stubs

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run db:push` — sync schema
- `npm run db:seed` — seed demo data
- `npm run db:reset` — reset DB + seed
