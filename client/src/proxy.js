import { NextResponse } from "next/server";

const INTERNAL_ORIGIN =
  process.env.INTERNAL_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3000}`;

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
    const initialSetupUrl = new URL("/api/initial-setup", INTERNAL_ORIGIN);

    const setupResponse = await fetch(initialSetupUrl, { headers });
    if (setupResponse.ok) {
      const setupData = await setupResponse.json();
      initialized = setupData?.initialized;
      needsBusinessType = setupData?.needsBusinessType === true;
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
    const configurationUrl = new URL("/api/config", INTERNAL_ORIGIN);
    const configResponse = await fetch(configurationUrl, { headers });
    if (configResponse.ok) {
      const configData = await configResponse.json();
      const fetchedBusinessType = configData?.businessType;
      if (fetchedBusinessType === "store" || fetchedBusinessType === "restaurant") {
        businessType = fetchedBusinessType;
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
  const isDevelopment = process.env.NODE_ENV === "development";

  const contentSecurityPolicy = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""};
    style-src-elem 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    style-src-attr 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' ws: wss: https://api.coingecko.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const nextResponse = NextResponse.next({ request: { headers: requestHeaders } });
  nextResponse.headers.set("Content-Security-Policy", contentSecurityPolicy);

  if (businessType) {
    nextResponse.headers.set("x-business-type", businessType);
    nextResponse.cookies.set("businessType", businessType, { path: "/" });
  } else if (shouldClearBusinessTypeCookie) {
    nextResponse.cookies.set("businessType", "", { path: "/", maxAge: 0 });
  }
  return nextResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
