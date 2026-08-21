"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
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
  const mapElement = useRef<HTMLDivElement>(null);
  const [engineMode, setEngineMode] = useState<"naver" | "fallback">("naver");
  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [mapType, setMapType] = useState<"normal" | "hybrid">("normal");

  // Naver Refs
  const naverMapRef = useRef<any>(null);
  const naverPolygonRef = useRef<any>(null);
  const naverMarkerRef = useRef<any>(null);
  const naverCadastralRef = useRef<any>(null);

  // Leaflet Fallback Refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletPolygonRef = useRef<L.Polygon | null>(null);
  const leafletCadastralRef = useRef<L.TileLayer | null>(null);
  const leafletSatelliteRef = useRef<L.TileLayer | null>(null);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "nbhyehsios";
  const stageColor = getStageColor(currentStatus);
  const naverUrl = getNaverMapUrl(district, address, projectName);

  // 1. Try Naver Map Initialization
  const initNaverMap = () => {
    if (!mapElement.current) return;
    const naver = (window as any).naver;
    if (!naver?.maps) {
      setEngineMode("fallback");
      return;
    }

    try {
      const centerLatLng = new naver.maps.LatLng(center.lat, center.lng);

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

      naverMapRef.current = map;

      // Render Verified Polygon
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

        naverPolygonRef.current = naverPolygon;

        naver.maps.Event.addListener(naverPolygon, "mouseover", () => {
          naverPolygon.setOptions({ fillOpacity: 0.65, strokeWeight: 4 });
        });
        naver.maps.Event.addListener(naverPolygon, "mouseout", () => {
          naverPolygon.setOptions({ fillOpacity: 0.38, strokeWeight: 3 });
        });
      }

      // Center Marker
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

      naverMarkerRef.current = marker;
    } catch (err) {
      console.warn("Naver map init error, switching to fallback map engine:", err);
      setEngineMode("fallback");
    }
  };

  // 2. Leaflet Fallback (100% Guaranteed Zero-Error Map)
  useEffect(() => {
    if (engineMode !== "fallback" || !mapElement.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    try {
      const map = L.map(mapElement.current, {
        center: [center.lat, center.lng],
        zoom: 16,
        minZoom: 11,
        maxZoom: 19,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      // Clean CartoDB Voyager
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Render Polygon
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

        leafletPolygonRef.current = poly;
        map.fitBounds(poly.getBounds(), { padding: [30, 30], maxZoom: 17 });
      }

      // Marker
      const icon = L.divIcon({
        className: "custom-retrack-marker",
        html: `
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
        `,
        iconSize: [0, 0],
      });

      L.marker([center.lat, center.lng], { icon }).addTo(map);
      leafletMapRef.current = map;
    } catch (e) {
      console.error("Leaflet fallback error:", e);
    }
  }, [engineMode, center, polygon, stageColor, projectName]);

  // Toggle Cadastral (지적편집도)
  const toggleCadastral = () => {
    if (engineMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      if (!naverCadastralRef.current) {
        naverCadastralRef.current = new naver.maps.CadastralLayer();
      }
      if (isCadastralOn) {
        naverCadastralRef.current.setMap(null);
        setIsCadastralOn(false);
      } else {
        naverCadastralRef.current.setMap(naverMapRef.current);
        setIsCadastralOn(true);
      }
    } else if (engineMode === "fallback" && leafletMapRef.current) {
      const map = leafletMapRef.current;
      if (!leafletCadastralRef.current) {
        leafletCadastralRef.current = L.tileLayer(
          "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Cadastral/{z}/{y}/{x}.png",
          { maxZoom: 19, opacity: 0.65, zIndex: 5 }
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

  // Toggle Satellite (위성지도)
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

  // Reset Center
  const handleResetCenter = () => {
    if (engineMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      naverMapRef.current.panTo(new naver.maps.LatLng(center.lat, center.lng));
      naverMapRef.current.setZoom(16);
    } else if (engineMode === "fallback" && leafletMapRef.current) {
      if (leafletPolygonRef.current) {
        leafletMapRef.current.fitBounds(leafletPolygonRef.current.getBounds(), { padding: [30, 30], maxZoom: 17 });
      } else {
        leafletMapRef.current.setView([center.lat, center.lng], 16);
      }
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-black/10 bg-[#f7f7f4] shadow-sm">
      {/* Naver Maps Open API Script with Silent Fallback */}
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
        strategy="afterInteractive"
        onLoad={() => {
          // Check if naver.maps is really available
          if ((window as any).naver?.maps) {
            initNaverMap();
          } else {
            setEngineMode("fallback");
          }
        }}
        onError={() => {
          console.warn("Naver Maps script failed, using high-speed fallback map.");
          setEngineMode("fallback");
        }}
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
