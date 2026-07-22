export const PERMISSIONS = {
  "recording.start": ["tenant_admin", "supervisor", "packer"],
  "recording.stop": ["tenant_admin", "supervisor", "packer"],
  "video.view": ["tenant_admin", "supervisor", "packer", "viewer", "claim_officer"],
  "video.download": ["tenant_admin", "supervisor", "claim_officer"],
  "video.share": ["tenant_admin", "supervisor", "claim_officer"],
  "video.delete": ["tenant_admin", "supervisor"],
  "employees.manage": ["tenant_admin"],
  "stations.manage": ["tenant_admin", "supervisor"],
  "billing.view": ["tenant_admin"],
  "claims.manage": ["tenant_admin", "supervisor", "claim_officer"],
  "claim_reasons.manage": ["tenant_admin", "supervisor"],
  "audit.view": ["tenant_admin", "supervisor"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string, permission: Permission) {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}
