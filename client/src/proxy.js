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

  let setupIncomplete = false;
  let initialized = null;
  let needsBusinessType = false;
  try {
    const headers = { cookie: request.headers.get("cookie") || "" };
    const url = new URL("/api/initial-setup", request.url);

    let evaluated = false;

    const res = await fetch(url, { headers });
    if (res.status === 409) {
      setupIncomplete = false;
      evaluated = true;
    }
    if (res.ok) {
      const data = await res.json();
      initialized = data?.initialized;
      needsBusinessType = data?.needsBusinessType === true;
      setupIncomplete = initialized === false || needsBusinessType;
      evaluated = true;
    }
    
    if (!evaluated) {
      setupIncomplete = false;
    }
  } catch (error) {
    setupIncomplete = false;
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

  if (isAuthRoute && refreshToken) {
    return NextResponse.redirect(new URL("/", request.url));
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
    console.log(error);
  }

  const next = NextResponse.next();
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
