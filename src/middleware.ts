import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { supabaseConfigured } from "@/lib/supabase/env";

const AUTH_PAGES = ["/prisijungimas", "/registracija", "/pamirsau-slaptazodi"];
// /api/notifications/dispatch neturi naudotojo sesijos (kviečia Supabase webhook); jį saugo CRON_SECRET pačiame maršrute.
const PUBLIC = [...AUTH_PAGES, "/auth", "/privatumas", "/nesukonfiguruota", "/api/notifications/dispatch", "/api/cars/reminders", "/api/telegram/webhook"];

const matches = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + "/"));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!supabaseConfigured) {
    if (pathname === "/nesukonfiguruota") return NextResponse.next();
    return NextResponse.redirect(new URL("/nesukonfiguruota", request.url));
  }

  const { response, user } = await updateSession(request);

  const redirectTo = (path: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search ? "?" + new URLSearchParams(search).toString() : "";
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (user && pathname === "/") return redirectTo("/darbai");
  if (!user && pathname !== "/" && !matches(pathname, PUBLIC)) {
    return redirectTo("/prisijungimas", { next: pathname + request.nextUrl.search });
  }
  if (user && matches(pathname, AUTH_PAGES)) return redirectTo("/darbai");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|mp4|webm)$).*)"],
};
