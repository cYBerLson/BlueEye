import { describe, expect, it } from "vitest";
import {
  filterVessels,
  inBounds,
  loadViewport,
  ports,
  routes,
  vessels,
  vesselGeoJSON,
  selectedRoute,
  distanceNm,
  portActivity,
  scenarioFleet,
  demoVessels,
  formatCoordinates,
} from "./data";
describe("maritime simulation", () => {
  it("provides a modest deterministic demo and retains the original stress fleet", () => {
    expect(scenarioFleet("demo")).toBe(demoVessels);
    expect(demoVessels).toHaveLength(84);
    expect(scenarioFleet("stress")).toBe(vessels);
    expect(scenarioFleet("stress")).toHaveLength(1200);
    expect(new Set(demoVessels.map((v) => v.id)).size).toBe(84);
    expect(demoVessels.filter((v) => v.status === "At anchor").length).toBe(12);
    expect(
      new Set(
        demoVessels
          .filter((v) => v.status === "At anchor")
          .map((v) => v.destination),
      ).size,
    ).toBe(7);
  });
  it("loads the active scenario rather than leaking stress data into the demo", async () => {
    const result = await loadViewport(
      [-180, -90, 180, 90],
      new AbortController().signal,
      demoVessels,
    );
    expect(result).toHaveLength(84);
  });
  it("formats coordinates with correct hemisphere and maritime padding", () => {
    expect(formatCoordinates(3.9217, 5.8421)).toBe("05.8421° N · 003.9217° E");
    expect(formatCoordinates(-3.2, -5.1)).toBe("05.1000° S · 003.2000° W");
  });
  it("combines status, destination search, and vessel type filters", () => {
    const result = filterVessels(vessels, "onne", "Tanker", "Under way");
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (v) =>
          v.destination === "Onne" &&
          v.type === "Tanker" &&
          v.status === "Under way",
      ),
    ).toBe(true);
    expect(
      filterVessels(vessels, "", "All vessels", "At anchor").every(
        (v) => v.speed === 0,
      ),
    ).toBe(true);
  });
  it("returns available simulated routes without fabricating missing routes", () => {
    expect(selectedRoute(vessels[0]).features).toHaveLength(0);
    expect(selectedRoute(vessels[1]).features).toEqual([
      routes.features[vessels[1].routeId!],
    ]);
    expect(selectedRoute(null).features).toHaveLength(0);
  });
  it("calculates port proximity in nautical miles and only counts nearby approaches", () => {
    expect(distanceNm([0, 0], [0, 1])).toBeCloseTo(60.04, 1);
    const port = ports[0],
      base = vessels[1];
    const near = {
      ...base,
      id: "near",
      coordinates: port.coordinates,
      destination: port.name,
    };
    const anchor = { ...near, id: "anchor", speed: 0, status: "At anchor" };
    const far = { ...near, id: "far", coordinates: [0, 0] as [number, number] };
    const other = { ...near, id: "other", destination: "Onne" };
    const activity = portActivity(port, [near, anchor, far, other]);
    expect(activity.nearby.map((v) => v.id)).toEqual([
      "near",
      "anchor",
      "other",
    ]);
    expect(activity.approaching.map((v) => v.id)).toEqual(["near"]);
    expect(activity.anchored.map((v) => v.id)).toEqual(["anchor"]);
  });
  it("creates unique, explicit simulation identities with valid navigation values", () => {
    expect(vessels).toHaveLength(1200);
    expect(new Set(vessels.map((v) => v.id)).size).toBe(1200);
    for (const v of vessels) {
      expect(v.id).toMatch(/^SIM-/);
      expect(v.speed).toBeGreaterThanOrEqual(0);
      expect(v.heading).toBeLessThan(360);
      expect(v.coordinates[1]).toBeGreaterThan(-90);
      expect(v.coordinates[1]).toBeLessThan(90);
      expect(ports.some((p) => p.name === v.destination)).toBe(true);
    }
  });
  it("filters by inclusive viewport and excludes out of view vessels", () => {
    const v = vessels[0];
    const [x, y] = v.coordinates;
    expect(inBounds(v, [x, y, x, y])).toBe(true);
    expect(inBounds(v, [-40, -40, -30, -30])).toBe(false);
    expect(inBounds({ ...v, coordinates: [179, 0] }, [170, -1, -170, 1])).toBe(
      true,
    );
  });
  it("combines case-insensitive search and vessel type", () => {
    expect(filterVessels(vessels, "sim-0001", "All vessels")).toEqual([
      vessels[0],
    ]);
    expect(
      filterVessels(vessels, "", "Tanker").every((v) => v.type === "Tanker"),
    ).toBe(true);
    expect(filterVessels(vessels, "zzzzz", "All vessels")).toEqual([]);
  });
  it("loads only the requested viewport", async () => {
    const result = await loadViewport(
      [3, 5, 4, 7],
      new AbortController().signal,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((v) => inBounds(v, [3, 5, 4, 7]))).toBe(true);
  });
  it("cancels stale viewport requests", async () => {
    const c = new AbortController();
    const p = loadViewport([0, 0, 10, 10], c.signal);
    c.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
  it("rejects already cancelled requests", async () => {
    const c = new AbortController();
    c.abort();
    await expect(loadViewport([0, 0, 10, 10], c.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
  it("provides stable GeoJSON IDs and connected illustrative routes", () => {
    const geo = vesselGeoJSON(vessels.slice(0, 5));
    expect(geo.features[0].id).toBe(vessels[0].id);
    expect(geo.features).toHaveLength(5);
    expect(ports).toHaveLength(7);
    expect(
      routes.features.every((r) => r.geometry.coordinates.length >= 2),
    ).toBe(true);
  });
});
