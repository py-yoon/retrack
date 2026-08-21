"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
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
  polygon: Coord[];
};

function getStageColor(status: string | null) {
  if (!status) return "#6b7280";
  if (/관리처분|착공|준공|분양|철거|이전고시/.test(status)) return "#10b981"; // 초록
  if (/사업시행/.test(status)) return "#3b82f6"; // 파랑
  if (/조합설립|추진위/.test(status)) return "#f59e0b"; // 주황
  return "#8b5cf6"; // 보라 (구역지정/기타)
}

interface NaverMapInstance {
  setCenter: (latlng: unknown) => void;
  setZoom: (zoom: number) => void;
  panTo: (latlng: unknown) => void;
  fitBounds: (bounds: unknown) => void;
  setMapTypeId: (typeId: unknown) => void;
  getMapTypeId: () => unknown;
}

interface NaverPolygonInstance {
  setMap: (map: unknown) => void;
  setOptions: (options: Record<string, unknown>) => void;
}

interface NaverMarkerInstance {
  setMap: (map: unknown) => void;
}

interface NaverInfoWindowInstance {
  setContent: (content: string) => void;
  open: (map: unknown, marker: unknown) => void;
  close: () => void;
}

interface NaverCadastralLayerInstance {
  setMap: (map: unknown) => void;
}

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMapInstance;
        Marker: new (options: Record<string, unknown>) => NaverMarkerInstance;
        Polygon: new (options: Record<string, unknown>) => NaverPolygonInstance;
        InfoWindow: new (options: Record<string, unknown>) => NaverInfoWindowInstance;
        CadastralLayer: new () => NaverCadastralLayerInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new (sw: unknown, ne: unknown) => unknown;
        Point: new (x: number, y: number) => unknown;
        Size: new (width: number, height: number) => unknown;
        MapTypeId: {
          NORMAL: unknown;
          HYBRID: unknown;
          SATELLITE: unknown;
        };
        Position: {
          TOP_RIGHT: unknown;
          TOP_LEFT: unknown;
        };
        Event: {
          addListener: (target: unknown, eventName: string, listener: (e?: unknown) => void) => void;
        };
      };
    };
  }
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
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<NaverMapInstance | null>(null);
  const polygonInstance = useRef<NaverPolygonInstance | null>(null);
  const markerInstance = useRef<NaverMarkerInstance | null>(null);
  const infoWindowRef = useRef<NaverInfoWindowInstance | null>(null);
  const cadastralLayerRef = useRef<NaverCadastralLayerInstance | null>(null);

  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [mapType, setMapType] = useState<"normal" | "hybrid">("normal");

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "nbhyehsios";
  const stageColor = getStageColor(currentStatus);
  const naverUrl = getNaverMapUrl(district, address, projectName);

  // Initialize Naver Map
  useEffect(() => {
    const naver = window.naver;
    if (!isScriptLoaded || !mapElement.current || !naver?.maps) return;

    if (!mapInstance.current) {
      const centerLatLng = new naver.maps.LatLng(center.lat, center.lng);

      const map = new naver.maps.Map(mapElement.current, {
        center: centerLatLng,
        zoom: 16,
        minZoom: 12,
        maxZoom: 19,
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.TOP_RIGHT,
        },
        mapTypeControl: false,
      });

      mapInstance.current = map;

      // 1. Render Naver Map Polygon (구역 경계선)
      if (polygon.length >= 3) {
        const paths = polygon.map((p) => new naver.maps.LatLng(p.lat, p.lng));

        const naverPolygon = new naver.maps.Polygon({
          map: map,
          paths: paths,
          fillColor: stageColor,
          fillOpacity: 0.38,
          strokeColor: stageColor,
          strokeOpacity: 0.95,
          strokeWeight: 3,
          strokeLineJoin: "round",
          clickable: true,
        });

        polygonInstance.current = naverPolygon;

        // Hover Effect
        naver.maps.Event.addListener(naverPolygon, "mouseover", () => {
          naverPolygon.setOptions({
            fillOpacity: 0.6,
            strokeWeight: 4,
          });
        });

        naver.maps.Event.addListener(naverPolygon, "mouseout", () => {
          naverPolygon.setOptions({
            fillOpacity: 0.38,
            strokeWeight: 3,
          });
        });

        // Click Polygon to open info
        naver.maps.Event.addListener(naverPolygon, "click", () => {
          if (infoWindowRef.current && markerInstance.current) {
            infoWindowRef.current.open(map, markerInstance.current);
          }
        });
      }

      // 2. Custom Center Marker with Label
      const markerContent = `
        <div style="transform: translate(-50%, -100%); cursor: pointer; text-align: center; pointer-events: auto;">
          <div style="
            background: #171918;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.2);
          ">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${stageColor};"></span>
            ${projectName}
          </div>
          <div style="
            width: 0; 
            height: 0; 
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid #171918;
            margin: 0 auto;
          "></div>
        </div>
      `;

      const marker = new naver.maps.Marker({
        position: centerLatLng,
        map: map,
        icon: {
          content: markerContent,
          anchor: new naver.maps.Point(0, 0),
        },
      });

      markerInstance.current = marker;

      // 3. Info Window
      const infoContent = `
        <div style="padding: 14px 16px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: 700; color: #ffffff; background: ${stageColor}; padding: 2px 6px; border-radius: 4px;">
              ${currentStatus ?? "진행단계"}
            </span>
            <span style="font-size: 11px; color: #666;">${projectType ?? "정비사업"}</span>
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #171918; margin-top: 4px;">
            ${projectName}
          </div>
          <div style="font-size: 11px; color: #777; margin-top: 2px;">
            ${district ?? ""} ${address ?? ""}
          </div>
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #10b981; font-weight: 600;">✓ 구역 폴리곤 표시 중</span>
            <a href="${naverUrl}" target="_blank" rel="noreferrer" style="font-size: 12px; font-weight: 700; color: #059669; text-decoration: none;">
              네이버 지도 ↗
            </a>
          </div>
        </div>
      `;

      const infoWindow = new naver.maps.InfoWindow({
        content: infoContent,
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        disableAnchor: false,
      });

      infoWindowRef.current = infoWindow;

      naver.maps.Event.addListener(marker, "click", () => {
        infoWindow.open(map, marker);
      });
    }
  }, [isScriptLoaded, center, polygon, currentStatus, district, address, projectName, projectType, stageColor, naverUrl]);

  // Toggle Cadastral (지적편집도)
  const toggleCadastral = () => {
    const naver = window.naver;
    const map = mapInstance.current;
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

  // Toggle Map Type (일반 / 위성)
  const toggleMapType = () => {
    const naver = window.naver;
    const map = mapInstance.current;
    if (!naver?.maps || !map) return;

    if (mapType === "normal") {
      map.setMapTypeId(naver.maps.MapTypeId.HYBRID);
      setMapType("hybrid");
    } else {
      map.setMapTypeId(naver.maps.MapTypeId.NORMAL);
      setMapType("normal");
    }
  };

  // Reset Center
  const handleResetCenter = () => {
    const naver = window.naver;
    const map = mapInstance.current;
    if (!naver?.maps || !map) return;
    map.panTo(new naver.maps.LatLng(center.lat, center.lng));
    map.setZoom(16);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-black/10 bg-[#f7f7f4] shadow-sm">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
        onLoad={() => setIsScriptLoaded(true)}
      />

      {/* Map Container */}
      <div ref={mapElement} className="w-full h-[380px] sm:h-[420px]" />

      {/* Top Map Controls Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
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
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs ${
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
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs ${
            mapType === "hybrid"
              ? "bg-blue-600 border-blue-700 text-white"
              : "bg-white/95 border-black/10 text-[#171918] hover:bg-black/5"
          }`}
        >
          {mapType === "hybrid" ? "위성지도" : "일반지도"}
        </button>

        <button
          type="button"
          onClick={handleResetCenter}
          className="px-2.5 py-1.5 rounded-xl border border-black/10 bg-white/95 text-xs font-bold text-[#171918] hover:bg-black/5 transition shadow-xs"
          title="구역 중심으로 이동"
        >
          🎯 중심
        </button>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-auto bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-black/10 shadow-sm text-xs">
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
          <span>네이버 지도 앱/웹에서 보기</span>
          <span>↗</span>
        </a>
      </div>

      {/* Loading Skeleton */}
      {!isScriptLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f7f7f4] text-xs text-[#777a76] gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span>네이버 지도 및 구역 폴리곤을 로드하는 중입니다...</span>
        </div>
      )}
    </div>
  );
}
