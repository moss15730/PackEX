import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Light gate: require session cookie before hitting protected app shells. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("packex_session")?.value;

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

export const proxyConfig = {
  matcher: ["/t/:path*", "/platform/:path*"],
};
