"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getNaverMapUrl } from "@/lib/utils/map";
import { DISTRICT_COORDINATES } from "@/lib/utils/coordinates";

export type MapProject = {
  id: string;
  name: string;
  address: string;
  district: string | null;
  project_type: string | null;
  current_status: string | null;
  updated_at: string;
  lat: number;
  lng: number;
  hasRecentEvent?: boolean;
};

type SeoulInteractiveMapProps = {
  projects: MapProject[];
  selectedProject: MapProject | null;
  onSelectProject: (p: MapProject) => void;
  selectedDistrict: string;
};

function getStageCategory(status: string | null): "ADVANCED" | "APPROVED" | "UNION" | "DESIGNATED" {
  if (!status) return "DESIGNATED";
  if (/관리처분|착공|준공|분양|철거|이전고시/.test(status)) return "ADVANCED";
  if (/사업시행/.test(status)) return "APPROVED";
  if (/조합설립|추진위/.test(status)) return "UNION";
  return "DESIGNATED";
}

function getMarkerColor(category: "ADVANCED" | "APPROVED" | "UNION" | "DESIGNATED") {
  switch (category) {
    case "ADVANCED":
      return { bg: "#10b981", border: "#059669", text: "#ffffff" };
    case "APPROVED":
      return { bg: "#3b82f6", border: "#2563eb", text: "#ffffff" };
    case "UNION":
      return { bg: "#f59e0b", border: "#d97706", text: "#ffffff" };
    case "DESIGNATED":
      return { bg: "#6b7280", border: "#4b5563", text: "#ffffff" };
  }
}

export default function SeoulInteractiveMap({
  projects,
  selectedProject,
  onSelectProject,
  selectedDistrict,
}: SeoulInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center of Seoul
    const map = L.map(mapContainerRef.current, {
      center: [37.5665, 126.978],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
    });

    // Clean, modern Voyager Tile layer (CartoDB) with Korean support
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Zoom control on top right
    L.control.zoom({ position: "topright" }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when projects or selectedProject changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    projects.forEach((p) => {
      const category = getStageCategory(p.current_status);
      const color = getMarkerColor(category);
      const isSelected = selectedProject?.id === p.id;

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: "custom-retrack-marker",
        html: `
          <div style="position: relative; width: ${isSelected ? "28px" : "20px"}; height: ${isSelected ? "28px" : "20px"}; cursor: pointer; transition: all 0.2s;">
            ${
              p.hasRecentEvent
                ? `<div style="position: absolute; inset: -6px; border-radius: 9999px; background-color: ${color.bg}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ""
            }
            <div style="
              width: 100%; 
              height: 100%; 
              border-radius: 9999px; 
              background-color: ${color.bg}; 
              border: ${isSelected ? "3px solid #171918" : "2px solid #ffffff"}; 
              box-shadow: 0 4px 12px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 10px;
            ">
              ${isSelected ? "★" : ""}
            </div>
          </div>
        `,
        iconSize: isSelected ? [28, 28] : [20, 20],
        iconAnchor: isSelected ? [14, 14] : [10, 10],
      });

      const marker = L.marker([p.lat, p.lng], { icon: customIcon });

      const naverUrl = getNaverMapUrl(p.district, p.address, p.name);

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; padding: 4px; min-width: 180px;">
          <div style="font-size: 10px; font-weight: bold; color: ${color.bg}; margin-bottom: 2px;">
            ${p.current_status ?? "정비사업"}
          </div>
          <div style="font-weight: bold; font-size: 13px; color: #171918; line-height: 1.3;">
            ${p.name}
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">
            ${p.district ?? ""} ${p.address ?? ""}
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
            <a href="/projects/${p.id}" style="color: #171918; font-weight: bold; text-decoration: underline;">
              분석 & 계산기 ➔
            </a>
            <a href="${naverUrl}" target="_blank" rel="noreferrer" style="color: #059669; font-weight: bold; text-decoration: none;">
              🗺️ 네이버 지도 ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { offset: [0, -10] });

      marker.on("click", () => {
        onSelectProject(p);
      });

      markersLayer.addLayer(marker);
    });
  }, [projects, selectedProject, onSelectProject]);

  // Center map on selected project
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedProject) {
      map.flyTo([selectedProject.lat, selectedProject.lng], Math.max(map.getZoom(), 14), {
        duration: 0.8,
      });
    }
  }, [selectedProject]);

  // Center map on selected district
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedDistrict && selectedDistrict !== "전체 자치구" && DISTRICT_COORDINATES[selectedDistrict]) {
      const coord = DISTRICT_COORDINATES[selectedDistrict];
      map.flyTo([coord.lat, coord.lng], 13.5, { duration: 0.8 });
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-black/5">
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] z-0" />

      {/* Floating Map Controls & Seoul Reset Button */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            mapInstanceRef.current?.flyTo([37.5665, 126.978], 12, { duration: 0.8 });
          }}
          className="rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-[#171918] shadow-md border border-black/10 transition hover:bg-white active:scale-95"
        >
          📍 서울 전체 보기
        </button>

        {selectedProject && (
          <a
            href={getNaverMapUrl(selectedProject.district, selectedProject.address, selectedProject.name)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
          >
            <span>🗺️</span>
            <span>선택 구역 네이버 지도로 열기 ↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
