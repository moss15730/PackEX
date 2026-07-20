import { google } from "googleapis";
import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";

export type DriveUploadResult = {
  fileId: string;
  webViewLink: string | null;
  webContentLink: string | null;
  storagePath: string;
  sha256: string;
  sizeBytes: number;
  previewUrl: string | null;
  driveError?: string | null;
};

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!email || !privateKey || !folderId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return { auth, folderId };
}

export function isDriveConfigured() {
  return Boolean(getAuth());
}

export function getStorageRoot() {
  return process.env.PACKEX_STORAGE_DIR || path.join(process.cwd(), "storage");
}

export function localPathFromStorage(storagePath: string): string | null {
  if (!storagePath.startsWith("local:")) return null;
  const relative = storagePath.slice("local:".length);
  const root = getStorageRoot();
  const full = path.resolve(root, relative);
  if (!full.startsWith(path.resolve(root))) return null;
  return full;
}

export function driveIdFromStorage(storagePath: string): string | null {
  if (!storagePath.startsWith("gdrive:")) return null;
  return storagePath.slice("gdrive:".length);
}

export function drivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

async function saveLocalCopy(opts: {
  tenantId: string;
  recordingId: string;
  filename: string;
  buffer: Buffer;
}) {
  const relative = path.join(opts.tenantId, opts.recordingId, opts.filename);
  const full = path.join(getStorageRoot(), relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, opts.buffer);
  return {
    relative: relative.replace(/\\/g, "/"),
    full,
  };
}

export async function uploadToGoogleDrive(opts: {
  tenantId: string;
  recordingId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<DriveUploadResult> {
  const sha256 = createHash("sha256").update(opts.buffer).digest("hex");
  const cfg = getAuth();

  // Always keep a local copy so the Videos page can play immediately
  const local = await saveLocalCopy(opts);
  const localStoragePath = `local:${local.relative}`;

  if (!cfg) {
    return {
      fileId: `local-${randomUUID()}`,
      webViewLink: null,
      webContentLink: null,
      storagePath: localStoragePath,
      sha256,
      sizeBytes: opts.buffer.length,
      previewUrl: null,
      driveError: "ยังไม่ได้ตั้งค่า Google Drive",
    };
  }

  try {
    const drive = google.drive({ version: "v3", auth: cfg.auth });
    const name = `${opts.tenantId}/${opts.recordingId}/${opts.filename}`;

    const created = await drive.files.create({
      requestBody: {
        name,
        parents: [cfg.folderId],
        appProperties: {
          tenantId: opts.tenantId,
          recordingId: opts.recordingId,
          sha256,
        },
      },
      media: {
        mimeType: opts.mimeType,
        body: Readable.from(opts.buffer),
      },
      fields: "id, webViewLink, webContentLink, size",
      supportsAllDrives: true,
    });

    const fileId = created.data.id!;

    // Allow anyone with the link to view (needed for in-app preview)
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
        supportsAllDrives: true,
      });
    } catch {
      // Folder-level sharing may already cover this
    }

    const meta = await drive.files.get({
      fileId,
      fields: "webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    return {
      fileId,
      webViewLink: meta.data.webViewLink ?? created.data.webViewLink ?? null,
      webContentLink: meta.data.webContentLink ?? created.data.webContentLink ?? null,
      storagePath: `gdrive:${fileId}`,
      sha256,
      sizeBytes: Number(created.data.size ?? opts.buffer.length),
      previewUrl: drivePreviewUrl(fileId),
      driveError: null,
    };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : "อัปโหลด Google Drive ไม่สำเร็จ";
    console.error("[drive] upload failed, keeping local copy only", message);
    const hint = message.includes("storage quota")
      ? "Service Account ไม่มีโควต้า My Drive — ต้องใช้ Shared Drive (Team Drive) แล้วแชร์โฟลเดอร์ให้ service account"
      : message;
    return {
      fileId: `local-${randomUUID()}`,
      webViewLink: null,
      webContentLink: null,
      storagePath: localStoragePath,
      sha256,
      sizeBytes: opts.buffer.length,
      previewUrl: null,
      driveError: hint,
    };
  }
}

export async function getDriveViewLink(storagePath: string): Promise<string | null> {
  const fileId = driveIdFromStorage(storagePath);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
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

/** Resolve a playable URL for the videos UI (relative app path or Drive preview). */
export function getPlaybackInfo(
  storagePath: string,
  opts: { tenantSlug: string; fileId: string },
): { kind: "local" | "drive" | "none"; src: string | null } {
  if (storagePath.startsWith("local:")) {
    return {
      kind: "local",
      src: `/api/t/${opts.tenantSlug}/media/${opts.fileId}`,
    };
  }
  const driveId = driveIdFromStorage(storagePath);
  if (driveId) {
    return {
      kind: "drive",
      src: drivePreviewUrl(driveId),
    };
  }
  return { kind: "none", src: null };
}
