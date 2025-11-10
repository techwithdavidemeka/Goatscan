import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  
  // Get the redirect path from query parameter, default to /signup
  let next = requestUrl.searchParams.get("next") ?? "/signup";
  
  // Ensure the redirect path is safe (starts with / and doesn't contain dangerous characters)
  if (!next.startsWith("/")) {
    next = "/signup";
  }

  // Handle OAuth errors from the provider
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    // Redirect back to the original page with error, or signup if no next param
    const errorUrl = new URL(next, requestUrl.origin);
    errorUrl.searchParams.set("error", "auth_failed");
    if (errorDescription) {
      errorUrl.searchParams.set("message", errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { error: exchangeError, data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError);
      // Redirect back to the original page with error
      const errorUrl = new URL(next, requestUrl.origin);
      errorUrl.searchParams.set("error", "auth_failed");
      errorUrl.searchParams.set("message", exchangeError.message);
      return NextResponse.redirect(errorUrl);
    }

    // Session was successfully created - cookies are set by the route handler client
    // The session will persist automatically via cookies
    
    // Redirect to the original page (or signup if no next param)
    // The page will reload and detect the session
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } else {
    // No code parameter - redirect to signup with error
    console.error("No authorization code received");
    const errorUrl = new URL(next, requestUrl.origin);
    errorUrl.searchParams.set("error", "no_code");
    return NextResponse.redirect(errorUrl);
  }
}

