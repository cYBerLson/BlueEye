import { ChevronDown, ChevronUp, LocateFixed, Route, X } from "lucide-react";
import { portActivity, selectedRoute, type Port, type Vessel } from "./data";
import { useEffect, useMemo, useRef } from "react";
type Props = {
  vessel: Vessel | null;
  port: Port | null;
  showRoute: boolean;
  onRoute: () => void;
  onFocus: () => void;
  onClose: () => void;
  onVessel: (id: string) => void;
  expanded: boolean;
  onExpand: () => void;
  fleet: Vessel[];
};
export default function Details(p: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [p.vessel, p.port]);
  const activity = useMemo(
    () => (p.port ? portActivity(p.port, p.fleet) : null),
    [p.port, p.fleet],
  );
  if (!p.vessel && !p.port) return null;
  const entity = p.vessel ?? p.port!;
  const routeAvailable = !!selectedRoute(p.vessel).features.length;
  return (
    <section
      className={`details sheet ${p.expanded ? "expanded" : ""}`}
      aria-label={p.vessel ? "Vessel details" : "Port details"}
    >
      <div className="sheet-handle" aria-hidden="true" />
      <div className="panel-heading">
        <span className="section-label">
          {p.vessel ? "Vessel" : "Port reference"}
        </span>
        <div className="panel-actions">
          <button
            className="sheet-toggle icon-button"
            aria-label={p.expanded ? "Collapse details" : "Expand details"}
            title={p.expanded ? "Collapse details" : "Expand details"}
            onClick={p.onExpand}
          >
            {p.expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label="Close details"
            title="Close details"
            onClick={p.onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="detail-content">
        <h2 ref={heading} tabIndex={-1}>
          {entity.name}
          {p.port ? " Port" : ""}
        </h2>
        {p.vessel ? (
          <>
            <p className="entity-id">Simulated ID · {p.vessel.id}</p>
            <dl className="detail-data">
              {[
                ["Type", p.vessel.type],
                ["Navigation status", p.vessel.status],
                ["Speed", `${p.vessel.speed.toFixed(1)} kn`],
                ["Course", `${p.vessel.heading}°`],
                ["Destination", p.vessel.destination],
                [
                  "Position",
                  `${entity.coordinates[1].toFixed(4)}° N, ${entity.coordinates[0].toFixed(4)}° E`,
                ],
                ["Last simulated update", "Scenario snapshot"],
                ["Data source", "BlueEye Simulation"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="detail-note">
              {routeAvailable
                ? p.showRoute
                  ? "Selected simulated route shown in amber."
                  : "Selected simulated route hidden."
                : "Route unavailable for this simulated vessel."}{" "}
              Routes are illustrative, not navigational guidance.
            </p>
          </>
        ) : (
          <>
            <p className="entity-id">{p.port!.region}, Nigeria</p>
            <dl className="detail-data">
              <div>
                <dt>Reference coordinates</dt>
                <dd>
                  {entity.coordinates[1].toFixed(4)}° N,{" "}
                  {entity.coordinates[0].toFixed(4)}° E
                </dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>Reference location / Simulation environment</dd>
              </div>
            </dl>
            <h3>Simulated activity · within 30 nm</h3>
            <dl className="detail-data">
              <div>
                <dt>Nearby synthetic vessels</dt>
                <dd>{activity!.nearby.length}</dd>
              </div>
              <div>
                <dt>Synthetic vessels underway</dt>
                <dd>{activity!.underway.length}</dd>
              </div>
              <div>
                <dt>Synthetic vessels at anchor</dt>
                <dd>{activity!.anchored.length}</dd>
              </div>
            </dl>
            <p className="detail-note">
              Counts use the active synthetic scenario within 30 nautical miles.
              They do not represent observed port activity.
            </p>
            <h3>Nearby simulated vessels</h3>
            {activity!.nearby.length ? (
              activity!.nearby.slice(0, 5).map((v) => (
                <button
                  className="nearby-vessel"
                  key={v.id}
                  onClick={() => p.onVessel(v.id)}
                  title={`Select ${v.name}`}
                >
                  <span>
                    {v.name}
                    <small>
                      {v.id} · {v.status}
                    </small>
                  </span>
                  <span>{v.speed.toFixed(1)} kn</span>
                </button>
              ))
            ) : (
              <p className="detail-note">No simulated vessels within 30 nm.</p>
            )}
          </>
        )}
      </div>
      <div className="detail-actions">
        <button onClick={p.onFocus} title="Focus selected feature on map">
          <LocateFixed size={16} />
          Focus
        </button>
        {p.vessel && (
          <button
            onClick={p.onRoute}
            disabled={!routeAvailable}
            aria-pressed={p.showRoute && routeAvailable}
            title={
              routeAvailable
                ? "Toggle selected simulated route"
                : "No simulated route available"
            }
          >
            <Route size={16} />
            {p.showRoute && routeAvailable ? "Hide route" : "Show route"}
          </button>
        )}
      </div>
    </section>
  );
}
