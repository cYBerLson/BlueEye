import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatCoordinates, type Bounds } from "./data";
import { basemapProviders, loadBasemapStyle, type BasemapId } from "./basemaps";
import {
  installOverlays,
  syncOverlays,
  type OverlayState,
} from "./mapOverlays";
maplibregl.setWorkerUrl(workerUrl);
export type MapCommand = {
  sequence: number;
  kind: "fit" | "focus";
  coordinates?: [number, number];
};
type Props = OverlayState & {
  basemap: BasemapId;
  cursorCoordinates: boolean;
  command: MapCommand | null;
  onBounds: (b: Bounds) => void;
  onVessel: (id: string) => void;
  onPort: (id: string) => void;
  onBasemap: (id: BasemapId) => void;
};
const region: [[number, number], [number, number]] = [
  [-1.5, -0.5],
  [10, 8],
];
export default function MaritimeMap(props: Props) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    latest = useRef(props);
  const coordinateOutput = useRef<HTMLOutputElement>(null);
  const [message, setMessage] = useState<{
    kind: "loading" | "error" | "unavailable";
    text: string;
  } | null>({ kind: "loading", text: "Initializing maritime map…" });
  const [retry, setRetry] = useState(0),
    [instance, setInstance] = useState(0);
  const activeBasemap = useRef<BasemapId | null>(null),
    fitted = useRef(false),
    styleGeneration = useRef(0),
    commandHandled = useRef<number | null>(null);
  useEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current,
        center: [4.3, 4.8],
        zoom: 5.7,
        minZoom: 2,
        maxZoom: 18,
        attributionControl: { compact: false },
        locale: { "NavigationControl.ResetBearing": "Reset bearing / north" },
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "initial-background",
              type: "background",
              paint: { "background-color": "#0b1823" },
            },
          ],
        },
      });
    } catch {
      queueMicrotask(() => {
        if (!disposed)
          setMessage({
            kind: "error",
            text: "Map initialization failed. WebGL support is required.",
          });
      });
      return () => {
        disposed = true;
      };
    }
    map.current = m;
    m.setMissingStyleImageResolver(async (id) => {
      if (disposed || m.hasImage(id)) return;
      // OpenFreeMap's public sprites omit this deck texture in some styles.
      if (id === "wood-pattern") {
        const pixels = new Uint8Array(8 * 8 * 4);
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++)
            pixels.set(
              y % 4 === 0 ? [121, 115, 104, 255] : [155, 145, 126, 255],
              (y * 8 + x) * 4,
            );
        m.addImage(id, { width: 8, height: 8, data: pixels });
        return;
      }
      if (id !== "circle-11") return;
      const pixels = new Uint8Array(11 * 11 * 4);
      for (let y = 0; y < 11; y++)
        for (let x = 0; x < 11; x++)
          if ((x - 5) ** 2 + (y - 5) ** 2 <= 16)
            pixels.set([130, 150, 165, 255], (y * 11 + x) * 4);
      m.addImage(id, { width: 11, height: 11, data: pixels });
    });
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right",
    );
    m.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: "nautical" }),
      "bottom-left",
    );
    let pointerFrame = 0;
    const updateCoordinates = (event: maplibregl.MapMouseEvent) => {
      if (
        !latest.current.cursorCoordinates ||
        !matchMedia("(min-width:1025px)").matches ||
        pointerFrame
      )
        return;
      const { lng, lat } = event.lngLat;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (coordinateOutput.current)
          coordinateOutput.current.textContent = formatCoordinates(lng, lat);
      });
    };
    m.on("mousemove", updateCoordinates);
    const hideCoordinates = () => {
      if (coordinateOutput.current)
        coordinateOutput.current.textContent = "Move pointer over map";
    };
    m.getCanvas().addEventListener("mouseleave", hideCoordinates);
    if (document.fullscreenEnabled)
      m.addControl(
        new maplibregl.FullscreenControl({
          container: container.current.closest(".command") as HTMLElement,
        }),
        "top-right",
      );
    const publishBounds = () => {
      const b = m.getBounds();
      latest.current.onBounds([
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ]);
    };
    const executeCommand = () => {
      const c = latest.current.command;
      if (!c || commandHandled.current === c.sequence) return;
      commandHandled.current = c.sequence;
      const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 650;
      if (c.kind === "fit")
        m.fitBounds(region, { padding: 35, duration, bearing: 0, pitch: 0 });
      else if (c.coordinates)
        m.flyTo({ center: c.coordinates, zoom: 11, duration });
    };
    const onStyleLoad = () => {
      if (disposed || !activeBasemap.current) return;
      installOverlays(m, latest.current);
      if (!fitted.current) {
        m.fitBounds(region, { padding: 35, duration: 0 });
        fitted.current = true;
      }
      executeCommand();
      publishBounds();
    };
    m.on("style.load", onStyleLoad);
    m.on("moveend", publishBounds);
    // Register handlers once per map, not on every basemap style reload.
    for (const id of ["be-vessels", "be-clusters", "be-ports"]) {
      m.on("mouseenter", id, () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", id, () => {
        m.getCanvas().style.cursor = "";
      });
    }
    m.on("click", "be-vessels", (e) => {
      const id = e.features?.[0].properties.id;
      if (id) latest.current.onVessel(String(id));
    });
    m.on("click", "be-ports", (e) => {
      const id = e.features?.[0].properties.id;
      if (id) latest.current.onPort(String(id));
    });
    m.on("click", "be-clusters", async (e) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      const generation = styleGeneration.current;
      try {
        const source = m.getSource("be-vessels") as
          maplibregl.GeoJSONSource | undefined;
        if (!source) return;
        const zoom = await source.getClusterExpansionZoom(
          Number(f.properties.cluster_id),
        );
        if (!disposed && generation === styleGeneration.current)
          m.easeTo({
            center: f.geometry.coordinates as [number, number],
            zoom,
            duration: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 500,
          });
      } catch {
        if (!disposed && generation === styleGeneration.current)
          setMessage({
            kind: "error",
            text: "Cluster could not expand. Retry the basemap or use zoom controls.",
          });
      }
    });
    m.on("error", () => {
      if (!disposed)
        setMessage({
          kind: "error",
          text:
            activeBasemap.current === "satellite"
              ? "Satellite imagery could not load. Check provider access and tile configuration, or switch to a vector basemap."
              : "Basemap resources could not load. Your selections are retained. Retry or choose another basemap.",
        });
    });
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(container.current);
    queueMicrotask(() => {
      if (!disposed) setInstance((i) => i + 1);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(pointerFrame);
      m.getCanvas().removeEventListener("mouseleave", hideCoordinates);
      resize.disconnect();
      m.remove();
      map.current = null;
      fitted.current = false;
      activeBasemap.current = null;
      commandHandled.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || !instance) return;
    const provider = basemapProviders.find((p) => p.id === props.basemap)!;
    const controller = new AbortController();
    let cancelled = false;
    let applied = false;
    if (provider.unavailable) {
      queueMicrotask(() => {
        if (!cancelled)
          setMessage({
            kind: "unavailable",
            text: `${provider.unavailable} ${basemapProviders.find((p) => p.id === activeBasemap.current)?.name ?? "No basemap"} remains displayed.`,
          });
      });
      return () => {
        cancelled = true;
      };
    }
    const generation = ++styleGeneration.current;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        controller.abort();
        setMessage({
          kind: "error",
          text: `${provider.name} timed out. Retry or choose another basemap.`,
        });
      }
    }, 20000);
    queueMicrotask(() => {
      if (!cancelled)
        setMessage({
          kind: "loading",
          text: `Loading ${provider.name} basemap…`,
        });
    });
    loadBasemapStyle(provider, controller.signal)
      .then((style) => {
        if (cancelled) return;
        activeBasemap.current = provider.id;
        applied = true;
        // setStyle retains the existing map, camera and event handlers. Only one basemap is active.
        m.setStyle(style, { diff: false });
      })
      .catch((e) => {
        if (!cancelled && e.name !== "AbortError") {
          clearTimeout(timer);
          setMessage({
            kind: "error",
            text: `${provider.name} unavailable. Previous map retained. Retry or choose another basemap.`,
          });
        }
      });
    const onIdle = () => {
      if (
        cancelled ||
        !applied ||
        generation !== styleGeneration.current ||
        !m.getSource("be-vessels")
      )
        return;
      clearTimeout(timer);
      setMessage((current) => (current?.kind === "loading" ? null : current));
    };
    m.on("idle", onIdle);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      m.off("idle", onIdle);
    };
  }, [props.basemap, retry, instance]);
  useEffect(() => {
    if (map.current?.getSource("be-vessels"))
      syncOverlays(map.current, latest.current);
  }, [
    props.vessels,
    props.layers,
    props.selected,
    props.selectedPort,
    props.showRoute,
  ]);
  useEffect(() => {
    const m = map.current,
      c = props.command;
    if (!m || !c || !fitted.current || commandHandled.current === c.sequence)
      return;
    commandHandled.current = c.sequence;
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 650;
    if (c.kind === "fit")
      m.fitBounds(region, { padding: 35, bearing: 0, pitch: 0, duration });
    else if (c.coordinates)
      m.flyTo({ center: c.coordinates, zoom: 11, duration });
  }, [props.command]);
  return (
    <>
      <div
        ref={container}
        className="map-canvas"
        role="region"
        aria-label="Maritime Intelligence Map: Nigeria and Gulf of Guinea"
      />
      {props.cursorCoordinates && (
        <output
          ref={coordinateOutput}
          className="cursor-coordinates"
          aria-label="Map pointer coordinates"
        >
          Move pointer over map
        </output>
      )}
      {props.basemap === "satellite" &&
        basemapProviders[2].description.includes("NASA") && (
          <div className="imagery-note">
            NASA Blue Marble · regional composite
          </div>
        )}
      {message && (
        <div
          className={`map-message ${message.kind}`}
          role={message.kind === "loading" ? "status" : "alert"}
        >
          {message.kind === "loading" && <span className="spinner" />}
          <span>{message.text}</span>
          {message.kind !== "loading" && (
            <div className="message-actions">
              {message.kind === "error" && (
                <button
                  onClick={() => {
                    if (!map.current) window.location.reload();
                    else setRetry((r) => r + 1);
                  }}
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => {
                  if (latest.current.basemap === "dark") setRetry((r) => r + 1);
                  else latest.current.onBasemap("dark");
                }}
              >
                Use Dark Maritime
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
