/**
 * Utility functions for X (Twitter) profile integration
 */

/**
 * Get X profile URL from username
 */
export function getXProfileUrl(username: string): string {
  // Remove @ if present
  const cleanUsername = username.replace(/^@/, "");
  return `https://x.com/${cleanUsername}`;
}

/**
 * Get X profile picture URL
 * Note: Twitter/X doesn't provide a public API for profile pictures without authentication
 * This uses a workaround that may not always work due to CORS/rate limiting
 * For production, consider using Twitter API v2 with proper authentication
 */
export function getXAvatarUrl(username: string): string | null {
  // Remove @ if present
  const cleanUsername = username.replace(/^@/, "");
  
  // Option 1: Try using Twitter's CDN (may not work due to CORS)
  // This is a known workaround but may be blocked
  // return `https://unavatar.io/twitter/${cleanUsername}`;
  
  // Option 2: Use a service like unavatar.io or similar
  // return `https://unavatar.io/twitter/${cleanUsername}?fallback=false`;
  
  // Option 3: For now, return null and use default avatar
  // In production, you'd want to:
  // 1. Store avatar URLs in your database when users sign up
  // 2. Use Twitter API v2 to fetch avatars server-side
  // 3. Use a service like unavatar.io or similar
  
  return null;
}

/**
 * Get default avatar URL or generate a gradient avatar
 */
export function getDefaultAvatarUrl(username: string): string {
  // Generate a consistent gradient based on username
  const hash = username.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Use hash to generate consistent colors
  const hue = Math.abs(hash) % 360;
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue}, 70%, 50%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${hue + 60}, 70%, 50%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad)"/>
      <text x="50" y="50" font-family="Arial" font-size="40" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">
        ${username.charAt(0).toUpperCase()}
      </text>
    </svg>
  `)}`;
}

