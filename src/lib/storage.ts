import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";

export type UploadResult = {
  fileId: string;
  storagePath: string;
  sha256: string;
  sizeBytes: number;
  publicUrl: string | null;
  previewUrl: string | null;
  storageError?: string | null;
};

const DEFAULT_BUCKET = "recordings";

export function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

export function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isStorageConfigured() {
  return Boolean(getSupabaseAdmin());
}

export function isServerlessRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function getStorageRoot() {
  if (process.env.PACKEX_STORAGE_DIR) return process.env.PACKEX_STORAGE_DIR;
  // Vercel/Lambda filesystem is read-only except /tmp
  if (isServerlessRuntime()) return path.join(os.tmpdir(), "packex-storage");
  return path.join(process.cwd(), "storage");
}

export function localPathFromStorage(storagePath: string): string | null {
  if (!storagePath.startsWith("local:")) return null;
  const relative = storagePath.slice("local:".length);
  const root = getStorageRoot();
  const full = path.resolve(root, relative);
  if (!full.startsWith(path.resolve(root))) return null;
  return full;
}

/** Parse `supabase:bucket/path/to/file` */
export function supabaseRefFromStorage(
  storagePath: string,
): { bucket: string; objectPath: string } | null {
  if (!storagePath.startsWith("supabase:")) return null;
  const rest = storagePath.slice("supabase:".length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  return {
    bucket: rest.slice(0, slash),
    objectPath: rest.slice(slash + 1),
  };
}

async function saveLocalCopy(opts: {
  tenantId: string;
  recordingId: string;
  filename: string;
  buffer: Buffer;
}): Promise<{ relative: string; full: string } | null> {
  try {
    const relative = path.join(opts.tenantId, opts.recordingId, opts.filename);
    const full = path.join(getStorageRoot(), relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, opts.buffer);
    return {
      relative: relative.replace(/\\/g, "/"),
      full,
    };
  } catch (err) {
    console.warn("[storage] local copy skipped:", err);
    return null;
  }
}

export async function ensureRecordingsBucket(client?: SupabaseClient) {
  const supabase = client ?? getSupabaseAdmin();
  if (!supabase) throw new Error("Storage ยังไม่ถูกตั้งค่า");

  const bucket = getStorageBucket();
  // Free plan global max is 50MB; Pro can raise Storage Settings → Global file size
  const fileSizeLimit = Number(process.env.SUPABASE_FILE_SIZE_LIMIT || 50 * 1024 * 1024);

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets?.some((b) => b.name === bucket);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit,
      allowedMimeTypes: null,
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  } else {
    const { error } = await supabase.storage.updateBucket(bucket, {
      public: false,
      fileSizeLimit,
      allowedMimeTypes: null,
    });
    if (error) {
      console.warn("[storage] updateBucket fileSizeLimit failed:", error.message);
    }
  }

  return bucket;
}

export function buildObjectPath(opts: {
  tenantId: string;
  recordingId: string;
  filename: string;
}) {
  return `${opts.tenantId}/${opts.recordingId}/${sanitizeStorageFilename(opts.filename)}`;
}

/** Supabase Storage keys must be ASCII — strip Thai/unicode from object filenames. */
export function sanitizeStorageFilename(name: string) {
  const trimmed = name.trim() || "camera";
  const parts = trimmed.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = parts.join(".").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const safeBase = base.slice(0, 80) || "camera";
  return ext ? `${safeBase}.${ext}` : safeBase;
}

