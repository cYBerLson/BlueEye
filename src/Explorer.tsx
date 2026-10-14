import { Anchor, ChevronDown, ChevronUp, Search, Ship, X } from "lucide-react";
import type { Port, Vessel } from "./data";
type Props = {
  tab: "vessels" | "ports";
  onTab: (tab: "vessels" | "ports") => void;
  query: string;
  onQuery: (q: string) => void;
  type: string;
  onType: (t: string) => void;
  status: string;
  onStatus: (s: string) => void;
  vessels: Vessel[];
  ports: Port[];
  visibleCount: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onVessel: (id: string) => void;
  onPort: (id: string) => void;
  selectedId?: string;
  onClose: () => void;
  expanded: boolean;
  onExpand: () => void;
};
export default function Explorer(p: Props) {
  return (
    <aside
      className={`explorer sheet ${p.expanded ? "expanded" : ""}`}
      aria-label="Maritime explorer"
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="panel-heading">
        <h2>Maritime Explorer</h2>
        <div className="panel-actions">
          <button
            className="sheet-toggle icon-button"
            title={p.expanded ? "Collapse explorer" : "Expand explorer"}
            aria-label={p.expanded ? "Collapse explorer" : "Expand explorer"}
            onClick={p.onExpand}
          >
            {p.expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label="Close explorer"
            title="Close explorer"
            onClick={p.onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Explorer datasets">
        {(["vessels", "ports"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={p.tab === tab}
            aria-controls="explorer-results"
            id={`tab-${tab}`}
            className={p.tab === tab ? "selected" : ""}
            onClick={() => p.onTab(tab)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? "vessels"
                  : e.key === "End"
                    ? "ports"
                    : tab === "vessels"
                      ? "ports"
                      : "vessels";
              p.onTab(next);
              document.getElementById(`tab-${next}`)?.focus();
            }}
          >
            {tab === "vessels" ? "Vessels" : "Ports"}
            <span>{tab === "vessels" ? p.visibleCount : 7}</span>
          </button>
        ))}
      </div>
      <label className="search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label={p.tab === "vessels" ? "Search vessels" : "Search ports"}
          placeholder={
            p.tab === "vessels"
              ? "Name, simulated ID, destination"
              : "Port name or location"
          }
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
        />
        {p.query && (
          <button
            className="icon-button"
            onClick={() => p.onQuery("")}
            title="Clear search"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </label>
      {p.tab === "vessels" && (
        <div className="filters">
          <label>
            Vessel type
            <select
              aria-label="Vessel type"
              value={p.type}
              onChange={(e) => p.onType(e.target.value)}
            >
              {["All vessels", "Cargo", "Tanker", "Container", "Support"].map(
                (t) => (
                  <option key={t}>{t}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Status
            <select
              aria-label="Vessel status"
              value={p.status}
              onChange={(e) => p.onStatus(e.target.value)}
            >
              {["All statuses", "Under way", "At anchor"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="result-heading">
        <span>
          {p.tab === "vessels"
            ? "Current map extent"
            : "Nigerian port references"}
        </span>
        <span>
          {p.loading && p.tab === "vessels"
            ? "Loading…"
            : `${p.tab === "vessels" ? p.vessels.length : p.ports.length} results`}
        </span>
      </div>
      <div
        className="fleet-list"
        id="explorer-results"
        role="tabpanel"
        aria-labelledby={`tab-${p.tab}`}
      >
        {p.tab === "vessels" ? (
          p.error ? (
            <div className="empty" role="alert">
              Vessel data could not load.
              <button onClick={p.onRetry}>Retry vessel loading</button>
            </div>
          ) : p.loading ? (
            <div className="empty" role="status">
              <span className="spinner" />
              Loading simulated vessels…
            </div>
          ) : !p.vessels.length ? (
            <div className="empty">
              {p.query ||
              p.type !== "All vessels" ||
              p.status !== "All statuses"
                ? "No vessels match your filters."
                : "No simulated vessels in this viewport."}
              <small>Adjust filters or move the map.</small>
            </div>
          ) : (
            p.vessels.slice(0, 80).map((v) => (
              <button
                className={`vessel-row ${p.selectedId === v.id ? "chosen" : ""}`}
                aria-pressed={p.selectedId === v.id}
                key={v.id}
                onClick={() => p.onVessel(v.id)}
                title={`Select ${v.name}`}
              >
                <Ship
                  size={17}
                  className={v.type.toLowerCase()}
                  aria-hidden="true"
                />
                <span className="vessel-text">
                  <b>{v.name}</b>
                  <small>
                    {v.type} · {v.id}
                  </small>
                  <span className="row-status">
                    <i className={v.speed ? "moving" : "anchored"} />
                    {v.status}
                  </span>
                </span>
                <span className="speed">
                  {v.speed.toFixed(1)}
                  <small>kn</small>
                </span>
              </button>
            ))
          )
        ) : p.ports.length ? (
          p.ports.map((port) => (
            <button
              className={`vessel-row ${p.selectedId === port.id ? "chosen" : ""}`}
              aria-pressed={p.selectedId === port.id}
              key={port.id}
              onClick={() => p.onPort(port.id)}
              title={`Select ${port.name}`}
            >
              <Anchor size={18} aria-hidden="true" />
              <span className="vessel-text">
                <b>{port.name}</b>
                <small>{port.region}, Nigeria</small>
              </span>
            </button>
          ))
        ) : (
          <div className="empty">No ports match your search.</div>
        )}
        {p.tab === "vessels" && !p.loading && p.vessels.length > 80 && (
          <p className="list-note">
            First 80 results. Search or zoom to narrow the view.
          </p>
        )}
      </div>
      <div className="panel-foot">
        BlueEye Simulation · Reference port locations
      </div>
    </aside>
  );
}
