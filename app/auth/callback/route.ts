import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  
  // Get the redirect path from query parameter
  // Supabase might pass it in the state or we might need to get it from the OAuth flow
  // Try multiple sources for the redirect path
  let next = requestUrl.searchParams.get("next") 
    ?? requestUrl.searchParams.get("redirect_to")
    ?? "/signup";
  
  // Ensure the redirect path is safe (starts with / and doesn't contain dangerous characters)
  if (!next.startsWith("/")) {
    next = "/signup";
  }

  // Log the full URL for debugging
  console.log("OAuth callback received:", {
    url: requestUrl.toString(),
    hasCode: !!code,
    hasError: !!error,
    next: next,
  });

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
    try {
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
      console.log("Session created successfully, redirecting to:", next);
      
      // Redirect to the original page (or signup if no next param)
      // The page will reload and detect the session
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (err) {
      console.error("Unexpected error in callback:", err);
      const errorUrl = new URL(next, requestUrl.origin);
      errorUrl.searchParams.set("error", "auth_failed");
      errorUrl.searchParams.set("message", "An unexpected error occurred");
      return NextResponse.redirect(errorUrl);
    }
  } else {
    // No code parameter - this might happen if:
    // 1. User cancelled the OAuth flow
    // 2. Redirect URL mismatch in Supabase settings
    // 3. OAuth provider didn't redirect properly
    console.error("No authorization code received. Full URL:", requestUrl.toString());
    console.error("Query params:", Object.fromEntries(requestUrl.searchParams));
    
    // Check if this might be a direct visit (not from OAuth)
    // In that case, just redirect to signup without error
    const isDirectVisit = !requestUrl.searchParams.has("error") && 
                          !requestUrl.searchParams.has("code") &&
                          !requestUrl.searchParams.has("state");
    
    if (isDirectVisit) {
      // Direct visit to callback - just redirect to signup
      return NextResponse.redirect(new URL("/signup", requestUrl.origin));
    }
    
    // OAuth flow but no code - show error
    const errorUrl = new URL(next, requestUrl.origin);
    errorUrl.searchParams.set("error", "no_code");
    errorUrl.searchParams.set("message", "The OAuth flow did not complete. Please try again.");
    return NextResponse.redirect(errorUrl);
  }
}

