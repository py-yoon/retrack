"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getNaverMapUrl } from "@/lib/utils/map";
import { DISTRICT_COORDINATES } from "@/lib/utils/coordinates";
import { getProjectPolygon } from "@/lib/data/project-polygons";
import type { MapProject } from "@/components/SeoulInteractiveMap";

type NaverMapViewProps = {
  projects: MapProject[];
  selectedProject: MapProject | null;
  onSelectProject: (p: MapProject) => void;
  selectedDistrict: string;
};

function getStageColor(status: string | null) {
  if (!status) return "#6b7280";
  if (/관리처분|착공|준공|분양|철거|이전고시/.test(status)) return "#10b981";
  if (/사업시행/.test(status)) return "#3b82f6";
  if (/조합설립|추진위/.test(status)) return "#f59e0b";
  return "#8b5cf6";
}

export default function NaverMapView({
  projects,
  selectedProject,
  onSelectProject,
  selectedDistrict,
}: NaverMapViewProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [engineMode, setEngineMode] = useState<"naver" | "fallback">("naver");
  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [mapType, setMapType] = useState<"normal" | "hybrid">("normal");

  const naverMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);
  const cadastralLayerRef = useRef<any>(null);

  // Leaflet Fallback Refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const leafletPolygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const leafletCadastralRef = useRef<L.TileLayer | null>(null);
  const leafletSatelliteRef = useRef<L.TileLayer | null>(null);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "nbhyehsios";

  // 0. Register Naver Auth Failure Callback (must exist before the script loads)
  useEffect(() => {
    const w = window as Window & { navermap_authFailure?: () => void };
    w.navermap_authFailure = () => {
      console.warn("Naver Maps auth failed (invalid key or unregistered domain), switching to fallback map engine.");
      setEngineMode("fallback");
    };
    return () => {
      delete w.navermap_authFailure;
    };
  }, []);

  // 1. Initialize Naver Map
  const initNaver = () => {
    const naver = (window as any).naver;
    if (!mapElement.current || !naver?.maps) {
      setEngineMode("fallback");
      return;
    }

    try {
      if (!naverMapRef.current) {
        const defaultCenter = new naver.maps.LatLng(37.5665, 126.978);
        const map = new naver.maps.Map(mapElement.current, {
          center: defaultCenter,
          zoom: 12,
          minZoom: 10,
          maxZoom: 19,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
          },
          mapTypeControl: false,
        });

        naverMapRef.current = map;
      }
    } catch {
      setEngineMode("fallback");
    }
  };

  // 1b. Handle client-side route navigation: if the Naver script was already
  // loaded by a previous page, next/script's onLoad never fires again for this
  // new instance (it's cached globally), so we must initialize directly here.
  useEffect(() => {
    if ((window as unknown as { naver?: { maps?: unknown } }).naver?.maps) {
      queueMicrotask(initNaver);
    }
  }, []);

  // 2. Leaflet Fallback Init (Zero-Error Guarantee)
  useEffect(() => {
    if (engineMode !== "fallback" || !mapElement.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    try {
      const map = L.map(mapElement.current, {
        center: [37.5665, 126.978],
        zoom: 12,
        minZoom: 10,
        maxZoom: 19,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      const polyLayer = L.layerGroup().addTo(map);
      const markLayer = L.layerGroup().addTo(map);

      leafletPolygonsLayerRef.current = polyLayer;
      leafletMarkersLayerRef.current = markLayer;
      leafletMapRef.current = map;
    } catch (e) {
      console.error("Leaflet fallback error:", e);
    }
  }, [engineMode]);

  // Render Leaflet Elements
  useEffect(() => {
    if (engineMode !== "fallback") return;
    const map = leafletMapRef.current;
    const polyLayer = leafletPolygonsLayerRef.current;
    const markLayer = leafletMarkersLayerRef.current;
    if (!map || !polyLayer || !markLayer) return;

    polyLayer.clearLayers();
    markLayer.clearLayers();

    projects.forEach((p) => {
      const color = getStageColor(p.current_status);
      const isSelected = selectedProject?.id === p.id;

      // Polygon
      const polyCoords = getProjectPolygon(p.id, p.lat, p.lng) || getProjectPolygon(p.name, p.lat, p.lng);
      if (polyCoords && polyCoords.length >= 3) {
        const latlngs: [number, number][] = polyCoords.map((c) => [c.lat, c.lng]);
        const poly = L.polygon(latlngs, {
          color: isSelected ? "#171918" : color,
          weight: isSelected ? 3.5 : 2,
          fillColor: color,
          fillOpacity: isSelected ? 0.6 : 0.35,
        }).addTo(polyLayer);
        poly.on("click", () => onSelectProject(p));
      }

      // Marker
      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="transform: translate(-50%, -50%); width: ${isSelected ? "26px" : "18px"}; height: ${isSelected ? "26px" : "18px"}; border-radius: 50%; background-color: ${color}; border: ${isSelected ? "3px solid #171918" : "2px solid #ffffff"}; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
            ${isSelected ? "★" : ""}
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([p.lat, p.lng], { icon }).addTo(markLayer);
      marker.on("click", () => onSelectProject(p));
    });
  }, [engineMode, projects, selectedProject, onSelectProject]);

  // Pan to selected project
  useEffect(() => {
    if (engineMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      if (naver?.maps && selectedProject) {
        naverMapRef.current.panTo(new naver.maps.LatLng(selectedProject.lat, selectedProject.lng));
        naverMapRef.current.setZoom(15);
      }
    } else if (engineMode === "fallback" && leafletMapRef.current && selectedProject) {
      leafletMapRef.current.flyTo([selectedProject.lat, selectedProject.lng], 15, { duration: 0.8 });
    }
  }, [selectedProject, engineMode]);

  // Pan to district
  useEffect(() => {
    if (!selectedDistrict || selectedDistrict === "전체 자치구" || !DISTRICT_COORDINATES[selectedDistrict]) return;
    const coord = DISTRICT_COORDINATES[selectedDistrict];

    if (engineMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      if (naver?.maps) {
        naverMapRef.current.panTo(new naver.maps.LatLng(coord.lat, coord.lng));
        naverMapRef.current.setZoom(13);
      }
    } else if (engineMode === "fallback" && leafletMapRef.current) {
      leafletMapRef.current.flyTo([coord.lat, coord.lng], 13.5, { duration: 0.8 });
    }
  }, [selectedDistrict, engineMode]);

  // Toggle Cadastral
  const toggleCadastral = () => {
    if (engineMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      if (!cadastralLayerRef.current) {
        cadastralLayerRef.current = new naver.maps.CadastralLayer();
      }
      if (isCadastralOn) {
        cadastralLayerRef.current.setMap(null);
        setIsCadastralOn(false);
      } else {
        cadastralLayerRef.current.setMap(naverMapRef.current);
        setIsCadastralOn(true);
      }
    } else if (engineMode === "fallback" && leafletMapRef.current) {
      const map = leafletMapRef.current;
      if (!leafletCadastralRef.current) {
        leafletCadastralRef.current = L.tileLayer(
          "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Cadastral/{z}/{y}/{x}.png",
          { maxZoom: 19, opacity: 0.6, zIndex: 5 }
        );
      }
      if (isCadastralOn) {
        map.removeLayer(leafletCadastralRef.current);
        setIsCadastralOn(false);
      } else {
        leafletCadastralRef.current.addTo(map);
        setIsCadastralOn(true);
      }
    }
  };

  // Toggle Satellite
  const toggleMapType = () => {
    if (engineMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      if (mapType === "normal") {
        naverMapRef.current.setMapTypeId(naver.maps.MapTypeId.HYBRID);
        setMapType("hybrid");
      } else {
        naverMapRef.current.setMapTypeId(naver.maps.MapTypeId.NORMAL);
        setMapType("normal");
      }
    } else if (engineMode === "fallback" && leafletMapRef.current) {
      const map = leafletMapRef.current;
      if (!leafletSatelliteRef.current) {
        leafletSatelliteRef.current = L.tileLayer(
          "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Satellite/{z}/{y}/{x}.jpeg",
          { maxZoom: 19, zIndex: 1 }
        );
      }
      if (mapType === "normal") {
        leafletSatelliteRef.current.addTo(map);
        setMapType("hybrid");
      } else {
        map.removeLayer(leafletSatelliteRef.current);
        setMapType("normal");
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-black/5 bg-[#f5f5f1] shadow-xs">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`}
        strategy="afterInteractive"
        onLoad={() => {
          if ((window as any).naver?.maps) {
            initNaver();
          } else {
            setEngineMode("fallback");
          }
        }}
        onError={() => setEngineMode("fallback")}
      />

      <div ref={mapElement} className="w-full h-full min-h-[520px] z-0" />

      {/* Control Buttons Overlay */}
      <div className="absolute top-3 left-3 z-[100] flex flex-wrap items-center gap-2 pointer-events-auto">
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
          onClick={toggleMapType}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
            mapType === "hybrid"
              ? "bg-blue-600 border-blue-700 text-white"
              : "bg-white/95 border-black/10 text-[#171918] hover:bg-black/5"
          }`}
        >
          {mapType === "hybrid" ? "일반지도" : "위성지도"}
        </button>
      </div>
    </div>
  );
}
