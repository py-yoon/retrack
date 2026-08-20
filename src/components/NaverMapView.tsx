"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
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
  return "#6b7280";
}

interface NaverMapInstance {
  setCenter: (latlng: unknown) => void;
  panTo: (latlng: unknown) => void;
}

interface NaverMarkerInstance {
  setMap: (map: unknown) => void;
}

interface NaverInfoWindowInstance {
  setContent: (content: string) => void;
  open: (map: unknown, marker: unknown) => void;
}

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMapInstance;
        Marker: new (options: Record<string, unknown>) => NaverMarkerInstance;
        InfoWindow: new (options: Record<string, unknown>) => NaverInfoWindowInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        Size: new (width: number, height: number) => unknown;
        Point: new (x: number, y: number) => unknown;
        Position: {
          TOP_RIGHT: unknown;
          TOP_LEFT: unknown;
        };
        Event: {
          addListener: (target: unknown, eventName: string, listener: () => void) => void;
        };
      };
    };
  }
}

export default function NaverMapView({
  projects,
  selectedProject,
  onSelectProject,
  selectedDistrict,
}: NaverMapViewProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<NaverMapInstance | null>(null);
  const markersRef = useRef<NaverMarkerInstance[]>([]);
  const infoWindowRef = useRef<NaverInfoWindowInstance | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "nbhyehsios";

  // Initialize Naver Map once script is loaded
  useEffect(() => {
    const naver = window.naver;
    if (!isScriptLoaded || !mapElement.current || !naver?.maps) return;

    if (!mapInstance.current) {
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
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: naver.maps.Position.TOP_LEFT,
        },
      });

      infoWindowRef.current = new naver.maps.InfoWindow({
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        disableAnchor: false,
      });

      mapInstance.current = map;
    }
  }, [isScriptLoaded]);

  // Render Markers on Naver Map
  useEffect(() => {
    const map = mapInstance.current;
    const naver = window.naver;
    if (!map || !naver?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const newMarkers = projects.map((p) => {
      const color = getStageColor(p.current_status);
      const isSelected = selectedProject?.id === p.id;

      // Custom Naver HTML Marker Content
      const markerContent = `
        <div style="position: relative; width: ${isSelected ? "28px" : "20px"}; height: ${isSelected ? "28px" : "20px"}; cursor: pointer; transition: transform 0.2s;">
          ${
            p.hasRecentEvent
              ? `<div style="position: absolute; inset: -6px; border-radius: 9999px; background-color: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ""
          }
          <div style="
            width: 100%; 
            height: 100%; 
            border-radius: 9999px; 
            background-color: ${color}; 
            border: ${isSelected ? "3px solid #171918" : "2px solid #ffffff"}; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
      `;

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(p.lat, p.lng),
        map: map,
        icon: {
          content: markerContent,
          size: new naver.maps.Size(isSelected ? 28 : 20, isSelected ? 28 : 20),
          anchor: new naver.maps.Point(isSelected ? 14 : 10, isSelected ? 14 : 10),
        },
      });

      naver.maps.Event.addListener(marker, "click", () => {
        onSelectProject(p);
        const naverUrl = getNaverMapUrl(p.district, p.address, p.name);
        const contentString = `
          <div style="padding: 12px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="font-size: 11px; font-weight: bold; color: ${color}; margin-bottom: 2px;">
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
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(map, marker);
        }
      });

      return marker;
    });

    markersRef.current = newMarkers;
  }, [projects, selectedProject, onSelectProject]);

  // Pan to selected project
  useEffect(() => {
    const map = mapInstance.current;
    const naver = window.naver;
    if (!map || !selectedProject || !naver?.maps) return;

    const targetPos = new naver.maps.LatLng(selectedProject.lat, selectedProject.lng);
    map.panTo(targetPos);
  }, [selectedProject]);

  // Pan to selected district
  useEffect(() => {
    const map = mapInstance.current;
    const naver = window.naver;
    if (!map || !naver?.maps) return;

    if (selectedDistrict && selectedDistrict !== "전체 자치구" && DISTRICT_COORDINATES[selectedDistrict]) {
      const coord = DISTRICT_COORDINATES[selectedDistrict];
      const targetPos = new naver.maps.LatLng(coord.lat, coord.lng);
      map.panTo(targetPos);
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-black/5 bg-[#f5f5f1]">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`}
        onLoad={() => setIsScriptLoaded(true)}
      />

      <div ref={mapElement} className="w-full h-full min-h-[500px]" />

      {!isScriptLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f7f7f4] text-xs text-[#777a76] gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span>네이버 지도 API를 불러오는 중입니다...</span>
        </div>
      )}
    </div>
  );
}
