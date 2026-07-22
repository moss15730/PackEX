import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function shareSecret() {
  const value = process.env.AUTH_SECRET;
  return new TextEncoder().encode(value || "packex-dev-secret-change-in-production");
}

export function shareUnlockCookieName(token: string) {
  return `packex_share_${token.slice(0, 16)}`;
}

export async function createShareUnlockToken(token: string) {
  return new SignJWT({ purpose: "share_unlock", token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(shareSecret());
}

export async function hasValidShareUnlock(shareToken: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(shareUnlockCookieName(shareToken))?.value;
  if (!raw) return false;
  try {
    const { payload } = await jwtVerify(raw, shareSecret());
    return payload.purpose === "share_unlock" && payload.token === shareToken;
  } catch {
    return false;
  }
}
