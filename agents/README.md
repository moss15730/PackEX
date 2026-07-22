# PackEX Station Agent

Station Agent เป็นแอปที่ติดตั้งบนเครื่องคอมพิวเตอร์ที่สถานีแพ็ค ทำหน้าที่อัดวิดีโอหลายมุมกล้อง ซิงก์ไฟล์ขึ้น cloud และส่ง heartbeat กลับ PackEX

## สถาปัตยกรรม

```
[กล้อง Webcam/IP] → [Station Agent] → [Local Queue] → [PackEX API / Storage]
                              ↓
                        Heartbeat (ทุก ~30s)
```

## Quick start — heartbeat worker (scaffold)

มี worker แบบ Node.js ขั้นต่ำในโฟลเดอร์นี้ (ยังไม่อัดวิดีโอ — ส่ง heartbeat + จำลองคิวออฟไลน์)

```bash
cd agents
cp .env.example .env
# ใส่ PACKEX_STATION_ID จาก DB และ STATION_AGENT_KEY ให้ตรงกับเซิร์ฟเวอร์
node heartbeat-agent.mjs
# หรือ: npm start
```

Env ที่ต้องมี:

| ตัวแปร | ความหมาย |
|--------|----------|
| `PACKEX_BASE_URL` | URL ของ PackEX (เช่น `http://localhost:3000`) |
| `PACKEX_TENANT_SLUG` | slug องค์กร เช่น `acme` |
| `PACKEX_STATION_ID` | cuid ของสถานี |
| `STATION_AGENT_KEY` | ต้องตรงกับ env บนเซิร์ฟเวอร์ |
| `HEARTBEAT_INTERVAL_MS` | ค่าเริ่มต้น 30000 |

บนเซิร์ฟเวอร์ตั้ง:

```
STATION_AGENT_KEY=...
```

## Heartbeat API

```
POST /api/t/{tenantSlug}/stations/{stationId}/heartbeat
```

### Auth

1. Session cookie ของผู้ใช้ที่มีสิทธิ์ `stations.manage` หรือ `recording.start`
2. Header `x-packex-agent-key` ตรงกับ `STATION_AGENT_KEY`

### Body

| ฟิลด์ | ประเภท | คำอธิบาย |
|--------|--------|----------|
| `version` | string | เวอร์ชัน Agent |
| `cpuPercent` | number | % CPU |
| `diskFreeGb` | number | พื้นที่ดิสก์ว่าง (GB) |
| `queueSize` | number | จำนวนไฟล์รออัปโหลด |
| `timeDriftMs` | number | ความคลาดเคลื่อนเวลา (ms) |
| `online` | boolean | สถานะออนไลน์ |

### ผลต่อสถานี

- `online: false` → `offline`
- `diskFreeGb < 5` → `disk_full` (+ alert)
- `diskFreeGb < 20` → `warning` (+ alert)
- กลับมาปกติจาก offline/disk_full → `ready`
- Cron `/api/cron/retention` จะ mark agent ที่ heartbeat เกิน 5 นาทีเป็น offline

## สถานะสถานี (Station.status)

| สถานะ | ความหมาย |
|--------|----------|
| `idle` / `ready` | พร้อมรับออเดอร์ |
| `recording` | กำลังอัดวิดีโอ |
| `uploading` / `syncing` | กำลังอัปโหลด/ซิงก์ |
| `warning` | มีปัญหาเล็กน้อย |
| `offline` | Agent ไม่ตอบ heartbeat |
| `camera_error` / `disk_full` / `blocked` | ข้อผิดพลาดเฉพาะ |

## Demo เว็บ vs Agent จริง

**Station Console (เว็บ)** ตอนนี้:

- อัดผ่าน MediaRecorder + burn-in overlay
- ใช้ preset / idle auto-stop จากตั้งค่าองค์กร
- อัปโหลด signed URL + hash จริง

**Agent จริง (ขั้นต่อไป):** Electron/native อัด local, overlay, คิวออฟไลน์, แล้วอัปโหลดผ่าน API เดียวกับเว็บ + heartbeat worker นี้
