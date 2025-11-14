import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization for client-side usage
let supabaseClient: SupabaseClient | null = null;

// Function to get or create the Supabase client
// This allows the module to be imported during build without throwing errors
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_URL, see .env.example and create .env.local'
    )
  }

  if (!supabaseKey) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY, see .env.example and create .env.local'
    )
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey)
  return supabaseClient
}

// Export a getter function for server-side usage in API routes
// This creates the client on-demand, avoiding build-time errors
export function getSupabaseServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Create a proxy object that lazily creates the client only when accessed
// This prevents any client creation during module evaluation (build time)
const supabaseProxy = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    // Only create the real client when a property is accessed at runtime
    const client = getSupabaseClient()
    const value = (client as any)[prop]
    // If it's a function, bind it to the client to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(client)
    }
    // If it's an object (like 'from'), return a proxy for that too
    if (value && typeof value === 'object') {
      return value
    }
    return value
  }
})

// Export client for client-side components (lazy loaded via Proxy)
// The Proxy defers client creation until first property access at runtime
// This prevents build-time errors when env vars aren't available
export const supabase = supabaseProxy

