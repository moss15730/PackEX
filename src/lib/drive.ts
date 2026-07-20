/** @deprecated Use `@/lib/storage` — kept for temporary import compatibility. */
export {
  uploadRecordingFile as uploadToGoogleDrive,
  uploadRecordingFile,
  isStorageConfigured as isDriveConfigured,
  isStorageConfigured,
  createSignedUrl as getDriveViewLink,
  createSignedUrl,
  resolvePlaybackUrl,
  localPathFromStorage,
  supabaseRefFromStorage,
  getStorageRoot,
  getStorageBucket,
  ensureRecordingsBucket,
  type UploadResult as DriveUploadResult,
  type UploadResult,
} from "./storage";
