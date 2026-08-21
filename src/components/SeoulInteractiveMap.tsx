"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getNaverMapUrl } from "@/lib/utils/map";
import { DISTRICT_COORDINATES } from "@/lib/utils/coordinates";
import { getProjectPolygon } from "@/lib/data/project-polygons";

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
      return { bg: "#10b981", border: "#059669", text: "#ffffff", hex: "#10b981" };
    case "APPROVED":
      return { bg: "#3b82f6", border: "#2563eb", text: "#ffffff", hex: "#3b82f6" };
    case "UNION":
      return { bg: "#f59e0b", border: "#d97706", text: "#ffffff", hex: "#f59e0b" };
    case "DESIGNATED":
      return { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff", hex: "#8b5cf6" };
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
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const cadastralLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);

  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [isSatelliteOn, setIsSatelliteOn] = useState(false);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [37.5665, 126.978],
      zoom: 12,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: false,
    });

    // Clean Voyager Tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const polygonsLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    polygonsLayerRef.current = polygonsLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Markers and Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const polygonsLayer = polygonsLayerRef.current;
    if (!map || !markersLayer || !polygonsLayer) return;

    markersLayer.clearLayers();
    polygonsLayer.clearLayers();

    projects.forEach((p) => {
      const category = getStageCategory(p.current_status);
      const color = getMarkerColor(category);
      const isSelected = selectedProject?.id === p.id;

      // Render Real Polygon ONLY for Verified Projects
      const polyCoords = getProjectPolygon(p.id, p.lat, p.lng);
      if (polyCoords && polyCoords.length >= 3) {
        const latlngs: [number, number][] = polyCoords.map((c) => [c.lat, c.lng]);
        const poly = L.polygon(latlngs, {
          color: isSelected ? "#171918" : color.hex,
          weight: isSelected ? 3.5 : 2,
          opacity: isSelected ? 1 : 0.8,
          fillColor: color.hex,
          fillOpacity: isSelected ? 0.55 : 0.3,
          lineJoin: "round",
        });

        poly.on("click", () => onSelectProject(p));
        poly.addTo(polygonsLayer);
      }

      // Marker Icon
      const markerHtml = `
        <div style="position: relative; width: ${isSelected ? "28px" : "20px"}; height: ${isSelected ? "28px" : "20px"}; cursor: pointer; transition: transform 0.2s;">
          ${
            p.hasRecentEvent
              ? `<div style="position: absolute; inset: -5px; border-radius: 9999px; background-color: ${color.bg}; opacity: 0.5; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ""
          }
          <div style="
            width: 100%; 
            height: 100%; 
            border-radius: 9999px; 
            background-color: ${color.bg}; 
            border: ${isSelected ? "3px solid #171918" : "2px solid #ffffff"}; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${color.text};
            font-weight: bold;
            font-size: 10px;
          ">
            ${isSelected ? "★" : ""}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-marker-wrapper",
        html: markerHtml,
        iconSize: [isSelected ? 28 : 20, isSelected ? 28 : 20],
        iconAnchor: [isSelected ? 14 : 10, isSelected ? 14 : 10],
      });

      const marker = L.marker([p.lat, p.lng], { icon });
      const naverUrl = getNaverMapUrl(p.district, p.address, p.name);

      const popupContent = `
        <div style="padding: 10px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="font-size: 11px; font-weight: bold; color: ${color.bg}; margin-bottom: 2px;">
            ${p.current_status ?? "정비사업"}
          </div>
          <div style="font-size: 14px; font-weight: bold; color: #171918; line-height: 1.3;">
            ${p.name}
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 3px;">
            ${p.district ?? ""} ${p.address ?? ""}
          </div>
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
            <a href="/projects/${p.id}" style="font-size: 12px; font-weight: bold; color: #171918; text-decoration: underline;">
              사업성 & 계산기 ➔
            </a>
            <a href="${naverUrl}" target="_blank" rel="noreferrer" style="font-size: 12px; font-weight: bold; color: #059669; text-decoration: none;">
              네이버 지도 ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { offset: [0, -10] });
      marker.on("click", () => onSelectProject(p));
      marker.addTo(markersLayer);
    });
  }, [projects, selectedProject, onSelectProject]);

  // Pan to selected project
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedProject) return;

    map.flyTo([selectedProject.lat, selectedProject.lng], 15, { duration: 0.8 });
  }, [selectedProject]);

  // Pan to selected district
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedDistrict && selectedDistrict !== "전체 자치구" && DISTRICT_COORDINATES[selectedDistrict]) {
      const coord = DISTRICT_COORDINATES[selectedDistrict];
      map.flyTo([coord.lat, coord.lng], 13.5, { duration: 0.8 });
    }
  }, [selectedDistrict]);

  // Toggle Cadastral (지적도)
  const toggleCadastral = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!cadastralLayerRef.current) {
      cadastralLayerRef.current = L.tileLayer(
        "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Cadastral/{z}/{y}/{x}.png",
        { maxZoom: 19, opacity: 0.6, zIndex: 5 }
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

  // Toggle Satellite (위성사진)
  const toggleSatellite = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!satelliteLayerRef.current) {
      satelliteLayerRef.current = L.tileLayer(
        "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Satellite/{z}/{y}/{x}.jpeg",
        { maxZoom: 19, zIndex: 1 }
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

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-black/5 bg-[#f5f5f1] shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full min-h-[520px] z-0" />

      {/* Map Control Buttons Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 pointer-events-auto">
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
      </div>
    </div>
  );
}
