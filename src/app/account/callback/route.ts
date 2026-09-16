import { cookies } from "next/headers";
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

  const jar = await cookies();
  const initiator = jar.get("pb_linking")?.value;
  const wasLinking = Boolean(initiator);
  if (wasLinking) jar.delete("pb_linking");

  // The provider refused, most often because the identity already belongs to
  // another account. Pass the reason through rather than dropping it.
  const failed = searchParams.get("error_description") ?? searchParams.get("error");
  if (failed) {
    const where = wasLinking ? "/account" : "/account/sign-in";
    return NextResponse.redirect(
      `${origin}${where}?error=refused&why=${encodeURIComponent(failed)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/account/sign-in?error=link`);
  }

  const supabase = await authClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const where = wasLinking ? "/account" : "/account/sign-in";
    return NextResponse.redirect(
      `${origin}${where}?error=refused&why=${encodeURIComponent(error.message)}`,
    );
  }

  // A link that came back as a different account did not link anything: it
  // signed in as somebody new. Undo it rather than leaving the person looking
  // at an empty home page wondering where their boards went.
  if (initiator && data.user && data.user.id !== initiator) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/account/sign-in?error=separate`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
