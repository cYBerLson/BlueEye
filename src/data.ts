import type { FeatureCollection, Point, LineString } from "geojson";
export type Port = {
  id: string;
  name: string;
  coordinates: [number, number];
  region: string;
};
export const ports: Port[] = [
  { id: "apapa", name: "Apapa", coordinates: [3.363, 6.435], region: "Lagos" },
  {
    id: "tincan",
    name: "Tin Can Island",
    coordinates: [3.345, 6.43],
    region: "Lagos",
  },
  {
    id: "lekki",
    name: "Lekki Deep Sea",
    coordinates: [4.006, 6.425],
    region: "Lagos",
  },
  { id: "onne", name: "Onne", coordinates: [7.153, 4.684], region: "Rivers" },
  {
    id: "ph",
    name: "Port Harcourt",
    coordinates: [7.005, 4.762],
    region: "Rivers",
  },
  { id: "warri", name: "Warri", coordinates: [5.733, 5.516], region: "Delta" },
  {
    id: "calabar",
    name: "Calabar",
    coordinates: [8.312, 4.958],
    region: "Cross River",
  },
];
export const routes: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    [
      [-0.02, 5.58],
      [1.2, 5.3],
      [2.5, 5.6],
      [3.363, 6.435],
    ],
    [
      [3.363, 6.435],
      [3.5, 5.8],
      [4.8, 4.3],
      [6.3, 3.9],
      [7.153, 4.684],
    ],
    [
      [7.153, 4.684],
      [7.5, 4.1],
      [8.2, 4.2],
      [8.312, 4.958],
    ],
    [
      [4.006, 6.425],
      [4.1, 5.5],
      [3.4, 3.0],
      [1.5, 0.5],
    ],
  ].map((coordinates, i) => ({
    type: "Feature",
    properties: { id: i },
    geometry: { type: "LineString", coordinates },
  })),
};
export type Vessel = {
  id: string;
  name: string;
  type: string;
  coordinates: [number, number];
  speed: number;
  heading: number;
  destination: string;
  status: string;
  routeId: number | null;
};
let seed = 421;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
export const vessels: Vessel[] = Array.from({ length: 1200 }, (_, i) => {
  const route =
    routes.features[i % routes.features.length].geometry.coordinates;
  const segment = Math.floor(random() * (route.length - 1)),
    t = random();
  const a = route[segment],
    b = route[segment + 1];
  const anchored = i % 7 === 0;
  const port = ports[i % ports.length];
  return {
    id: `SIM-${String(i + 1).padStart(4, "0")}`,
    name: `${["Atlantic", "Ocean", "Gulf", "Lagos", "Horizon", "Coastal"][i % 6]} ${["Spirit", "Meridian", "Voyager", "Pioneer", "Pearl"][i % 5]} ${i + 1}`,
    type: ["Cargo", "Tanker", "Container", "Support"][i % 4],
    coordinates: anchored
      ? [
          port.coordinates[0] + (random() - 0.5) * 0.08,
          port.coordinates[1] - 0.08 - random() * 0.04,
        ]
      : [
          a[0] + (b[0] - a[0]) * t + (random() - 0.5) * 0.12,
          a[1] + (b[1] - a[1]) * t + (random() - 0.5) * 0.12,
        ],
    speed: anchored ? 0 : Math.round((8 + random() * 10) * 10) / 10,
    heading: Math.round(random() * 359),
    destination: port.name,
    status: anchored ? "At anchor" : "Under way",
    routeId: anchored ? null : i % routes.features.length,
  };
});
export type Bounds = [number, number, number, number];
export function inBounds(v: Vessel, b: Bounds) {
  const [x, y] = v.coordinates;
  return (
    y >= b[1] &&
    y <= b[3] &&
    (b[0] <= b[2] ? x >= b[0] && x <= b[2] : x >= b[0] || x <= b[2])
  );
}
export function filterVessels(
  items: Vessel[],
  query: string,
  type: string,
  status = "All statuses",
) {
  const q = query.trim().toLowerCase();
  return items.filter(
    (v) =>
      (type === "All vessels" || v.type === type) &&
      (status === "All statuses" || v.status === status) &&
      `${v.name} ${v.id} ${v.destination}`.toLowerCase().includes(q),
  );
}
export function vesselGeoJSON(items: Vessel[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((v) => ({
      type: "Feature",
      id: v.id,
      properties: { id: v.id, name: v.name, type: v.type, heading: v.heading },
      geometry: { type: "Point", coordinates: v.coordinates },
    })),
  };
}
export function selectedRoute(v: Vessel | null): FeatureCollection<LineString> {
  const route = v?.routeId == null ? undefined : routes.features[v.routeId];
  return { type: "FeatureCollection", features: route ? [route] : [] };
}
export function distanceNm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad,
    dLon = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function portActivity(port: Port, items = vessels) {
  const nearby = items.filter(
    (v) => distanceNm(v.coordinates, port.coordinates) <= 30,
  );
  const anchored = nearby.filter((v) => v.status === "At anchor");
  const underway = nearby.filter((v) => v.status === "Under way");
  // Destination plus underway status is a simulation proxy, not an observed approach or ETA.
  const approaching = nearby.filter(
    (v) => v.speed > 0 && v.destination === port.name,
  );
  return { nearby, anchored, approaching, underway };
}
export type ScenarioMode = "demo" | "stress";
// A modest presentation scenario. The original seeded 1,200-vessel stress fleet remains unchanged.
export const demoVessels: Vessel[] = Array.from({ length: 84 }, (_, i) => {
  const original = vessels[i * 13];
  if (original.status !== "At anchor")
    return {
      ...original,
      destination: [ports[0], ports[3], ports[6], ports[2]][original.routeId!]
        .name,
    };
  const port = ports[Math.floor(i / 7) % ports.length];
  return {
    ...original,
    destination: port.name,
    coordinates: [
      port.coordinates[0] + ((i % 3) - 1) * 0.018,
      port.coordinates[1] - 0.08 - (i % 4) * 0.01,
    ],
  };
});
export function scenarioFleet(mode: ScenarioMode) {
  return mode === "stress" ? vessels : demoVessels;
}
export function formatCoordinates(lng: number, lat: number) {
  return `${Math.abs(lat).toFixed(4).padStart(7, "0")}° ${lat < 0 ? "S" : "N"} · ${Math.abs(lng).toFixed(4).padStart(8, "0")}° ${lng < 0 ? "W" : "E"}`;
}
export function loadViewport(
  bounds: Bounds,
  signal: AbortSignal,
  items: Vessel[] = vessels,
): Promise<Vessel[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve(items.filter((v) => inBounds(v, bounds)));
    }, 80);
    function abort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
