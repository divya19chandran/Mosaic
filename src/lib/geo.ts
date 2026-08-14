/**
 * Small, dependency-free helper for the Discover panel's "Sort by distance"
 * feature. Straight-line (great-circle) distance only — good enough for
 * "which of these is closer to me," not turn-by-turn routing.
 */

export interface Coords {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MI = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in miles. */
export function distanceMiles(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_MI * c;
}

/** "0.4 mi away" / "12 mi away" — one decimal under 10mi, whole number above. */
export function formatDistance(miles: number): string {
  const rounded = miles < 10 ? Math.round(miles * 10) / 10 : Math.round(miles);
  return `${rounded} mi away`;
}
