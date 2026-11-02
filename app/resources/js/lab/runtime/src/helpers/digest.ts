// Krikkit Lab cache-key digest (DJB2).

// DJB2 hash for cache keys
export function quickDigest(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}
