export type Coord = { lat: number; lng: number };

// Specific polygon boundaries for major redevelopment / reconstruction projects in Seoul
export const PRESET_PROJECT_POLYGONS: Record<string, Coord[]> = {
  // 마포로1-24도시환경정비지구 (서울 마포구 도화동 일대)
  "cb005e1e-cad8-4c15-bd80-e6ce42a7a400": [
    { lat: 37.53982, lng: 126.94635 },
    { lat: 37.54015, lng: 126.94720 },
    { lat: 37.53995, lng: 126.94785 },
    { lat: 37.53935, lng: 126.94798 },
    { lat: 37.53895, lng: 126.94732 },
    { lat: 37.53912, lng: 126.94640 },
    { lat: 37.53955, lng: 126.94615 },
  ],
  // 한남3구역
  "hannam-3": [
    { lat: 37.5345, lng: 126.9985 },
    { lat: 37.5360, lng: 127.0030 },
    { lat: 37.5325, lng: 127.0065 },
    { lat: 37.5285, lng: 127.0040 },
    { lat: 37.5295, lng: 126.9995 },
  ],
  // 압구정3구역
  "apgujeong-3": [
    { lat: 37.5295, lng: 127.0270 },
    { lat: 37.5320, lng: 127.0345 },
    { lat: 37.5270, lng: 127.0380 },
    { lat: 37.5245, lng: 127.0310 },
  ],
};

/**
 * Returns exact polygon coordinates if available, or generates a realistic polygonal boundary
 * around the center coordinates for simulation and visualization.
 */
export function getProjectPolygon(
  projectId: string,
  centerLat: number,
  centerLng: number,
  scaleMeters: number = 180
): Coord[] {
  if (PRESET_PROJECT_POLYGONS[projectId]) {
    return PRESET_PROJECT_POLYGONS[projectId];
  }

  // Generate realistic 6~8 point polygon contour around the center
  // 1 deg lat ~= 111,000m, 1 deg lng ~= 88,000m in Seoul
  const latDelta = scaleMeters / 111000;
  const lngDelta = scaleMeters / 88000;

  // Use deterministic pseudo-random offsets based on projectId
  let seed = 0;
  for (let i = 0; i < projectId.length; i++) {
    seed = (seed << 5) - seed + projectId.charCodeAt(i);
    seed |= 0;
  }

  const pointsCount = 7;
  const coords: Coord[] = [];

  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2;
    // Vary radius between 0.7 and 1.3
    const radiusFactor = 0.75 + (Math.abs(Math.sin(seed + i * 1.7)) * 0.5);
    const rLat = latDelta * radiusFactor;
    const rLng = lngDelta * radiusFactor;

    coords.push({
      lat: Number((centerLat + Math.sin(angle) * rLat).toFixed(6)),
      lng: Number((centerLng + Math.cos(angle) * rLng).toFixed(6)),
    });
  }

  return coords;
}
