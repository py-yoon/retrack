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
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const cadastralLayerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [mapType, setMapType] = useState<"normal" | "hybrid">("normal");

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "nbhyehsios";
  const stageColor = getStageColor(currentStatus);
  const naverUrl = getNaverMapUrl(district, address, projectName);

  // Check if Naver Maps SDK already exists on window
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).naver?.maps) {
      setIsScriptReady(true);
    }
  }, []);

  // Initialize Naver Map
  useEffect(() => {
    if (!isScriptReady || !mapElement.current) return;
    const naver = (window as any).naver;
    if (!naver?.maps) return;

    try {
      const centerLatLng = new naver.maps.LatLng(center.lat, center.lng);

      // 1. Initialize Map
      const map = new naver.maps.Map(mapElement.current, {
        center: centerLatLng,
        zoom: 16,
        minZoom: 11,
        maxZoom: 19,
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.TOP_RIGHT,
        },
        mapTypeControl: false,
      });

      mapInstanceRef.current = map;

      // 2. Render Verified Real Polygon (공공 실측 도면)
      if (polygon && polygon.length >= 3) {
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

        polygonInstanceRef.current = naverPolygon;

        // Hover Effect
        naver.maps.Event.addListener(naverPolygon, "mouseover", () => {
          naverPolygon.setOptions({ fillOpacity: 0.65, strokeWeight: 4 });
        });
        naver.maps.Event.addListener(naverPolygon, "mouseout", () => {
          naverPolygon.setOptions({ fillOpacity: 0.38, strokeWeight: 3 });
        });
      }

      // 3. Render Custom Center Marker
      const markerContent = `
        <div style="transform: translate(-50%, -100%); cursor: pointer; text-align: center; white-space: nowrap;">
          <div style="
            background: #171918;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 9px;
            border-radius: 7px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            display: inline-flex;
            align-items: center;
            gap: 5px;
            border: 1px solid rgba(255,255,255,0.25);
          ">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${stageColor};"></span>
            <span>${projectName}</span>
          </div>
          <div style="
            width: 0; height: 0; 
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

      markerInstanceRef.current = marker;

      // 4. InfoWindow (팝업 창)
      const infoContent = `
        <div style="padding: 12px 14px; min-width: 210px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="display: flex; items-center; gap: 5px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; color: #ffffff; background: ${stageColor}; padding: 2px 6px; border-radius: 4px;">
              ${currentStatus ?? "진행단계"}
            </span>
            <span style="font-size: 10px; color: #777;">${projectType ?? "정비사업"}</span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #171918; margin-top: 3px;">
            ${projectName}
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">
            ${district ?? ""} ${address ?? ""}
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; color: #059669; font-weight: 600;">
              ${polygon && polygon.length >= 3 ? "✓ 실측 고시 도면 적용" : "위치 핀"}
            </span>
            <a href="${naverUrl}" target="_blank" rel="noreferrer" style="font-size: 11px; font-weight: 700; color: #059669; text-decoration: none;">
              네이버 지도 앱 ↗
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

      if (polygonInstanceRef.current) {
        naver.maps.Event.addListener(polygonInstanceRef.current, "click", () => {
          infoWindow.open(map, marker);
        });
      }
    } catch (e) {
      console.error("Naver Map init error:", e);
    }
  }, [isScriptReady, center, polygon, stageColor, currentStatus, projectName, district, address, projectType, naverUrl]);

  // Toggle Naver Cadastral (네이버 순정 지적편집도)
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

  // Toggle Naver Satellite (네이버 순정 위성/하이브리드 지도)
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

  // Reset Center
  const handleResetCenter = () => {
    const naver = (window as any).naver;
    const map = mapInstanceRef.current;
    if (!naver?.maps || !map) return;

    map.panTo(new naver.maps.LatLng(center.lat, center.lng));
    map.setZoom(16);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-black/10 bg-[#f7f7f4] shadow-sm">
      {/* Naver Maps Open API Script */}
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />

      {/* Map Element */}
      <div ref={mapElement} className="w-full h-[380px] sm:h-[430px] z-0" />

      {/* Top Map Controls Overlay */}
      <div className="absolute top-3 left-3 z-[100] flex flex-wrap items-center gap-2 pointer-events-auto">
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
      <div className="absolute bottom-3 left-3 right-3 z-[100] flex items-center justify-between pointer-events-auto bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-black/10 shadow-sm text-xs">
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
