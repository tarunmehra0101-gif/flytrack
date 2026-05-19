/**
 * Airline logo URL resolver.
 * Primary: pics.avs.io (free, public IATA logo CDN)
 * Fallback: content.airhex.com (free, public)
 */

const PRIMARY_CDN = "https://pics.avs.io/60/60";
const FALLBACK_CDN = "https://content.airhex.com/content/logos/airlines";

/** Returns the primary logo URL, or null if no IATA code provided. */
export function airlineLogoUrl(iata) {
  const code = String(iata || "").trim().toUpperCase();
  if (!code || code.length < 2) return null;
  return `${PRIMARY_CDN}/${code}.png`;
}

/** Returns a fallback logo URL from a secondary CDN. */
export function airlineLogoFallbackUrl(iata) {
  const code = String(iata || "").trim().toUpperCase();
  if (!code || code.length < 2) return null;
  return `${FALLBACK_CDN}_${code}_50_50_s.png`;
}
