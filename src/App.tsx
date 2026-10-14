import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Anchor,
  BrainCircuit,
  Settings2,
  Info,
  Layers3,
  LocateFixed,
  Map,
  Search,
  Ship,
  X,
  MapPinned,
} from "lucide-react";
import {
  filterVessels,
  loadViewport,
  ports,
  scenarioFleet,
  type ScenarioMode,
  type Bounds,
  type Port,
  type Vessel,
} from "./data";
import { basemapProviders, type BasemapId } from "./basemaps";
import type { Layers } from "./mapOverlays";
import type { MapCommand } from "./MaritimeMap";
import Explorer from "./Explorer";
import Details from "./Details";
import AIPagePreview from "./AIPagePreview";
const MaritimeMap = lazy(() => import("./MaritimeMap"));
const disclosure =
  "BlueEye is operating in a demonstration environment using synthetic vessel activity and reference port locations. Operational AIS, NIMASA, NPA, Customs, carrier and terminal feeds are not represented.";
export default function App() {
  const [mode, setMode] = useState<ScenarioMode>("demo");
  const fleet = scenarioFleet(mode);
  const [cursorCoordinates, setCursorCoordinates] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const previousNav = useRef<"map" | "vessels" | "ports">("map");
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width:1024px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width:1024px)");
    const change = (event: MediaQueryListEvent) => setCompact(event.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const [bounds, setBounds] = useState<Bounds>([-1.5, -0.5, 10, 8]),
    [visible, setVisible] = useState<Vessel[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const [vesselQuery, setVesselQuery] = useState(""),
    [portQuery, setPortQuery] = useState(""),
    [type, setType] = useState("All vessels"),
    [status, setStatus] = useState("All statuses"),
    [tab, setTab] = useState<"vessels" | "ports">("vessels");
  const [selected, setSelected] = useState<Vessel | null>(null),
    [port, setPort] = useState<Port | null>(null),
    [showRoute, setShowRoute] = useState(false);
  const [layers, setLayers] = useState<Layers>({
    vessels: true,
    ports: true,
    routes: true,
    vesselLabels: false,
    portLabels: false,
  });
  const [basemap, setBasemap] = useState<BasemapId>("dark"),
    [popover, setPopover] = useState<"basemap" | "layers" | "settings" | null>(
      null,
    );
  const [explorerOpen, setExplorerOpen] = useState(
      () => !matchMedia("(max-width:1024px)").matches,
    ),
    [expanded, setExpanded] = useState(false),
    [detailExpanded, setDetailExpanded] = useState(false),
    [nav, setNav] = useState<"map" | "vessels" | "ports" | "ai">("map");
  const [command, setCommand] = useState<MapCommand | null>(null);
  const explorerVisible = explorerOpen && (!compact || (!selected && !port));
  const sequence = useRef(0),
    toolbar = useRef<HTMLDivElement>(null);
  const focus = useCallback(
    (coordinates: [number, number]) =>
      setCommand({ sequence: ++sequence.current, kind: "focus", coordinates }),
    [],
  );
  const fit = () => setCommand({ sequence: ++sequence.current, kind: "fit" });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(false);
      loadViewport(bounds, controller.signal, fleet)
        .then((data) => {
          setVisible(data);
          setLoading(false);
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setError(true);
            setLoading(false);
          }
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bounds, retry, fleet]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || aiOpen) return;
      if (popover) {
        setPopover(null);
        toolbar.current
          ?.querySelector<HTMLButtonElement>(`[data-control="${popover}"]`)
          ?.focus();
      } else if (selected || port) {
        setSelected(null);
        setPort(null);
        setShowRoute(false);
        document.querySelector<HTMLButtonElement>(".explore-control")?.focus();
      } else {
        setExplorerOpen(false);
        document.querySelector<HTMLButtonElement>(".explore-control")?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [popover, selected, port, aiOpen]);
  useEffect(() => {
    if (!popover) return;
    const outside = (e: PointerEvent) => {
      if (!toolbar.current?.contains(e.target as Node)) setPopover(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [popover]);
  const filtered = useMemo(
    () => filterVessels(visible, vesselQuery, type, status),
    [visible, vesselQuery, type, status],
  );
  const matchingPorts = useMemo(
    () =>
      ports.filter((p) =>
        `${p.name} ${p.region}`
          .toLowerCase()
          .includes(portQuery.trim().toLowerCase()),
      ),
    [portQuery],
  );
  const selectVessel = useCallback(
    (id: string) => {
      const v = fleet.find((v) => v.id === id);
      if (!v) return;
      setSelected(v);
      setPort(null);
      setShowRoute(false);
      setLayers((l) => ({
        ...l,
        vessels: true,
      }));
      focus(v.coordinates);
      setDetailExpanded(false);
      if (matchMedia("(max-width:1024px)").matches) setExplorerOpen(false);
    },
    [
      focus,
      fleet,
      setSelected,
      setPort,
      setShowRoute,
      setLayers,
      setDetailExpanded,
      setExplorerOpen,
    ],
  );
  const selectPort = useCallback(
    (id: string) => {
      const p = ports.find((p) => p.id === id);
      if (!p) return;
      setPort(p);
      setSelected(null);
      setShowRoute(false);
      setLayers((l) => ({ ...l, ports: true }));
      focus(p.coordinates);
      setDetailExpanded(false);
      if (matchMedia("(max-width:1024px)").matches) setExplorerOpen(false);
    },
    [
      focus,
      setSelected,
      setPort,
      setShowRoute,
      setLayers,
      setDetailExpanded,
      setExplorerOpen,
    ],
  );
  const openExplorer = (nextTab = tab) => {
    setTab(nextTab);
    setNav(nextTab);
    setExplorerOpen(true);
    setExpanded(false);
    if (matchMedia("(max-width:1024px)").matches) {
      setSelected(null);
      setPort(null);
      setShowRoute(false);
    }
  };
  const closeExplorer = () => {
    setExplorerOpen(false);
    setNav("map");
    document.querySelector<HTMLButtonElement>(".explore-control")?.focus();
  };
  const closeDetails = () => {
    setSelected(null);
    setPort(null);
    setShowRoute(false);
    document.querySelector<HTMLButtonElement>(".explore-control")?.focus();
  };
  const onBasemap = (id: BasemapId) => {
    setBasemap(id);
    setPopover(null);
  };
  const openAI = () => {
    if (nav !== "ai") previousNav.current = nav;
    setNav("ai");
    setPopover(null);
    setAiOpen(true);
  };
  const closeAI = () => {
    setAiOpen(false);
    setNav(previousNav.current);
  };
  const changeMode = (next: ScenarioMode) => {
    setMode(next);
    setSelected(null);
    setPort(null);
    setShowRoute(false);
    setLoading(true);
    setVisible([]);
  };
  return (
    <div className="app">
      <nav className="rail" aria-label="Primary navigation">
        {[
          { id: "map", label: "Maritime Map", icon: Map },
          { id: "vessels", label: "Vessels", icon: Ship },
          { id: "ports", label: "Ports", icon: Anchor },
          { id: "ai", label: "BlueEye AI (Preview)", icon: BrainCircuit },
        ].map((item) => (
          <button
            key={item.id}
            className={nav === item.id ? "active" : ""}
            aria-label={item.label}
            title={item.label}
            aria-current={nav === item.id ? "page" : undefined}
            onClick={() => {
              if (item.id === "map") {
                setNav("map");
                setExplorerOpen(false);
                fit();
              } else if (item.id === "ai") openAI();
              else openExplorer(item.id as "vessels" | "ports");
            }}
          >
            <item.icon size={20} />
          </button>
        ))}
      </nav>
      <div className="workspace">
        <header className="topbar">
          <div className="brand">
            BLUEEYE<small>MARITIME INTELLIGENCE</small>
          </div>
          <span className="header-region">Nigeria / Gulf of Guinea</span>
          <button
            className="mobile-ai icon-button"
            aria-label="BlueEye AI (Preview)"
            title="BlueEye AI (Preview)"
            onClick={openAI}
          >
            <BrainCircuit size={18} />
          </button>
          <div className="simulation-info" tabIndex={0} aria-label={disclosure}>
            <span className="simulation">
              <i /> SIMULATION MODE <Info size={13} />
            </span>
            <span className="simulation-tooltip" role="tooltip">
              {disclosure}
            </span>
          </div>
        </header>
        <main>
          <section className="page-heading">
            <div>
              <span className="eyebrow">MARITIME OPERATIONS</span>
              <h1>Maritime Intelligence Map</h1>
            </div>
            <p>
              Simulated maritime situational awareness across Nigerian waters.
            </p>
          </section>
          <section
            className="operations-strip"
            aria-label="Operational status: simulation"
          >
            <span>
              Vessels <b>{loading ? "…" : visible.length.toLocaleString()}</b>
            </span>
            <span>
              Under way{" "}
              <b>
                {loading
                  ? "…"
                  : visible.filter((v) => v.speed > 0).length.toLocaleString()}
              </b>
            </span>
            <span>
              At anchor{" "}
              <b>
                {loading ? "…" : visible.filter((v) => v.speed === 0).length}
              </b>
            </span>
            <span>
              Ports <b>7</b>
            </span>
            <span className="data-status">
              Data: <b>Simulated</b>
            </span>
          </section>
          <section
            className="command"
            aria-label="Maritime operations workspace"
          >
            {explorerVisible && (
              <Explorer
                tab={tab}
                onTab={(t) => {
                  setTab(t);
                  setNav(t);
                }}
                query={tab === "vessels" ? vesselQuery : portQuery}
                onQuery={tab === "vessels" ? setVesselQuery : setPortQuery}
                type={type}
                onType={setType}
                status={status}
                onStatus={setStatus}
                vessels={filtered}
                ports={matchingPorts}
                visibleCount={visible.length}
                loading={loading}
                error={error}
                onRetry={() => setRetry((r) => r + 1)}
                onVessel={selectVessel}
                onPort={selectPort}
                selectedId={selected?.id ?? port?.id}
                onClose={closeExplorer}
                expanded={expanded}
                onExpand={() => setExpanded((v) => !v)}
              />
            )}
            <div className="map-panel">
              <Suspense
                fallback={
                  <div className="map-message loading" role="status">
                    <span className="spinner" />
                    Loading map engine…
                  </div>
                }
              >
                <MaritimeMap
                  vessels={filtered}
                  layers={layers}
                  selected={selected}
                  selectedPort={port}
                  showRoute={showRoute}
                  basemap={basemap}
                  cursorCoordinates={cursorCoordinates}
                  command={command}
                  onBounds={setBounds}
                  onVessel={selectVessel}
                  onPort={selectPort}
                  onBasemap={onBasemap}
                />
              </Suspense>
              <div className="map-toolbar" ref={toolbar}>
                <button
                  className="map-button explore-control"
                  title={
                    explorerVisible
                      ? "Close Maritime Explorer"
                      : "Explore Maritime Activity — vessel and port search"
                  }
                  aria-label={
                    explorerVisible
                      ? "Close Maritime Explorer"
                      : "Open Maritime Explorer"
                  }
                  aria-expanded={explorerVisible}
                  onClick={() =>
                    explorerVisible ? closeExplorer() : openExplorer()
                  }
                >
                  <Search size={17} />
                  <span>
                    <span className="explore-long">
                      Explore Maritime Activity
                    </span>
                    <span className="explore-short">Explore</span>
                  </span>
                </button>
                <div className="toolbar-right">
                  <button
                    className="map-button"
                    data-control="settings"
                    aria-label="Demonstration settings"
                    title="Demo / stress test settings"
                    aria-expanded={popover === "settings"}
                    aria-controls="settings-panel"
                    onClick={() =>
                      setPopover(popover === "settings" ? null : "settings")
                    }
                  >
                    <Settings2 size={17} />
                  </button>
                  <button
                    className="map-button"
                    title="Fit Nigeria and Gulf of Guinea"
                    aria-label="Fit Nigeria and Gulf of Guinea"
                    onClick={fit}
                  >
                    <LocateFixed size={18} />
                  </button>
                  <button
                    className="map-button"
                    data-control="basemap"
                    aria-label="Basemap"
                    title="Choose basemap"
                    aria-expanded={popover === "basemap"}
                    aria-controls="basemap-panel"
                    onClick={() =>
                      setPopover(popover === "basemap" ? null : "basemap")
                    }
                  >
                    <MapPinned size={17} />
                    <span>Basemap</span>
                  </button>
                  <button
                    className="map-button"
                    data-control="layers"
                    aria-label="Layers"
                    title="Choose map overlays"
                    aria-expanded={popover === "layers"}
                    aria-controls="layers-panel"
                    onClick={() =>
                      setPopover(popover === "layers" ? null : "layers")
                    }
                  >
                    <Layers3 size={17} />
                    <span>Layers</span>
                  </button>
                </div>
                {popover === "basemap" && (
                  <div className="map-popover" id="basemap-panel">
                    <h2>Basemap</h2>
                    <div role="radiogroup" aria-label="Basemap">
                      {basemapProviders.map((provider) => (
                        <label className="basemap-option" key={provider.id}>
                          <input
                            type="radio"
                            name="basemap"
                            checked={basemap === provider.id}
                            onChange={() => onBasemap(provider.id)}
                          />
                          <span>
                            {provider.name}
                            <small>{provider.description}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="popover-note">
                      Overlays and selections are preserved.
                      {basemap === "satellite" &&
                        basemapProviders[2].description.includes("NASA") && (
                          <>
                            <br />
                            NASA regional satellite composite. Not recent or
                            harbour-resolution imagery.
                          </>
                        )}
                    </p>
                  </div>
                )}
                {popover === "layers" && (
                  <div className="map-popover" id="layers-panel">
                    <h2>Overlays</h2>
                    {(
                      [
                        { key: "vessels", label: "Vessels" },
                        { key: "ports", label: "Ports" },
                        { key: "routes", label: "Maritime Routes" },
                        { key: "vesselLabels", label: "Vessel Labels" },
                        { key: "portLabels", label: "Port Labels" },
                      ] as const
                    ).map((layer) => (
                      <label className="layer-option" key={layer.key}>
                        <input
                          type="checkbox"
                          checked={layers[layer.key]}
                          onChange={(e) => {
                            if (layer.key === "routes" && !e.target.checked)
                              setShowRoute(false);
                            setLayers((l) => ({
                              ...l,
                              [layer.key]: e.target.checked,
                            }));
                          }}
                        />
                        <span>{layer.label}</span>
                      </label>
                    ))}
                    <p className="popover-note">
                      Vessel labels appear above zoom 8.
                      <br />
                      Routes and vessels are simulated.
                    </p>
                    <button
                      className="popover-close"
                      onClick={() => setPopover(null)}
                      title="Close overlays"
                    >
                      <X size={14} />
                      Close
                    </button>
                  </div>
                )}
                {popover === "settings" && (
                  <div className="map-popover" id="settings-panel">
                    <h2>Demonstration settings</h2>
                    <div role="radiogroup" aria-label="Synthetic scenario">
                      <label className="basemap-option">
                        <input
                          type="radio"
                          name="scenario"
                          checked={mode === "demo"}
                          onChange={() => changeMode("demo")}
                        />
                        <span>
                          Demo Mode
                          <small>
                            84 synthetic vessels · presentation scenario
                          </small>
                        </span>
                      </label>
                      <label className="basemap-option">
                        <input
                          type="radio"
                          name="scenario"
                          checked={mode === "stress"}
                          onChange={() => changeMode("stress")}
                        />
                        <span>
                          Stress Test Mode
                          <small>
                            1,200 synthetic vessels · performance testing
                          </small>
                        </span>
                      </label>
                    </div>
                    <label className="layer-option">
                      <input
                        type="checkbox"
                        checked={cursorCoordinates}
                        onChange={(e) => setCursorCoordinates(e.target.checked)}
                        disabled={compact}
                      />
                      <span>
                        Cursor coordinates
                        <small className="setting-note">
                          {compact
                            ? "Desktop only"
                            : "Desktop map pointer position"}
                        </small>
                      </span>
                    </label>
                    <p className="popover-note">
                      Both scenarios are synthetic. Changing scenarios clears
                      selection; map view and filters are retained.
                    </p>
                    <button
                      className="popover-close"
                      onClick={() => setPopover(null)}
                      title="Close demonstration settings"
                    >
                      <X size={14} />
                      Close settings
                    </button>
                  </div>
                )}
              </div>
              <div
                className="fullscreen-simulation simulation-info"
                tabIndex={0}
                aria-label={disclosure}
              >
                <span className="simulation">
                  <i />
                  SIMULATION MODE <Info size={13} />
                </span>
                <span className="simulation-tooltip" role="tooltip">
                  {disclosure}
                </span>
              </div>
              <div className="map-context">
                {basemapProviders.find((p) => p.id === basemap)?.name}
                {basemap === "satellite" &&
                basemapProviders.find((p) => p.id === basemap)?.unavailable
                  ? " · unavailable"
                  : ""}{" "}
                <span> / </span>{" "}
                {loading
                  ? "Loading viewport"
                  : `${filtered.length.toLocaleString()} matching vessels`}
              </div>
              {!loading && !error && !filtered.length && (
                <div className="viewport-empty" role="status">
                  {vesselQuery ||
                  type !== "All vessels" ||
                  status !== "All statuses"
                    ? "No vessels match the active filters."
                    : "No simulated vessels in this map extent."}
                </div>
              )}
              <div className="map-legend" aria-label="Vessel legend">
                <span>
                  <i className="cargo" />
                  Cargo
                </span>
                <span>
                  <i className="tanker" />
                  Tanker
                </span>
                <span>
                  <i className="container" />
                  Container
                </span>
                <span>
                  <i className="support" />
                  Support
                </span>
              </div>
            </div>
            <Details
              fleet={fleet}
              vessel={selected}
              port={port}
              showRoute={showRoute}
              onRoute={() => {
                if (!showRoute) setLayers((l) => ({ ...l, routes: true }));
                setShowRoute((v) => !v);
              }}
              onFocus={() => focus((selected ?? port)!.coordinates)}
              onClose={closeDetails}
              onVessel={selectVessel}
              expanded={detailExpanded}
              onExpand={() => setDetailExpanded((v) => !v)}
            />
          </section>
        </main>
        <footer>
          <span>DATA ENVIRONMENT: DEMONSTRATION</span>
          <span className="footer-reference">
            Synthetic vessel activity · Reference port locations
          </span>
          <span className="footer-count">
            {fleet.length.toLocaleString()} synthetic vessels ·{" "}
            {mode === "demo" ? "Demo Mode" : "Stress Test Mode"}
          </span>
        </footer>
        <AIPagePreview open={aiOpen} onClose={closeAI} />
      </div>
    </div>
  );
}
