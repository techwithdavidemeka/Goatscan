import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/signup";

  // Handle OAuth errors from the provider
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/signup?error=auth_failed&message=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError);
      return NextResponse.redirect(
        new URL(`/signup?error=auth_failed&message=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }
  } else {
    // No code parameter - redirect to signup with error
    console.error("No authorization code received");
    return NextResponse.redirect(new URL(`/signup?error=no_code`, requestUrl.origin));
  }

  // Redirect to signup page to complete profile
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

