# BlueEye

Phases 1–3: a responsive maritime command centre for Nigeria and the Gulf of Guinea. React, TypeScript, Vite, and MapLibre GL JS. All 1,200 vessels and all maritime routes are synthetic, deterministic demonstration data. Nigerian ports are approximate reference points. No live AIS, NIMASA, NPA, Customs, carrier, or terminal feeds are connected.

## Run

Requires Node.js 22.12+ (or 24 LTS) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For production: `npm run build`, then `npm run preview`. Deploy the `dist/` directory to a static host. The development server binds to all interfaces for testing on phones on the same network.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Structure

```text
src/
  App.tsx           Responsive shell, explorer, filters, details
  AIPagePreview.tsx  Planned AI capability preview only (no AI integration)
  Explorer.tsx      Search, type/status filters, responsive explorer sheet
  Details.tsx       Vessel/port detail panels and simulation activity
  MaritimeMap.tsx   Lazy-loaded MapLibre, layers, clustering, lifecycle
  mapOverlays.ts    Idempotent overlay installation and incremental updates
  mapOverlays.test.ts  Basemap reload, selection and source-update regressions
  basemaps.ts       Dark, standard and optional satellite provider adapters
  basemaps.test.ts  Provider configuration, style and error tests
  data.ts           Seeded simulation, port references, routes, viewport adapter
  data.test.ts      Simulation, filtering, bounds, cancellation tests
  main.tsx          React entry point
  style.css         Responsive dark maritime design
index.html
vite.config.ts
tsconfig.json
eslint.config.js
```

## Map and performance

The map fills the remaining viewport below a compact operations header and status strip. Navigation exposes Maritime Map, Vessels, Ports and BlueEye AI (Preview). The AI item opens a planned-capabilities panel only: no LLM, chatbot responses, predictions or operational integrations exist. Select vessels or ports on the map or in the explorer. Clusters expand on click. Search by vessel name, simulated ID or destination; type and status filters apply to the current viewport and map. Vessel and port searches are independent. Map controls include zoom, north, regional fit, basemap, overlays, nautical scale and fullscreen where supported. Optional desktop cursor coordinates are available in Demonstration Settings and update at most once per animation frame without React renders. On tablet, the explorer collapses; on mobile it and selection details use bottom sheets with expand/collapse controls. Full attribution stays visible above mobile sheets. Escape closes a popup, selection details or explorer; tabs support arrow keys. Reduced motion is respected.

The detail panel identifies every vessel as a simulated record. Use Show/Hide Route to request its illustrative route; anchored vessels report route unavailable. Selecting a port highlights it and lists nearby synthetic vessels, vessels at anchor and vessels underway within 30 nautical miles. Counts use the complete active scenario, independently of viewport filters. All coordinates are approximate references and routes are not navigation guidance. Last simulated update is identified as a scenario snapshot, not an observed AIS timestamp.

## Demonstration scenarios

Demo Mode is the default: 84 deterministic synthetic vessels, with twelve anchored vessels distributed across the seven reference ports. Stress Test Mode retains the original seeded 1,200-vessel fleet. Open the settings icon in the map toolbar to switch scenarios. Both are explicitly synthetic. Scenario changes clear selected features and refresh viewport data while retaining the camera and filters. The status strip counts the active viewport; the footer names the scenario and total fleet. The top-right Simulation Mode information explains the demonstration environment and does not represent operational maritime feeds.

## Basemaps and satellite imagery

Dark Maritime and Standard use OpenFreeMap vector styles. Satellite works without credentials using NASA GIBS's `BlueMarble_NextGeneration` EPSG:3857 raster tiles. The source supports zooms 0–8 and overzooms to preserve the user's current camera. This is a historical, roughly 500-metre regional satellite composite, not recent high-resolution harbour imagery. Source credit to NASA Earth Observatory and NASA GIBS / ESDIS is always displayed. See [NASA's Blue Marble product and credit guidance](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/), [reuse guidance](https://science.nasa.gov/blogs/earth-matters/2011/10/06/crafting-the-blue-marble/), and [GIBS API and acknowledgement guidance](https://nasa-gibs.github.io/gibs-api-docs/). BlueEye makes no claim of NASA affiliation or endorsement.

Switching changes the style of the existing MapLibre instance while retaining the camera, filters, explorer state and selected feature; custom sources and layers are reinstalled once per style. Data, labels and route visibility are restored from current UI state. Vessel labels appear above zoom 8. No satellite resources are requested unless Satellite is selected. Imagery/network failures expose an error with retry and an explicit choice of another basemap; there is no silent fallback.

To replace NASA with a licensed imagery provider, copy `.env.example` to `.env.local`, then set:

```dotenv
VITE_SATELLITE_TILE_URL=https://your-provider.example/{z}/{x}/{y}.jpg
VITE_SATELLITE_ATTRIBUTION=Your licensed provider attribution
VITE_SATELLITE_MAX_ZOOM=18
```

Replace the example with an HTTPS XYZ raster tile URL from a provider you are authorized to use. A replacement URL requires attribution; its maximum tile zoom must match the provider. Restart development or rebuild production after changes. These **public browser configuration values are included in the built bundle**. If a provider needs a token, use only a publishable browser token in the URL with provider-side origin restrictions. Never put private credentials in any `VITE_*` variable. A provider that requires secret server credentials needs a future authorized server adapter, outside this phase. No private keys or satellite credentials are supplied here. Imagery ages and coverage depend on the configured provider; satellite does not imply live vessel data.

MapLibre is lazy-loaded in a separate bundle. Vessels use a single worker-clustered GeoJSON source and GPU-rendered circle layers rather than individual DOM markers. Viewport queries are debounced and stale requests aborted. Only viewport-matching data is sent to the renderer; explorer output is capped at 80 rows. Source updates preserve the map instance. ResizeObserver keeps the map fitted to its container. Map listeners, workers, and requests are disposed on unmount. Reduced motion is respected.

The adapter filters the active local scenario (84 demo or 1,200 stress vessels), not a remote feed. This is a foundation for future server-side bounding-box queries, not a benchmark of live AIS scale. External OpenFreeMap/OSM vector tiles, NASA imagery and map glyphs require internet access; system fonts avoid a separate font download. Map failures expose a retry state. WebGL is required. Attribution stays visible. The OpenFreeMap public style requires no API key; see [provider documentation](https://openfreemap.org/) for hosting details. Basemap fetches are cancellable and timed out; selected-feature and layer changes do not unnecessarily resend the fleet GeoJSON to workers. See VERIFICATION.md for measured bundle sizes and responsive results, and CONTROL_AUDIT.md for the visible-control checklist.

## Phase 4 — deferred

The future Phase 4 scope should be confirmed against the product roadmap. No authentication, backend, operational integrations, live AIS polling, historical playback, alerts, or operational analytics are implemented. Future authorized data feeds must provide provenance, access controls, timestamps, and clearly separate real observations from simulation.
