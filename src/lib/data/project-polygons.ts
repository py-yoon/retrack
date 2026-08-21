export type Coord = { lat: number; lng: number };

/**
 * Verified redevelopment/reconstruction district boundary polygons, keyed by
 * project id / code / name. Populate only with coordinates traced from an
 * authoritative source (e.g. 서울시 정비구역 지정 고시 도면, VWorld 지적편집도) —
 * never with estimated or hand-drawn shapes. Empty until such data is sourced;
 * getProjectPolygon correctly returns null with no entries, so callers already
 * fall back to a plain marker.
 */
export const VERIFIED_REAL_POLYGONS: Record<string, Coord[]> = {};

/**
 * Returns exact verified real polygon coordinates if registered.
 * Supports matching by project ID, project Code, or normalized Project Name.
 * Returns null if no verified boundary data is available. (가상 추정 폴리곤 배제)
 */
export function getProjectPolygon(
  projectId: string,
  centerLat?: number,
  centerLng?: number
): Coord[] | null {
  if (VERIFIED_REAL_POLYGONS[projectId]) {
    return VERIFIED_REAL_POLYGONS[projectId];
  }

  // Name / keyword matching for major projects
  const norm = projectId.replaceAll(/\s+/g, "").toLowerCase();
  for (const [key, coords] of Object.entries(VERIFIED_REAL_POLYGONS)) {
    if (norm.includes(key.toLowerCase()) || key.toLowerCase().includes(norm)) {
      return coords;
    }
  }

  return null;
}
