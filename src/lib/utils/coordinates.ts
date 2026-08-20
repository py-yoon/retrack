export type DistrictCoord = { lat: number; lng: number };

export const DISTRICT_COORDINATES: Record<string, DistrictCoord> = {
  강남구: { lat: 37.5172, lng: 127.0473 },
  서초구: { lat: 37.4837, lng: 127.0324 },
  송파구: { lat: 37.5145, lng: 127.1058 },
  용산구: { lat: 37.5384, lng: 126.9654 },
  성동구: { lat: 37.5634, lng: 127.0368 },
  마포구: { lat: 37.5663, lng: 126.9016 },
  동작구: { lat: 37.5124, lng: 126.9393 },
  영등포구: { lat: 37.5264, lng: 126.8963 },
  양천구: { lat: 37.517, lng: 126.8665 },
  강동구: { lat: 37.5301, lng: 127.1238 },
  광진구: { lat: 37.5385, lng: 127.0824 },
  동대문구: { lat: 37.5744, lng: 127.0397 },
  성북구: { lat: 37.5894, lng: 127.0167 },
  서대문구: { lat: 37.5791, lng: 126.9368 },
  은평구: { lat: 37.6027, lng: 126.9291 },
  종로구: { lat: 37.573, lng: 126.9794 },
  중구: { lat: 37.5636, lng: 126.9975 },
  관악구: { lat: 37.4784, lng: 126.9515 },
  구로구: { lat: 37.4954, lng: 126.8874 },
  금천구: { lat: 37.4568, lng: 126.8954 },
  강서구: { lat: 37.5509, lng: 126.8495 },
  중랑구: { lat: 37.6063, lng: 127.0928 },
  강북구: { lat: 37.6396, lng: 127.0255 },
  도봉구: { lat: 37.6688, lng: 127.0471 },
  노원구: { lat: 37.6542, lng: 127.0568 },
};

// Simple pseudo-random hash to generate deterministic scatter for projects within a district
function pseudoHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function getProjectCoordinates(
  id: string,
  district: string | null,
  latitude?: number | null,
  longitude?: number | null
): { lat: number; lng: number } {
  if (latitude && longitude && latitude > 30 && longitude > 120) {
    return { lat: latitude, lng: longitude };
  }

  const base = (district && DISTRICT_COORDINATES[district]) || { lat: 37.5665, lng: 126.978 };
  const hash = pseudoHash(id);

  // Deterministic offset within ~1.2km radius
  const latOffset = (((hash & 0xffff) % 2000) - 1000) / 100000;
  const lngOffset = ((((hash >> 16) & 0xffff) % 2000) - 1000) / 80000;

  return {
    lat: base.lat + latOffset,
    lng: base.lng + lngOffset,
  };
}
