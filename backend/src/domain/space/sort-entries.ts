import type { OptInEntry } from "./space.types.js";

// Mirrors the reference prototype's own sort exactly (house number, then the
// full label alphabetically) - a shared list sorted any other way would be
// harder to scan house-by-house when printed for door-to-door use.
function leadingNumber(label: string | null): number {
  const match = label?.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
}

export function sortEntriesByAddress(entries: OptInEntry[]): OptInEntry[] {
  return [...entries].sort((a, b) => {
    const byNumber = leadingNumber(a.addressLabel) - leadingNumber(b.addressLabel);
    if (byNumber !== 0) return byNumber;
    return (a.addressLabel ?? "").localeCompare(b.addressLabel ?? "");
  });
}
