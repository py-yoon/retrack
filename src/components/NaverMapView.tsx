"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
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
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);
  const cadastralLayerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [mapType, setMapType] = useState<"normal" | "hybrid">("normal");

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "nbhyehsios";

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).naver?.maps) {
      setIsScriptReady(true);
    }
  }, []);

  // 1. Initialize Map
  useEffect(() => {
    if (!isScriptReady || !mapElement.current) return;
    const naver = (window as any).naver;
    if (!naver?.maps) return;

    if (!mapInstanceRef.current) {
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

      infoWindowRef.current = new naver.maps.InfoWindow({
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        disableAnchor: false,
      });

      mapInstanceRef.current = map;
    }
  }, [isScriptReady]);

  // 2. Render Markers and Polygons
  useEffect(() => {
    const naver = (window as any).naver;
    const map = mapInstanceRef.current;
    if (!isScriptReady || !map || !naver?.maps) return;

    // Clear old
    markersRef.current.forEach((m) => m.setMap(null));
    polygonsRef.current.forEach((p) => p.setMap(null));
    markersRef.current = [];
    polygonsRef.current = [];

    projects.forEach((p) => {
      const color = getStageColor(p.current_status);
      const isSelected = selectedProject?.id === p.id;
      const position = new naver.maps.LatLng(p.lat, p.lng);

      // Render Verified Real Polygon
      const polyCoords = getProjectPolygon(p.id, p.lat, p.lng) || getProjectPolygon(p.name, p.lat, p.lng);
      if (polyCoords && polyCoords.length >= 3) {
        const paths = polyCoords.map((c) => new naver.maps.LatLng(c.lat, c.lng));
        const poly = new naver.maps.Polygon({
          map: map,
          paths: paths,
          fillColor: color,
          fillOpacity: isSelected ? 0.6 : 0.35,
          strokeColor: isSelected ? "#171918" : color,
          strokeWeight: isSelected ? 4 : 2.5,
          strokeOpacity: 0.95,
          clickable: true,
        });

        naver.maps.Event.addListener(poly, "click", () => onSelectProject(p));
        polygonsRef.current.push(poly);
      }

      // Marker
      const markerContent = `
        <div style="transform: translate(-50%, -50%); cursor: pointer; transition: transform 0.2s;">
          <div style="
            width: ${isSelected ? "26px" : "18px"}; 
            height: ${isSelected ? "26px" : "18px"}; 
            border-radius: 50%; 
            background-color: ${color}; 
            border: ${isSelected ? "3px solid #171918" : "2px solid #ffffff"}; 
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
          ">
            ${isSelected ? "★" : ""}
          </div>
        </div>
      `;

      const marker = new naver.maps.Marker({
        position: position,
        map: map,
        icon: {
          content: markerContent,
          anchor: new naver.maps.Point(0, 0),
        },
      });

      naver.maps.Event.addListener(marker, "click", () => {
        onSelectProject(p);
      });

      markersRef.current.push(marker);
    });
  }, [isScriptReady, projects, selectedProject, onSelectProject]);

  // Pan to selected project
  useEffect(() => {
    const naver = (window as any).naver;
    const map = mapInstanceRef.current;
    if (!map || !naver?.maps || !selectedProject) return;

    map.panTo(new naver.maps.LatLng(selectedProject.lat, selectedProject.lng));
    map.setZoom(15);
  }, [selectedProject]);

  // Pan to selected district
  useEffect(() => {
    const naver = (window as any).naver;
    const map = mapInstanceRef.current;
    if (!map || !naver?.maps) return;

    if (selectedDistrict && selectedDistrict !== "전체 자치구" && DISTRICT_COORDINATES[selectedDistrict]) {
      const coord = DISTRICT_COORDINATES[selectedDistrict];
      map.panTo(new naver.maps.LatLng(coord.lat, coord.lng));
      map.setZoom(13);
    }
  }, [selectedDistrict]);

  // Toggle Naver Cadastral
  const toggleCadastral = () => {
    const naver = (window as any).naver;
    const map = mapInstanceRef.current;
    if (!naver?.maps || !map) return;

    if (!cadastralLayerRef.current) {
      cadastralLayerRef.current = new naver.maps.CadastralLayer();
    }

    if (isCadastralOn) {
      cadastralLayerRef.current.setMap(null);
      setIsCadastralOn(false);
    } else {
      cadastralLayerRef.current.setMap(map);
      setIsCadastralOn(true);
    }
  };

  // Toggle Naver Satellite
  const toggleMapType = () => {
    const naver = (window as any).naver;
    const map = mapInstanceRef.current;
    if (!naver?.maps || !map) return;

    if (mapType === "normal") {
      map.setMapTypeId(naver.maps.MapTypeId.HYBRID);
      setMapType("hybrid");
    } else {
      map.setMapTypeId(naver.maps.MapTypeId.NORMAL);
      setMapType("normal");
    }
  };

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-black/5 bg-[#f5f5f1] shadow-xs">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
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
          {isCadastralOn ? "✓ 네이버 지적편집도 ON" : "지적편집도"}
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
