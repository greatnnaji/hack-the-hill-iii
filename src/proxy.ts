import { NextResponse, type NextRequest } from "next/server";
import { isDevBypass } from "@/lib/auth";
import { getAuth0, isAuthConfigured } from "@/lib/auth0";

export async function proxy(request: NextRequest) {
  if (!isAuthConfigured()) {
    if (isDevBypass()) return NextResponse.next();
    console.error("Auth0 is not configured");
    return new NextResponse("Auth0 is not configured", { status: 500 });
  }

  const auth0 = getAuth0();
  // Handles /auth/* and keeps the rolling session cookie fresh on every other request.
  const authResponse = await auth0.middleware(request);
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/auth/")) return authResponse;

  const session = await auth0.getSession(request);
  if (session) return authResponse;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/auth/login", request.nextUrl.origin);
  login.searchParams.set("returnTo", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
