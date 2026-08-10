import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth", "/api/health", "/manifest.webmanifest", "/sw.js", "/offline", "/favicon.ico"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath ||
      (publicPath !== "/" && pathname.startsWith(`${publicPath}/`)),
  );

  // allow public paths and static/_next assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/public") ||
    isPublicPath
  ) {
    return NextResponse.next();
  }

  // The console is a separate surface with its own sign-in. Sending an operator
  // to the app's /login would land them in the product, not the console — and
  // /admin/login must stay reachable while signed out or the gate loops.
  const isConsole = pathname === "/admin" || pathname.startsWith("/admin/");
  if (pathname === "/admin/login") return NextResponse.next();

  const cookie = req.cookies.get("sf_session")?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    if (isConsole) {
      url.pathname = "/admin/login";
      url.search = "";
    } else {
      url.pathname = "/login";
      url.search = `next=${encodeURIComponent(pathname)}`;
    }
    return NextResponse.redirect(url);
  }

  // token present — allow. API routes should perform server-side verification where needed.
  return NextResponse.next();
}

export const config = {
  // run middleware for app routes and admin
  matcher: ["/onboarding/:path*", "/dashboard/:path*", "/expenses/:path*", "/bills/:path*", "/goals/:path*", "/investments/:path*", "/analytics/:path*", "/settings/:path*", "/admin/:path*"],
};
