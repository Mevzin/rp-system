import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const DASHBOARD_ENTRY = "/dashboard";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = !!req.cookies.get("access_token")?.value;

  if (pathname.startsWith("/_next") || pathname.startsWith("/__next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();
  if (pathname.startsWith("/api")) return NextResponse.next();
  if (/\.(svg|png|jpg|jpeg|gif|webp|avif|ico|bmp|woff2?|ttf)$/i.test(pathname))
    return NextResponse.next();

  if (pathname === LOGIN_PATH || pathname.startsWith("/login")) {
    if (hasToken) {
      const redirect = req.nextUrl.clone();
      redirect.pathname = DASHBOARD_ENTRY;
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (hasToken) {
      const redirect = req.nextUrl.clone();
      redirect.pathname = DASHBOARD_ENTRY;
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
    const redirect = req.nextUrl.clone();
    redirect.pathname = LOGIN_PATH;
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  // Any other route → check cookie
  if (!hasToken) {
    const redirect = req.nextUrl.clone();
    redirect.pathname = LOGIN_PATH;
    const orig = pathname + req.nextUrl.search;
    if (orig && orig !== LOGIN_PATH) {
      redirect.searchParams.set("redirect", orig);
    } else {
      redirect.search = "";
    }
    return NextResponse.redirect(redirect);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
