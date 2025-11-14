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
 * Uses unavatar.io service to fetch X/Twitter profile pictures
 * This service provides a reliable way to get profile pictures without API authentication
 */
export function getXAvatarUrl(username: string): string {
  // Remove @ if present
  const cleanUsername = username.replace(/^@/, "");
  
  // Use unavatar.io service to fetch X profile pictures
  // This service works by scraping public profile data
  // Format: https://unavatar.io/twitter/{username}
  return `https://unavatar.io/twitter/${cleanUsername}?fallback=false`;
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

