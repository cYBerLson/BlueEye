import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap, LayerSpecification } from "maplibre-gl";
import {
  installOverlays,
  syncOverlays,
  type OverlayState,
} from "./mapOverlays";
import { ports, vessels } from "./data";
function harness() {
  const sources = new Map<
    string,
    { data: unknown; setData: ReturnType<typeof vi.fn> }
  >();
  const layers = new Map<
    string,
    LayerSpecification & { layout?: Record<string, unknown> }
  >();
  const api = {
    getSource: (id: string) => sources.get(id),
    getLayer: (id: string) => layers.get(id),
    addSource: (id: string, spec: { data: unknown }) => {
      if (sources.has(id)) throw new Error("Duplicate source");
      const s = {
        data: spec.data,
        setData: vi.fn((data: unknown) => {
          s.data = data;
          return Promise.resolve();
        }),
      };
      sources.set(id, s);
    },
    addLayer: (layer: LayerSpecification) => {
      if (layers.has(layer.id)) throw new Error("Duplicate layer");
      layers.set(layer.id, layer);
    },
    setLayoutProperty: (id: string, key: string, value: unknown) => {
      const layer = layers.get(id)!;
      layer.layout = { ...layer.layout, [key]: value };
    },
  };
  return { map: api as unknown as MapLibreMap, sources, layers };
}
const state: OverlayState = {
  vessels: [vessels[1]],
  selected: vessels[1],
  selectedPort: null,
  showRoute: true,
  layers: {
    vessels: true,
    ports: true,
    routes: true,
    vesselLabels: true,
    portLabels: false,
  },
};
describe("overlay lifecycle across basemap styles", () => {
  it("installs once and restores filtered fleet, selection, route and label settings after a style reset", () => {
    const h = harness();
    installOverlays(h.map, state);
    const sourceCount = h.sources.size,
      layerCount = h.layers.size;
    installOverlays(h.map, state);
    expect(h.sources.size).toBe(sourceCount);
    expect(h.layers.size).toBe(layerCount);
    h.sources.clear();
    h.layers.clear();
    installOverlays(h.map, state);
    expect(h.sources.get("be-vessels")!.data).toMatchObject({
      features: [{ id: "SIM-0002" }],
    });
    expect(h.sources.get("be-selection")!.data).toMatchObject({
      features: [{ properties: { id: "SIM-0002" } }],
    });
    expect(h.sources.get("be-selected-route")!.data).toMatchObject({
      features: [{ geometry: { type: "LineString" } }],
    });
    expect(h.layers.get("be-vessel-labels")!.layout?.visibility).toBe(
      "visible",
    );
    expect(h.layers.get("be-port-labels")!.layout?.visibility).toBe("none");
  });
  it("keeps the fleet source unchanged when only overlay visibility changes", () => {
    const h = harness();
    installOverlays(h.map, state);
    const source = h.sources.get("be-vessels")!;
    source.setData.mockClear();
    syncOverlays(h.map, {
      ...state,
      layers: { ...state.layers, vessels: false, routes: false },
    });
    expect(source.setData).not.toHaveBeenCalled();
    expect(h.layers.get("be-clusters")!.layout?.visibility).toBe("none");
    expect(h.layers.get("be-selected-route")!.layout?.visibility).toBe("none");
  });
  it("restores selected port highlighting without retaining the prior vessel route", () => {
    const h = harness();
    installOverlays(h.map, state);
    syncOverlays(h.map, {
      ...state,
      selected: null,
      selectedPort: ports[3],
      showRoute: false,
    });
    expect(h.sources.get("be-selection")!.data).toMatchObject({
      features: [{ properties: { id: "onne" } }],
    });
    expect(h.sources.get("be-selected-route")!.data).toMatchObject({
      features: [],
    });
  });
});
