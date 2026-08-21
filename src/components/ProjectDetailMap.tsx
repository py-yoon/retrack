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
  polygon: Coord[];
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
  const [mapMode, setMapMode] = useState<"naver" | "leaflet">("naver");
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isCadastralOn, setIsCadastralOn] = useState(false);
  const [mapType, setMapType] = useState<"normal" | "hybrid">("normal");

  // Naver Map Refs
  const naverMapRef = useRef<any>(null);
  const naverPolygonRef = useRef<any>(null);
  const naverMarkerRef = useRef<any>(null);
  const naverCadastralRef = useRef<any>(null);
  const naverInfoWindowRef = useRef<any>(null);

  // Leaflet Map Refs
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletPolygonRef = useRef<L.Polygon | null>(null);
  const leafletCadastralLayerRef = useRef<L.TileLayer | null>(null);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "nbhyehsios";
  const stageColor = getStageColor(currentStatus);
  const naverUrl = getNaverMapUrl(district, address, projectName);

  // Check if Naver script is already in window
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).naver?.maps) {
      setIsScriptLoaded(true);
    }
  }, []);

  // 1. Try Naver Map Initialization
  useEffect(() => {
    const naver = (window as any).naver;
    if (!isScriptLoaded || !mapElement.current || !naver?.maps || mapMode !== "naver") return;

    try {
      if (!naverMapRef.current) {
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

        // Polygon
        if (polygon.length >= 3) {
          const paths = polygon.map((p) => new naver.maps.LatLng(p.lat, p.lng));
          const naverPolygon = new naver.maps.Polygon({
            map: map,
            paths: paths,
            fillColor: stageColor,
            fillOpacity: 0.4,
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
            naverPolygon.setOptions({ fillOpacity: 0.4, strokeWeight: 3 });
          });
        }

        // Custom Marker
        const markerContent = `
          <div style="transform: translate(-50%, -100%); cursor: pointer; text-align: center;">
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
              <span style="font-size: 11px; color: #10b981; font-weight: 600;">✓ 구역 폴리곤 적용</span>
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

        naverInfoWindowRef.current = infoWindow;

        naver.maps.Event.addListener(marker, "click", () => infoWindow.open(map, marker));
        if (naverPolygonRef.current) {
          naver.maps.Event.addListener(naverPolygonRef.current, "click", () => infoWindow.open(map, marker));
        }
      }
    } catch {
      // If Naver Map auth fails, fallback to Leaflet
      setMapMode("leaflet");
    }
  }, [isScriptLoaded, mapMode, center, polygon, currentStatus, district, address, projectName, projectType, stageColor, naverUrl]);

  // 2. Leaflet Fallback Initialization (100% Guaranteed to work anywhere)
  useEffect(() => {
    if (mapMode !== "leaflet" || !mapElement.current || leafletMapRef.current) return;

    const map = L.map(mapElement.current, {
      center: [center.lat, center.lng],
      zoom: 16,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    // Vworld / OpenStreetMap tile
    const baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Polygon
    if (polygon.length >= 3) {
      const latlngs: [number, number][] = polygon.map((p) => [p.lat, p.lng]);
      const poly = L.polygon(latlngs, {
        color: stageColor,
        weight: 3,
        fillColor: stageColor,
        fillOpacity: 0.4,
      }).addTo(map);

      poly.bindPopup(`
        <div style="padding: 6px; font-family: sans-serif;">
          <b style="color:${stageColor}">${currentStatus ?? "정비사업"}</b><br/>
          <strong>${projectName}</strong><br/>
          <small>${district ?? ""} ${address ?? ""}</small><br/>
          <a href="${naverUrl}" target="_blank" style="color:#059669; font-weight:bold; font-size:11px;">네이버 지도 앱 열기 ↗</a>
        </div>
      `);

      leafletPolygonRef.current = poly;
    }

    // Center Marker
    const icon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="transform: translate(-50%, -100%); text-align: center; white-space: nowrap;">
          <span style="background: #171918; color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${stageColor}; margin-right:4px;"></span>
            ${projectName}
          </span>
        </div>
      `,
      iconSize: [0, 0],
    });

    L.marker([center.lat, center.lng], { icon }).addTo(map);

    leafletMapRef.current = map;
  }, [mapMode, center, polygon, stageColor, currentStatus, projectName, district, address, naverUrl]);

  // Toggle Cadastral (지적도)
  const toggleCadastral = () => {
    if (mapMode === "naver" && naverMapRef.current) {
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
    } else if (mapMode === "leaflet" && leafletMapRef.current) {
      // Vworld Cadastral WMS Layer
      if (!leafletCadastralLayerRef.current) {
        leafletCadastralLayerRef.current = L.tileLayer(
          "https://api.vworld.kr/req/wmts/1.0.0/CEB21B72-9E11-37E1-B5B3-7313627DFACF/Cadastral/{z}/{y}/{x}.png",
          { maxZoom: 19, opacity: 0.6 }
        );
      }
      if (isCadastralOn) {
        leafletMapRef.current.removeLayer(leafletCadastralLayerRef.current);
        setIsCadastralOn(false);
      } else {
        leafletCadastralLayerRef.current.addTo(leafletMapRef.current);
        setIsCadastralOn(true);
      }
    }
  };

  // Toggle Satellite (위성지도)
  const toggleMapType = () => {
    if (mapMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      if (mapType === "normal") {
        naverMapRef.current.setMapTypeId(naver.maps.MapTypeId.HYBRID);
        setMapType("hybrid");
      } else {
        naverMapRef.current.setMapTypeId(naver.maps.MapTypeId.NORMAL);
        setMapType("normal");
      }
    }
  };

  // Reset Center
  const handleResetCenter = () => {
    if (mapMode === "naver" && naverMapRef.current) {
      const naver = (window as any).naver;
      naverMapRef.current.panTo(new naver.maps.LatLng(center.lat, center.lng));
      naverMapRef.current.setZoom(16);
    } else if (mapMode === "leaflet" && leafletMapRef.current) {
      leafletMapRef.current.setView([center.lat, center.lng], 16);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-black/10 bg-[#f7f7f4] shadow-sm">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
        onError={() => {
          console.warn("Naver Map Script load failed, switching to Leaflet.");
          setMapMode("leaflet");
        }}
      />

      {/* Map Canvas */}
      <div ref={mapElement} className="w-full h-[380px] sm:h-[430px] z-0" />

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

        {mapMode === "naver" && (
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
        )}

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
          <span>네이버 지도 앱에서 보기</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  );
}
