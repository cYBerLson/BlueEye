import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBasemapProviders,
  loadBasemapStyle,
  nasaSatelliteUrl,
} from "./basemaps";
afterEach(() => vi.unstubAllGlobals());
describe("basemap adapter", () => {
  it("provides three working basemaps without private credentials", () => {
    const providers = createBasemapProviders({});
    expect(providers[0].unavailable).toBeUndefined();
    expect(providers[1].styleUrl).toContain("/liberty");
    expect(providers[2].unavailable).toBeUndefined();
    expect(providers[2].getStyle!().sources.satellite).toMatchObject({
      type: "raster",
      tiles: [nasaSatelliteUrl],
      maxzoom: 8,
    });
  });
  it("does not request satellite resources when constructing provider choices", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    createBasemapProviders({});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps NASA imagery credit in the default raster style", () => {
    expect(
      createBasemapProviders({})[2].getStyle!().sources.satellite,
    ).toMatchObject({
      attribution: expect.stringContaining("NASA Earth Observatory"),
    });
  });
  it("rejects malformed satellite URLs and missing attribution", () => {
    for (const config of [
      { tileUrl: "http://tiles.example/{z}/{x}/{y}", attribution: "Provider" },
      { tileUrl: "https://tiles.example/map", attribution: "Provider" },
      { tileUrl: "https://tiles.example/{z}/{x}/{y}" },
    ])
      expect(createBasemapProviders(config)[2].unavailable).toBeDefined();
  });
  it("creates satellite raster style only on demand and preserves provider attribution", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const provider = createBasemapProviders({
      tileUrl: "https://tiles.example/{z}/{x}/{y}.jpg",
      attribution: "Licensed imagery provider",
    })[2];
    const style = await loadBasemapStyle(
      provider,
      new AbortController().signal,
    );
    expect(style.sources.satellite).toMatchObject({
      type: "raster",
      attribution: "Licensed imagery provider",
    });
    expect(style.layers.map((l) => l.id)).toEqual(["background", "satellite"]);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports provider failures before replacing an existing map", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    await expect(
      loadBasemapStyle(
        createBasemapProviders({})[0],
        new AbortController().signal,
      ),
    ).rejects.toThrow("503");
  });
  it("rejects invalid provider styles", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ version: 7 }) }),
    );
    await expect(
      loadBasemapStyle(
        createBasemapProviders({})[1],
        new AbortController().signal,
      ),
    ).rejects.toThrow("invalid style");
  });
});
