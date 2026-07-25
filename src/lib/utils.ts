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
    idle: "พร้อมใช้",
    disabled: "ปิดการใช้งาน",
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
    deleted: "ลบแล้ว",
    canceled: "ยกเลิก",
    archived: "เก็บถาวร",
  };
  return map[status] ?? status;
}

export type StatusTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "rec";

/** Single source of truth for status colour across tables, cards and badges. */
export function statusTone(status: string): StatusTone {
  const map: Record<string, StatusTone> = {
    ready: "success",
    active: "success",
    idle: "success",
    packed: "success",
    closed: "neutral",
    archived: "neutral",
    disabled: "neutral",
    deleted: "neutral",
    canceled: "neutral",
    pending: "info",
    packing: "info",
    reviewing: "info",
    open: "info",
    trial: "info",
    syncing: "info",
    uploading: "info",
    recording: "rec",
    warning: "warning",
    claimed: "warning",
    suspended: "warning",
    offline: "danger",
    blocked: "danger",
    disk_full: "danger",
    camera_error: "danger",
  };
  return map[status] ?? "neutral";
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