/** Create a short-lived signed URL so the browser can upload directly (bypasses Vercel 4.5MB body limit). */
export async function createSignedUpload(opts: {
  tenantId: string;
  recordingId: string;
  filename: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Storage (ต้องมี NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY บน Vercel)",
    );
  }

  const bucket = await ensureRecordingsBucket(supabase);
  const objectPath = buildObjectPath(opts);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath, { upsert: true });

  if (error || !data) {
    throw new Error(error?.message || "สร้าง signed upload URL ไม่สำเร็จ");
  }

  return {
    bucket,
    objectPath,
    storagePath: `supabase:${bucket}/${objectPath}`,
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

export async function uploadRecordingFile(opts: {
  tenantId: string;
  recordingId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<UploadResult> {
  const sha256 = createHash("sha256").update(opts.buffer).digest("hex");
  const local = await saveLocalCopy(opts);
  const localStoragePath = local ? `local:${local.relative}` : `local:unavailable/${opts.recordingId}/${opts.filename}`;
  const objectPath = buildObjectPath(opts);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (!local) {
      return {
        fileId: `local-${randomUUID()}`,
        storagePath: localStoragePath,
        sha256,
        sizeBytes: opts.buffer.length,
        publicUrl: null,
        previewUrl: null,
        storageError:
          "ยังไม่ได้ตั้งค่า Storage และเซิร์ฟเวอร์นี้เขียนไฟล์ลงดิสก์ไม่ได้ (ตั้ง NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY บน Vercel)",
      };
    }
    return {
      fileId: `local-${randomUUID()}`,
      storagePath: localStoragePath,
      sha256,
      sizeBytes: opts.buffer.length,
      publicUrl: null,
      previewUrl: null,
      storageError:
        "ยังไม่ได้ตั้งค่า Storage (ต้องมี NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)",
    };
  }

  try {
    const bucket = await ensureRecordingsBucket(supabase);

    const { error } = await supabase.storage.from(bucket).upload(objectPath, opts.buffer, {
      contentType: opts.mimeType,
      upsert: true,
    });

    if (error) throw error;

    const storagePath = `supabase:${bucket}/${objectPath}`;
    const signed = await createSignedUrl(storagePath, 60 * 60);

    return {
      fileId: objectPath,
      storagePath,
      sha256,
      sizeBytes: opts.buffer.length,
      publicUrl: signed,
      previewUrl: signed,
      storageError: null,
    };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : "อัปโหลด Storage ไม่สำเร็จ";
    console.error("[storage] supabase upload failed", message);

    let hint = message;
    if (/exceeded the maximum allowed size|Payload too large|entity too large/i.test(message)) {
      hint =
        "ไฟล์ใหญ่เกินขีดจำกัด Storage (แผน Free สูงสุด ~50MB/ไฟล์) — อัดสั้นลง หรือไป Supabase → Storage → Settings เพิ่ม Global file size limit";
    }

    // On serverless without a durable local copy, treat as hard failure
    if (!local && isServerlessRuntime()) {
      throw new Error(hint);
    }

    return {
      fileId: `local-${randomUUID()}`,
      storagePath: localStoragePath,
      sha256,
      sizeBytes: opts.buffer.length,
      publicUrl: null,
      previewUrl: null,
      storageError: hint,
    };
  }
}

export async function createSignedUrl(
  storagePath: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const ref = supabaseRefFromStorage(storagePath);
  if (!ref) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.objectPath, expiresInSec);

  if (error) {
    console.error("[storage] signed url failed", error.message);
    return null;
  }
  return data.signedUrl;
}

export async function readLocalMedia(storagePath: string): Promise<Buffer | null> {
  const full = localPathFromStorage(storagePath);
  if (!full) return null;
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

export async function resolvePlaybackUrl(opts: {
  storagePath: string;
  thumbnailPath?: string | null;
  tenantSlug: string;
  fileId: string;
}): Promise<{ kind: "supabase" | "local" | "drive" | "none"; src: string | null }> {
  if (opts.storagePath.startsWith("supabase:")) {
    const signed = await createSignedUrl(opts.storagePath, 60 * 60);
    if (signed) return { kind: "supabase", src: signed };
  }

  if (opts.storagePath.startsWith("gdrive:")) {
    const id = opts.storagePath.slice("gdrive:".length);
    return {
      kind: "drive",
      src: `https://drive.google.com/file/d/${id}/preview`,
    };
  }

  const candidates = [opts.thumbnailPath, opts.storagePath].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const full = localPathFromStorage(candidate);
    if (full && existsSync(full)) {
      return {
        kind: "local",
        src: `/api/t/${opts.tenantSlug}/media/${opts.fileId}`,
      };
    }
  }

  return { kind: "none", src: null };
}

export const isDriveConfigured = isStorageConfigured;
export const uploadToGoogleDrive = uploadRecordingFile;
export async function getDriveViewLink(storagePath: string) {
  return createSignedUrl(storagePath, 60 * 60);
}
