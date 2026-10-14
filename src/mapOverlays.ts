import type { Map, GeoJSONSource } from "maplibre-gl";
import {
  ports,
  routes,
  vesselGeoJSON,
  selectedRoute,
  type Vessel,
  type Port,
} from "./data";
export type Layers = {
  vessels: boolean;
  ports: boolean;
  routes: boolean;
  vesselLabels: boolean;
  portLabels: boolean;
};
export type OverlayState = {
  vessels: Vessel[];
  layers: Layers;
  selected: Vessel | null;
  selectedPort: Port | null;
  showRoute: boolean;
};
const empty = { type: "FeatureCollection" as const, features: [] };
const previous = new WeakMap<Map, OverlayState>();
export function installOverlays(map: Map, state: OverlayState) {
  // Style replacement clears sources. Install once for each new style, with current UI state.
  if (map.getSource("be-vessels")) return;
  previous.delete(map);
  map.addSource("be-vessels", {
    type: "geojson",
    data: vesselGeoJSON(state.vessels),
    cluster: true,
    clusterRadius: 42,
    clusterMaxZoom: 10,
  });
  map.addSource("be-ports", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: ports.map((p) => ({
        type: "Feature",
        properties: { id: p.id, name: p.name },
        geometry: { type: "Point", coordinates: p.coordinates },
      })),
    },
  });
  map.addSource("be-routes", { type: "geojson", data: routes });
  map.addSource("be-selected-route", {
    type: "geojson",
    data: selectedRoute(state.showRoute ? state.selected : null),
  });
  map.addSource("be-selection", { type: "geojson", data: empty });
  map.addLayer({
    id: "be-routes",
    type: "line",
    source: "be-routes",
    paint: {
      "line-color": "#36b9c9",
      "line-width": 1.5,
      "line-opacity": 0.6,
      "line-dasharray": [3, 4],
    },
  });
  map.addLayer({
    id: "be-selected-route",
    type: "line",
    source: "be-selected-route",
    paint: {
      "line-color": "#f7ce85",
      "line-width": 3,
      "line-opacity": 0.9,
      "line-dasharray": [2, 2],
    },
  });
  map.addLayer({
    id: "be-clusters",
    type: "circle",
    source: "be-vessels",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#133f4b",
      "circle-stroke-color": "#50caca",
      "circle-stroke-width": 1.5,
      "circle-radius": ["step", ["get", "point_count"], 17, 50, 23, 150, 29],
    },
  });
  map.addLayer({
    id: "be-cluster-labels",
    type: "symbol",
    source: "be-vessels",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#bff9f3" },
  });
  map.addLayer({
    id: "be-vessels",
    type: "circle",
    source: "be-vessels",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 5,
      "circle-color": [
        "match",
        ["get", "type"],
        "Tanker",
        "#f2b963",
        "Container",
        "#b69afc",
        "Support",
        "#65aaff",
        "#4ee0c1",
      ],
      "circle-stroke-color": "#0a202b",
      "circle-stroke-width": 1.5,
    },
  });
  map.addLayer({
    id: "be-vessel-labels",
    type: "symbol",
    source: "be-vessels",
    filter: ["!", ["has", "point_count"]],
    minzoom: 8,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-offset": [0, 1.3],
    },
    paint: {
      "text-color": "#e4edf3",
      "text-halo-color": "#0b1823",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: "be-ports",
    type: "circle",
    source: "be-ports",
    paint: {
      "circle-radius": 7,
      "circle-color": "#122b3d",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "be-port-labels",
    type: "symbol",
    source: "be-ports",
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-offset": [0, 1.5],
    },
    paint: {
      "text-color": "#d2e7f2",
      "text-halo-color": "#091521",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: "be-selection",
    type: "circle",
    source: "be-selection",
    paint: {
      "circle-radius": 13,
      "circle-color": "transparent",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  syncOverlays(map, state);
}
export function syncOverlays(map: Map, state: OverlayState) {
  if (!map.getSource("be-vessels")) return;
  const source = (id: string) => map.getSource(id) as GeoJSONSource;
  const before = previous.get(map);
  if (before?.vessels !== state.vessels)
    void source("be-vessels").setData(vesselGeoJSON(state.vessels));
  if (
    before?.selected !== state.selected ||
    before?.showRoute !== state.showRoute
  )
    void source("be-selected-route").setData(
      selectedRoute(state.showRoute ? state.selected : null),
    );
  const selectedPoint = state.selected
    ? { id: state.selected.id, coordinates: state.selected.coordinates }
    : state.selectedPort;
  if (
    before?.selected !== state.selected ||
    before?.selectedPort !== state.selectedPort
  )
    void source("be-selection").setData({
      type: "FeatureCollection",
      features: selectedPoint
        ? [
            {
              type: "Feature",
              properties: { id: selectedPoint.id },
              geometry: {
                type: "Point",
                coordinates: selectedPoint.coordinates,
              },
            },
          ]
        : [],
    });
  const visibility: Record<string, boolean> = {
    "be-vessels": state.layers.vessels,
    "be-clusters": state.layers.vessels,
    "be-cluster-labels": state.layers.vessels,
    "be-vessel-labels": state.layers.vessels && state.layers.vesselLabels,
    "be-ports": state.layers.ports,
    "be-port-labels": state.layers.ports && state.layers.portLabels,
    "be-routes": state.layers.routes,
    "be-selection": state.selected ? state.layers.vessels : state.layers.ports,
    "be-selected-route":
      state.layers.routes && state.showRoute && !!state.selected,
  };
  for (const [id, visible] of Object.entries(visibility))
    if (map.getLayer(id))
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  previous.set(map, state);
}
