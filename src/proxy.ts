import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Share tokens are `randomBytes(24).toString("base64url")` — always 32 url-safe chars. */
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/**
 * Light gate in front of the app shells.
 *
 * Session cookies are only checked for presence here; every route still
 * verifies and decodes the JWT server-side before returning data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("packex_session")?.value;

  // Malformed evidence links get a real 404 before rendering starts.
  // (Once a dynamic page begins streaming, Next can no longer change the status.)
  if (pathname.startsWith("/share/")) {
    const token = pathname.slice("/share/".length).split("/")[0] ?? "";
    if (!SHARE_TOKEN_PATTERN.test(token)) {
      return NextResponse.rewrite(new URL("/share-invalid", request.url), { status: 404 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/t/") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/platform") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "platform=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Must be named `config` — Next only reads the matcher from this export.
 * Without it the proxy would run for every static asset request too.
 */
export const config = {
  matcher: ["/t/:path*", "/platform/:path*", "/share/:path*"],
};
