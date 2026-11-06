import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PREFIXES = ["/", "/api", "/login", "/signup", "/forgot-password", "/auth", "/guides", "/library", "/services", "/offline", "/about", "/invite", "/setup"];

function isPublic(path: string) {
  if (path === "/") return true;
  return PUBLIC_PREFIXES.some((p) => p !== "/" && (path === p || path.startsWith(p + "/")));
}

// Optimistic session refresh + redirect. Real authorization happens server-side and in RLS.
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!isSupabaseConfigured) {
    if (isPublic(path)) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && !isPublic(path)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:png|svg|jpg|webp|ico)$).*)"],
};
