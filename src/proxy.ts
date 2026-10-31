import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and PWA files: they must load without a session (offline page, install).
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|txt)$).*)",
  ],
};
