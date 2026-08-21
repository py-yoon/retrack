"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getNaverMapUrl } from "@/lib/utils/map";
import type { Coord } from "@/lib/data/project-polygons";

type ProjectDetailMapProps = {
  projectId: string;
  projectName: string;
  district: string | null;
  address: string | null;
  currentStatus: string | null;
  projectType: string | null;
  center: Coord;
  polygon: Coord[] | null;
};

function getStageColor(status: string | null) {
  if (!status) return "#6b7280";
  if (/관리처분|착공|준공|분양|철거|이전고시/.test(status)) return "#10b981"; // 초록
  if (/사업시행/.test(status)) return "#3b82f6"; // 파랑
  if (/조합설립|추진위/.test(status)) return "#f59e0b"; // 주황
  return "#8b5cf6"; // 보라
}

export default function ProjectDetailMap({
  projectId,
  projectName,
  district,
  address,
  currentStatus,
  projectType,
  center,
  polygon,
}: ProjectDetailMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const cadastralLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);

  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [isSatelliteOn, setIsSatelliteOn] = useState(false);

  const stageColor = getStageColor(currentStatus);
  const naverUrl = getNaverMapUrl(district, address, projectName);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // 1. Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 16,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    // 2. Base Tile Layer (CartoDB Positron / OSM clean)
    const baseLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    // 3. Render Polygon (구역 경계선)
    if (polygon && polygon.length >= 3) {
      const latlngs: [number, number][] = polygon.map((p) => [p.lat, p.lng]);
      const poly = L.polygon(latlngs, {
        color: stageColor,
        weight: 3,
        opacity: 0.95,
        fillColor: stageColor,
        fillOpacity: 0.38,
        lineJoin: "round",
      }).addTo(map);

      poly.bindPopup(`
        <div style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-width: 180px;">
          <div style="font-size: 11px; font-weight: 700; color: ${stageColor}; margin-bottom: 2px;">
            ${currentStatus ?? "정비사업"} · ${projectType ?? "재개발"}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #171918;">
            ${projectName}
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">
            ${district ?? ""} ${address ?? ""}
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee;">
            <a href="${naverUrl}" target="_blank" style="font-size: 11px; font-weight: 700; color: #059669; text-decoration: none;">
              네이버 지도 앱에서 열기 ↗
            </a>
          </div>
        </div>
      `);

      polygonLayerRef.current = poly;

      // Fit map bounds smoothly to polygon
      map.fitBounds(poly.getBounds(), { padding: [30, 30], maxZoom: 17 });
    }

    // 4. Center Label Marker
    const icon = L.divIcon({
      className: "custom-retrack-marker",
      html: `
        <div style="transform: translate(-50%, -100%); cursor: pointer; text-align: center; white-space: nowrap;">
          <div style="
            background: #171918;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: inline-flex;
            align-items: center;
            gap: 4px;
            border: 1px solid rgba(255,255,255,0.2);
          ">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${stageColor};"></span>
            ${projectName}
          </div>
          <div style="
            width: 0; height: 0; 
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid #171918;
            margin: 0 auto;
          "></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const marker = L.marker([center.lat, center.lng], { icon }).addTo(map);
    marker.on("click", () => {
      if (polygonLayerRef.current) {
        polygonLayerRef.current.openPopup();
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, polygon, stageColor, currentStatus, projectName, district, address, projectType, naverUrl]);

  // Toggle Cadastral (Vworld 지적도)
  const toggleCadastral = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!cadastralLayerRef.current) {
      cadastralLayerRef.current = L.tileLayer(
        "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Cadastral/{z}/{y}/{x}.png",
        {
          maxZoom: 19,
          opacity: 0.65,
          zIndex: 5,
        }
      );
    }

    if (isCadastralOn) {
      map.removeLayer(cadastralLayerRef.current);
      setIsCadastralOn(false);
    } else {
      cadastralLayerRef.current.addTo(map);
      setIsCadastralOn(true);
    }
  };

  // Toggle Satellite (Vworld 위성사진)
  const toggleSatellite = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!satelliteLayerRef.current) {
      satelliteLayerRef.current = L.tileLayer(
        "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Satellite/{z}/{y}/{x}.jpeg",
        {
          maxZoom: 19,
          zIndex: 1,
        }
      );
    }

    if (isSatelliteOn) {
      map.removeLayer(satelliteLayerRef.current);
      setIsSatelliteOn(false);
    } else {
      satelliteLayerRef.current.addTo(map);
      setIsSatelliteOn(true);
    }
  };

  // Reset Center
  const handleResetCenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (polygonLayerRef.current) {
      map.fitBounds(polygonLayerRef.current.getBounds(), { padding: [30, 30], maxZoom: 17 });
    } else {
      map.setView([center.lat, center.lng], 16);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-black/10 bg-[#f7f7f4] shadow-sm">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-[380px] sm:h-[430px] z-0" />

      {/* Top Map Controls Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-black/10 shadow-xs text-xs font-semibold text-[#171918]">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: stageColor }}
          />
          <span>{currentStatus ?? "구역 경계"}</span>
        </div>

        <button
          type="button"
          onClick={toggleCadastral}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
            isCadastralOn
              ? "bg-emerald-600 border-emerald-700 text-white"
              : "bg-white/95 border-black/10 text-[#171918] hover:bg-black/5"
          }`}
        >
          {isCadastralOn ? "✓ 지적편집도 ON" : "지적편집도"}
        </button>

        <button
          type="button"
          onClick={toggleSatellite}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
            isSatelliteOn
              ? "bg-blue-600 border-blue-700 text-white"
              : "bg-white/95 border-black/10 text-[#171918] hover:bg-black/5"
          }`}
        >
          {isSatelliteOn ? "일반지도 전환" : "위성지도"}
        </button>

        <button
          type="button"
          onClick={handleResetCenter}
          className="px-2.5 py-1.5 rounded-xl border border-black/10 bg-white/95 text-xs font-bold text-[#171918] hover:bg-black/5 transition shadow-xs cursor-pointer"
          title="구역 중심으로 이동"
        >
          🎯 중심
        </button>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-auto bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-black/10 shadow-sm text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-[#171918] truncate">{projectName}</span>
          <span className="text-[#777a76] hidden sm:inline truncate">{address ?? district}</span>
        </div>
        <a
          href={naverUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 shrink-0 ml-2"
        >
          <span>네이버 지도 앱에서 보기</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  );
}
