# PackEye — Packing Video Systems

ระบบบันทึกวิดีโอตอนบรรจุพัสดุ (B2B Multi-tenant SaaS) ตามสเปกใน `PACKEX-PROMPT.md`

## Quick start

```bash
npm install
npm run db:reset
npm run dev
```

เปิด http://localhost:3000

## Demo accounts

| บทบาท | Tenant | Email | Password |
|--------|--------|-------|----------|
| Tenant Admin | `acme` | `admin@acme.local` | `password123` |
| Packer | `acme` | `packer@acme.local` | `password123` |
| Platform Super Admin | — | `admin@packeye.app` | `password123` |

Share link ตัวอย่าง: `/share/demo-share-token`

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Prisma + SQLite (local demo) — เปลี่ยนเป็น PostgreSQL ได้ใน production
- JWT session cookie + RBAC
- Station Agent concept: `agents/README.md`

## โครงสร้างหลัก

- `/` — Landing
- `/login` — Tenant / Platform login
- `/t/[tenant]/...` — Tenant app (Dashboard, Station Console, Videos, Claims, Billing, …)
- `/platform/...` — PackEye platform admin
- `/share/[token]` — Shared evidence link
- `/privacy`, `/terms` — PDPA stubs

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run db:push` — sync schema
- `npm run db:seed` — seed demo data
- `npm run db:reset` — reset DB + seed
