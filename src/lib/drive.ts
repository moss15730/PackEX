import { google } from "googleapis";
import { createHash, randomUUID } from "crypto";
import { Readable } from "stream";

export type DriveUploadResult = {
  fileId: string;
  webViewLink: string | null;
  webContentLink: string | null;
  storagePath: string;
  sha256: string;
  sizeBytes: number;
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
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return { auth, folderId };
}

export function isDriveConfigured() {
  return Boolean(getAuth());
}

export async function uploadToGoogleDrive(opts: {
  tenantId: string;
  recordingId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<DriveUploadResult> {
  const cfg = getAuth();
  const sha256 = createHash("sha256").update(opts.buffer).digest("hex");

  if (!cfg) {
    // Local/dev fallback when Drive is not configured yet
    const fakeId = `local-${randomUUID()}`;
    return {
      fileId: fakeId,
      webViewLink: null,
      webContentLink: null,
      storagePath: `drive:pending/${opts.tenantId}/${opts.recordingId}/${opts.filename}`,
      sha256,
      sizeBytes: opts.buffer.length,
    };
  }

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
  return {
    fileId,
    webViewLink: created.data.webViewLink ?? null,
    webContentLink: created.data.webContentLink ?? null,
    storagePath: `gdrive:${fileId}`,
    sha256,
    sizeBytes: Number(created.data.size ?? opts.buffer.length),
  };
}

export async function getDriveViewLink(storagePath: string): Promise<string | null> {
  if (!storagePath.startsWith("gdrive:")) return null;
  const fileId = storagePath.replace("gdrive:", "");
  const cfg = getAuth();
  if (!cfg) return `https://drive.google.com/file/d/${fileId}/view`;

  const drive = google.drive({ version: "v3", auth: cfg.auth });
  const file = await drive.files.get({
    fileId,
    fields: "webViewLink, webContentLink",
    supportsAllDrives: true,
  });
  return file.data.webViewLink ?? file.data.webContentLink ?? null;
}
