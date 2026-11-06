"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { LocateFixed, Search, Navigation, Phone } from "lucide-react";
import { Button, Input, Select, Alert, Badge } from "@/components/ui";

export interface Place { id: string; name: string; category: string; lat: number; lng: number; phone?: string | null; address?: string | null; source: "vanguard" | "osm"; reviewed?: string; verification?: string }

const OSM_FILTERS: Record<string, string> = {
  hospital: 'nwr["amenity"="hospital"]', clinic: 'nwr["amenity"~"clinic|doctors"]', fire: 'nwr["amenity"="fire_station"]', police: 'nwr["amenity"="police"]',
};
const LABEL: Record<string, string> = { hospital: "Hospital", clinic: "Clinic", fire: "Fire station", police: "Police", evacuation: "Evacuation facility", drrmo: "DRRM office", hotline: "Hotline", other: "Other" };
const COLOR: Record<string, string> = { hospital: "#dc2626", clinic: "#f97316", fire: "#b91c1c", police: "#1d4ed8", evacuation: "#0e9f8a", drrmo: "#0b1f3a", other: "#5b6b82", hotline: "#5b6b82" };

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function ServiceFinder({ curated }: { curated: Place[] }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>(curated);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !mapEl.current || map.current) return;
      try {
        const m = new maplibregl.Map({ container: mapEl.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [122.0, 12.3], zoom: 5, attributionControl: { compact: true } });
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        m.on("error", () => setMapError(true));
        map.current = m;
      } catch { setMapError(true); }
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, []);

  const visible = places
    .filter((p) => category === "all" || p.category === category)
    .map((p) => ({ ...p, km: center ? haversineKm(center, p) : null }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  useEffect(() => {
    if (!map.current) return;
    import("maplibre-gl").then((maplibregl) => {
      markers.current.forEach((m) => m.remove());
      markers.current = visible.slice(0, 200).map((p) => {
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;border-radius:9999px;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);background:${COLOR[p.category] ?? "#5b6b82"}`;
        el.setAttribute("aria-label", p.name);
        const popup = new maplibregl.Popup({ offset: 10 }).setText(`${p.name} (${LABEL[p.category] ?? p.category})`);
        return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map.current!);
      });
    });
  }, [visible.length, category, places]); // eslint-disable-line react-hooks/exhaustive-deps

  async function searchOsm(c: { lat: number; lng: number }) {
    setStatus("Searching OpenStreetMap for nearby facilities…");
    const radius = 8000;
    const body = `[out:json][timeout:25];(${Object.values(OSM_FILTERS).map((f) => `${f}(around:${radius},${c.lat},${c.lng});`).join("")});out center 150;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(body), headers: { "content-type": "application/x-www-form-urlencoded" } });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json() as { elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
      const osm: Place[] = json.elements.flatMap((e) => {
        const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon; const t = e.tags ?? {};
        if (lat == null || lng == null) return [];
        const cat = t.amenity === "hospital" ? "hospital" : t.amenity === "fire_station" ? "fire" : t.amenity === "police" ? "police" : "clinic";
        return [{ id: `osm-${e.type}-${e.id}`, name: t.name || LABEL[cat], category: cat, lat, lng, phone: t.phone || t["contact:phone"] || null, address: [t["addr:street"], t["addr:city"]].filter(Boolean).join(", ") || null, source: "osm" as const }];
      });
      setPlaces([...curated, ...osm]);
      setStatus(`Found ${osm.length} facilities from OpenStreetMap within ${radius / 1000} km.`);
    } catch {
      setStatus("Couldn't reach OpenStreetMap right now. Showing Vanguard's curated directory only.");
    }
  }

  function focus(c: { lat: number; lng: number }) {
    setCenter(c);
    map.current?.flyTo({ center: [c.lng, c.lat], zoom: 13 });
    searchOsm(c);
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setStatus("Location isn't available in this browser. Search for a place instead."); return; }
    setStatus("Getting your location… (used only in your browser, not saved)");
    navigator.geolocation.getCurrentPosition((pos) => focus({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setStatus("Location permission denied. Search for a city or barangay instead."), { enableHighAccuracy: false, timeout: 10000 });
  }

  async function geocode(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus("Looking up location…");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`);
      const r = await res.json() as { lat: string; lon: string; display_name: string }[];
      if (!r.length) { setStatus("No matching place found in the Philippines."); return; }
      setStatus(`Showing results near ${r[0].display_name}`);
      focus({ lat: Number(r[0].lat), lng: Number(r[0].lon) });
    } catch { setStatus("Location search is unavailable (are you offline?)."); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <form onSubmit={geocode} className="flex gap-2" role="search">
          <label htmlFor="loc" className="sr-only">City or barangay</label>
          <Input id="loc" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="City, barangay or landmark" className="w-64" />
          <Button variant="outline"><Search />Search</Button>
        </form>
        <Button variant="secondary" onClick={useMyLocation}><LocateFixed />Use my location</Button>
        <label htmlFor="cat" className="sr-only">Category</label>
        <Select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
          <option value="all">All facility types</option>{Object.entries(LABEL).filter(([k]) => k !== "hotline").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      {status && <p className="text-sm text-muted" role="status">{status}</p>}
      <div ref={mapEl} className="h-80 w-full overflow-hidden rounded-xl border border-line bg-surface sm:h-96" role="region" aria-label="Map of emergency services" />
      {mapError && <Alert tone="warning">The map could not load (you may be offline). The list below still works.</Alert>}
      <Alert tone="education">Facility locations come from Vanguard&apos;s curated directory and, when you search, from OpenStreetMap (community-maintained; may be incomplete or out of date). Listings do not indicate whether a facility is open, safe or accepting people. In an emergency call 911.</Alert>
      <ul className="grid gap-3 sm:grid-cols-2">
        {visible.slice(0, 60).map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="blue">{LABEL[p.category] ?? p.category}</Badge>
              {p.source === "osm" ? <Badge>OpenStreetMap · unverified</Badge> : <Badge tone={p.verification === "verified" ? "green" : "amber"}>Vanguard directory · {p.verification}</Badge>}
              {p.km != null && <span className="text-xs text-muted">{p.km.toFixed(1)} km</span>}</div>
            <p className="mt-2 font-medium">{p.name}</p>
            {p.address && <p className="text-xs text-muted">{p.address}</p>}
            {p.reviewed && <p className="text-xs text-muted">Last reviewed {p.reviewed}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {p.phone && <a className="flex items-center gap-1 text-brand-700 underline" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}><Phone className="size-3.5" />{p.phone}</a>}
              <a className="flex items-center gap-1 text-brand-700 underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}><Navigation className="size-3.5" />Directions</a>
              <a className="text-brand-700 underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`}>OpenStreetMap</a>
            </div>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="text-sm text-muted">No facilities to show yet. Search a location or use your location.</p>}
      <p className="text-xs text-muted">Map data © OpenStreetMap contributors (ODbL). Map tiles by OpenFreeMap.</p>
    </div>
  );
}
