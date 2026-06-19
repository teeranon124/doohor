import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("dormy_admin_token")?.value;
  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Path: ${pathname}, Token present: ${!!token}`);

  // 1. If accessing admin views (except login) without a token, redirect to admin login
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!token) {
      console.log(`[Middleware] Redirecting to /admin/login from ${pathname} due to missing token`);
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // 2. If accessing login page with a valid token, redirect to admin dashboard
  if (pathname.startsWith("/admin/login") && token) {
    console.log(`[Middleware] Redirecting to /admin/dashboard from login page since token is present`);
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all admin routes
  matcher: ["/admin/:path*"],
};
