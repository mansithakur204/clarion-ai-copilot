import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "clarion_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    let isValidSession = false;
    if (token && token.includes(".")) {
      try {
        const [jsonPayload] = token.split(".");
        const decodedStr = atob(jsonPayload.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(decodedStr);
        if (payload.exp && Date.now() < payload.exp && payload.id) {
          isValidSession = true;
        }
      } catch (err) {
        isValidSession = false;
      }
    }

    if (!isValidSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
