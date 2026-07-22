/** `stationAccess` is `*` / null (all) or comma-separated station ids. */
export function canAccessStation(
  stationAccess: string | null | undefined,
  stationId: string,
) {
  if (!stationAccess || stationAccess === "*") return true;
  return stationAccess
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(stationId);
}

export async function assertUserStationAccess(
  user: { stationAccess: string | null },
  stationId: string,
) {
  return canAccessStation(user.stationAccess, stationId);
}
