import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    idle: "ว่าง",
    recording: "กำลังอัด",
    uploading: "กำลังอัปโหลด",
    syncing: "กำลังซิงก์",
    ready: "พร้อมใช้",
    warning: "ต้องตรวจ",
    offline: "ออฟไลน์",
    camera_error: "กล้องมีปัญหา",
    disk_full: "ดิสก์เต็ม",
    blocked: "ถูกบล็อก",
    trial: "ทดลองใช้",
    active: "ใช้งาน",
    suspended: "ระงับ",
    open: "เปิด",
    reviewing: "กำลังตรวจ",
    closed: "ปิดแล้ว",
    packed: "แพ็คแล้ว",
    claimed: "มีเคลม",
    pending: "รอดำเนินการ",
    packing: "กำลังแพ็ค",
  };
  return map[status] ?? status;
}

export function roleLabel(role: string) {
  const map: Record<string, string> = {
    tenant_admin: "Tenant Admin",
    supervisor: "Supervisor",
    packer: "Packer",
    viewer: "Viewer",
    claim_officer: "Claim Officer",
    super_admin: "Platform Super Admin",
    support: "Platform Support",
  };
  return map[role] ?? role;
}
