import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/auth";

/**
 * Where email links land.
 *
 * Supabase sends a one time code; trading it for a session writes auth
 * cookies, which a Server Component is not allowed to do. A route handler
 * can, so links come here first and are then forwarded on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Only ever redirect within this site, never to a URL from the query.
  const destination = next.startsWith("/") ? next : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/account/sign-in?error=link`);
  }

  const supabase = await authClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/account/sign-in?error=link`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
