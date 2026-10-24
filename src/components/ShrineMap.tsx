"use client";

/**
 * 地図表示コンポーネント
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY があれば Google Maps を、
 * 未設定なら OpenStreetMap の埋め込み地図を表示する（APIキーなしで動作確認できるようにするため）。
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type MapMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind?: "shrine" | "current" | "visited";
};

type Props = {
  markers: MapMarker[];
  center?: { latitude: number; longitude: number } | null;
  height?: number;
  zoom?: number;
  className?: string;
};

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

declare global {
  interface Window {
    google?: any;
    __kamitabichoMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__kamitabichoMapsPromise) return window.__kamitabichoMapsPromise;

  window.__kamitabichoMapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=ja&region=JP`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps の読み込みに失敗しました。APIキーを確認してください。"));
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return window.__kamitabichoMapsPromise;
}

function osmUrl(markers: MapMarker[], center: { latitude: number; longitude: number }, zoomHint: number) {
  const lats = markers.map((m) => m.latitude).concat(center.latitude);
  const lngs = markers.map((m) => m.longitude).concat(center.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  // 単一点のときは 0.01 度（約1km）の余白を作る
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.008) * 1.8 + zoomHint * 0.002;
  const bbox = [minLng - span, minLat - span, maxLng + span, maxLat + span].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.latitude},${center.longitude}`;
}

export default function ShrineMap({ markers, center, height = 240, zoom = 14, className = "" }: Props) {
  const containerId = useId().replace(/[:]/g, "_");
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [failed, setFailed] = useState(false);

  const focus = center ?? (markers[0] ? { latitude: markers[0].latitude, longitude: markers[0].longitude } : null);

  // マーカー配列は毎回新しい参照になるため、内容のキーで再描画を判定する
  const markersKey = useMemo(
    () => JSON.stringify(markers.map((m) => [m.id, m.latitude, m.longitude, m.kind])),
    [markers],
  );
  const latestMarkers = useRef(markers);
  latestMarkers.current = markers;

  useEffect(() => {
    if (!MAPS_KEY || !focus) return;
    let cancelled = false;

    loadGoogleMaps(MAPS_KEY)
      .then(() => {
        if (cancelled || !window.google?.maps) return;
        const g = window.google.maps;
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!mapRef.current) {
          mapRef.current = new g.Map(el, {
            center: { lat: focus.latitude, lng: focus.longitude },
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: "cooperative",
          });
        } else {
          mapRef.current.setCenter({ lat: focus.latitude, lng: focus.longitude });
        }
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = latestMarkers.current.map((m) => {
          const isCurrent = m.kind === "current";
          return new g.Marker({
            map: mapRef.current,
            position: { lat: m.latitude, lng: m.longitude },
            title: m.name,
            ...(isCurrent
              ? { icon: { path: g.SymbolPath.CIRCLE, scale: 9, fillColor: "#2f4058", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 } }
              : {}),
          });
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [containerId, focus?.latitude, focus?.longitude, markersKey, zoom]);

  // APIキーがない / 読み込み失敗時は OpenStreetMap の埋め込み地図を使う
  if (!MAPS_KEY || failed) {
    if (!focus) {
      return (
        <div
          className={`wa-card flex items-center justify-center text-sumi-mute text-sm ${className}`}
          style={{ height }}
        >
          位置情報を取得すると地図が表示されます
        </div>
      );
    }
    return (
      <div className={`wa-card overflow-hidden ${className}`}>
        <iframe
          title="地図"
          src={osmUrl(markers, focus, zoom)}
          style={{ height, width: "100%", border: 0 }}
          loading="lazy"
        />
        <p className="px-3 py-2 text-[0.72rem] leading-snug text-sumi-mute bg-washi-deep">
          簡易地図（OpenStreetMap）。Google Maps API キーを設定すると Google マップ表示に切り替わります。
        </p>
      </div>
    );
  }

  return (
    <div className={`wa-card overflow-hidden ${className}`}>
      <div id={containerId} style={{ height, width: "100%" }} />
    </div>
  );
}
