import { NextResponse } from "next/server";

export default async function proxy(request) {
  const { pathname } = new URL(request.url);
  const refreshToken = request.cookies.get("refreshToken");

  const isAuthRoute = pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isPublicFile =
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico";

  if (isApiRoute || isPublicFile) {
    return NextResponse.next();
  }

  let initialized = null;
  let needsBusinessType = false;
  try {
    const headers = { cookie: request.headers.get("cookie") || "" };
    const url = new URL("/api/initial-setup", request.url);

    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      initialized = data?.initialized;
      needsBusinessType = data?.needsBusinessType === true;
    }
  } catch (error) {
    console.error(error);
  }

  if (initialized === false && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (needsBusinessType && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if ((initialized !== false && !needsBusinessType) && isOnboardingRoute) {
    return NextResponse.redirect(
      new URL(refreshToken ? "/" : "/auth", request.url),
    );
  }

  if (!isAuthRoute && !isOnboardingRoute) {
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  let businessType = null;
  let shouldClearBusinessTypeCookie = false;
  try {
    const headers = { cookie: request.headers.get("cookie") || "" };
    const configUrl = new URL("/api/config", request.url);
    const res = await fetch(configUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      const bt = data?.businessType;
      if (bt === "store" || bt === "restaurant") {
        businessType = bt;
      } else {
        shouldClearBusinessTypeCookie = true;
      }
    }
  } catch (error) {
    console.error(error);
  }

  if (businessType) {
    if (pathname.startsWith("/store") && businessType === "restaurant") {
      return NextResponse.redirect(new URL("/restaurant/all-orders", request.url));
    }
    if (pathname.startsWith("/restaurant") && businessType === "store") {
      return NextResponse.redirect(new URL("/store", request.url));
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src-elem 'self' 'nonce-${nonce}';
    style-src-attr 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' ws: wss:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = NextResponse.next({ request: { headers: requestHeaders } });
  next.headers.set("Content-Security-Policy", csp);

  if (businessType) {
    next.headers.set("x-business-type", businessType);
    next.cookies.set("businessType", businessType, { path: "/" });
  } else if (shouldClearBusinessTypeCookie) {
    next.cookies.set("businessType", "", { path: "/", maxAge: 0 });
  }
  return next;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
