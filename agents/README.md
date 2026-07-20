# PackEye Station Agent

Station Agent เป็นแอปที่ติดตั้งบนเครื่องคอมพิวเตอร์ที่สถานีแพ็ค ทำหน้าที่อัดวิดีโอหลายมุมกล้อง ซิงก์ไฟล์ขึ้น cloud และส่ง heartbeat กลับ PackEye

## สถาปัตยกรรม

```
[กล้อง Webcam/IP] → [Station Agent] → [Local Queue] → [PackEye API / Storage]
                              ↓
                        Heartbeat (ทุก ~30s)
```

Agent ทำงานแบบ **offline-first**: อัดและเก็บไฟล์ในเครื่องก่อน แม้เน็ตขาดก็ยังอัดได้ แล้วค่อยอัปโหลดเมื่อเชื่อมต่อกลับ

## สถานะสถานี (Station.status)

| สถานะ | ความหมาย |
|--------|----------|
| `idle` | พร้อมรับออเดอร์ |
| `recording` | กำลังอัดวิดีโอ |
| `uploading` | กำลังอัปโหลดไฟล์ |
| `syncing` | กำลังซิงก์ metadata |
| `ready` | พร้อมใช้งานเต็มรูปแบบ |
| `warning` | มีปัญหาเล็กน้อย ควรตรวจ |
| `offline` | Agent ไม่ตอบ heartbeat |
| `camera_error` | กล้องมีปัญหา |
| `disk_full` | พื้นที่ดิสก์ไม่พอ |
| `blocked` | ถูกบล็อกจากแพลตฟอร์ม |

## Heartbeat fields (ตรงกับ `StationAgent` schema)

Agent ส่ง heartbeat เป็นระยะ ฟิลด์ที่ต้องอัปเดต:

| ฟิลด์ Prisma | คำอธิบาย |
|--------------|----------|
| `version` | เวอร์ชัน Agent |
| `lastHeartbeatAt` | เวลา heartbeat ล่าสุด |
| `cpuPercent` | % CPU ที่ใช้ |
| `diskFreeGb` | พื้นที่ดิสก์ว่าง (GB) |
| `queueSize` | จำนวนไฟล์รออัปโหลด |
| `timeDriftMs` | ความคลาดเคลื่อนเวลาเทียบ server (ms) |
| `online` | สถานะออนไลน์ |

### เกณฑ์สุขภาพ (แนะนำ)

- `lastHeartbeatAt` เกิน 5 นาที → ถือว่า stale / offline
- `diskFreeGb` < 20 GB → แจ้งเตือน warning
- `diskFreeGb` < 5 GB → disk_full, ห้ามอัดใหม่
- `timeDriftMs` > 5000 → sync เวลาใหม่
- `queueSize` > 10 → อัปโหลดช้า ตรวจเน็ต

## การทำงาน offline-first

1. **อัด local** — บันทึกไฟล์ลงโฟลเดอร์ tenant/station/order
2. **คิวอัปโหลด** — เพิ่ม `queueSize` เมื่อมีไฟล์รอ
3. **อัปโหลดเมื่อ online** — ลด `queueSize` เมื่อสำเร็จ
4. **อัปเดต Recording** — เปลี่ยน status เป็น `ready` พร้อม `sha256` ต่อไฟล์

## ความสัมพันธ์ schema

```
Tenant → Station → StationAgent (1:1)
Station → Camera (1:N)
Station → Recording (1:N)
```

ทุก record ต้องมี `tenantId` เพื่อ tenant isolation

## Demo / Development

ใน demo ปัจจุบัน การอัดผ่าน Station Console ในเว็บจะจำลอง start/stop ผ่าน API
`/api/t/[tenant]/station/record` โดยไม่ต้องมี Agent จริง

Agent จริงจะพัฒนาแยก (Electron / native) และเชื่อม heartbeat endpoint ในเวอร์ชันถัดไป
