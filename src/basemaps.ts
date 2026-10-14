import type { StyleSpecification } from "maplibre-gl";
export type BasemapId = "dark" | "standard" | "satellite";
export type SatelliteConfig = {
  tileUrl?: string;
  attribution?: string;
  maxZoom?: string;
};
export const nasaSatelliteUrl =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";
export const nasaAttribution =
  '<a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/" target="_blank" rel="noopener">NASA Earth Observatory</a> · <a href="https://nasa-gibs.github.io/gibs-api-docs/" target="_blank" rel="noopener">NASA GIBS / ESDIS</a>';
export type BasemapProvider = {
  id: BasemapId;
  name: string;
  description: string;
  styleUrl?: string;
  getStyle?: () => StyleSpecification;
  unavailable?: string;
};
export function createBasemapProviders(
  config: SatelliteConfig,
): BasemapProvider[] {
  const overridden = !!config.tileUrl?.trim();
  const tileUrl = overridden ? config.tileUrl!.trim() : nasaSatelliteUrl,
    attribution = overridden ? config.attribution?.trim() : nasaAttribution;
  const maxZoom = overridden ? Number(config.maxZoom ?? 18) : 8;
  const valid =
    !!tileUrl &&
    /^https:\/\//.test(tileUrl) &&
    ["{z}", "{x}", "{y}"].every((t) => tileUrl.includes(t)) &&
    !!attribution &&
    Number.isInteger(maxZoom) &&
    maxZoom >= 0 &&
    maxZoom <= 22;
  return [
    {
      id: "dark",
      name: "Dark Maritime",
      description: "Operational vector map",
      styleUrl: "https://tiles.openfreemap.org/styles/dark",
    },
    {
      id: "standard",
      name: "Standard",
      description: "Standard vector cartography",
      styleUrl: "https://tiles.openfreemap.org/styles/liberty",
    },
    {
      id: "satellite",
      name: "Satellite",
      description: overridden
        ? "Configured satellite imagery"
        : "NASA Blue Marble · regional composite",
      unavailable: valid
        ? undefined
        : "Satellite provider configuration is invalid. Check its HTTPS tile template, attribution and maximum zoom.",
      getStyle: valid
        ? () => ({
            version: 8,
            glyphs:
              "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
            sources: {
              satellite: {
                type: "raster",
                tiles: [tileUrl!],
                tileSize: 256,
                attribution: attribution!,
                maxzoom: maxZoom,
              },
            },
            layers: [
              {
                id: "background",
                type: "background",
                paint: { "background-color": "#0b1823" },
              },
              {
                id: "satellite",
                source: "satellite",
                type: "raster",
                paint: { "raster-fade-duration": 150 },
              },
            ],
          })
        : undefined,
    },
  ];
}
export const basemapProviders = createBasemapProviders({
  tileUrl: import.meta.env.VITE_SATELLITE_TILE_URL,
  attribution: import.meta.env.VITE_SATELLITE_ATTRIBUTION,
  maxZoom: import.meta.env.VITE_SATELLITE_MAX_ZOOM,
});
export async function loadBasemapStyle(
  provider: BasemapProvider,
  signal: AbortSignal,
): Promise<StyleSpecification> {
  if (provider.unavailable) throw new Error(provider.unavailable);
  if (provider.getStyle) return provider.getStyle();
  const response = await fetch(provider.styleUrl!, { signal });
  if (!response.ok)
    throw new Error(`${provider.name} provider returned ${response.status}.`);
  const style = (await response.json()) as StyleSpecification;
  if (style.version !== 8 || !style.sources || !Array.isArray(style.layers))
    throw new Error("The basemap provider returned an invalid style.");
  if (provider.id === "dark") {
    const background = style.layers.find((l) => l.id === "background");
    if (background?.type === "background")
      background.paint = { ...background.paint, "background-color": "#13232f" };
    const water = style.layers.find((l) => l.id === "water");
    if (water?.type === "fill")
      water.paint = { ...water.paint, "fill-color": "#0b1823" };
  }
  return style;
}
