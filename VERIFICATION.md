# Final Phases 1–3 hardening verification

Phase 4 is not implemented. The AI navigation opens a static architecture preview only.

## Automated checks

| Check               | Result                       |
| ------------------- | ---------------------------- |
| `npm run lint`      | Pass, no warnings or errors  |
| `npm run typecheck` | Pass                         |
| `npm test`          | 23 tests across 3 files pass |
| `npm run build`     | Pass                         |

Tests cover deterministic simulation, bounds, cancellation, active scenario loading, demo/stress separation, coordinate formatting, search/type/status filtering, nautical-mile proximity, routes, provider defaults/configuration/errors, lazy satellite style construction, attribution, idempotent overlay installation, selection and label restoration after style replacement, and avoiding unnecessary fleet updates.

## Satellite source

The production browser rendered NASA GIBS `BlueMarble_NextGeneration` raster tiles with synthetic vessels, ports and routes. A direct service probe returned HTTP 200, image/jpeg and CORS access. NASA Earth Observatory and GIBS / ESDIS attribution is shown in full, including mobile with search/details sheets open. Satellite resources are only requested after choosing Satellite. A working licensed provider can replace the default through public environment configuration; no private credentials are included.

NASA imagery is a historical, roughly 500-metre regional composite, with source zooms 0–8. Higher zooms overzoom those tiles to preserve the camera. It is not recent harbour-resolution imagery or a navigation chart. Product, reuse and acknowledgement references are linked in README. Failure handling offers retry or an explicit user-selected basemap rather than silently changing the provider.

## Browser and responsive verification

Inspected the built app at `http://localhost:4173/`. Dark Maritime, Standard and Satellite rendered. Dark → Standard → Satellite → Dark retained vessel selection, simulated-ID search, route state and explorer state. Satellite also retained selected port details. One canvas remained during repeated switching. The stress scenario showed 1,200 vessels, 1,028 underway and 172 anchored in the full regional view. Demo Mode defaults to 84 vessels: 72 underway and 12 anchored.

| Width | Height | Page overflow | Toolbar overlap | Basemap and layers fit | Simulation indicator fits | Scale/credit overlap |
| ----- | ------ | ------------- | --------------- | ---------------------- | ------------------------- | -------------------- |
| 360   | 844    | None          | None            | Yes                    | Yes                       | None                 |
| 390   | 844    | None          | None            | Yes                    | Yes                       | None                 |
| 430   | 844    | None          | None            | Yes                    | Yes                       | None                 |
| 768   | 1024   | None          | None            | Yes                    | Yes                       | None                 |
| 1024  | 1024   | None          | None            | Yes                    | Yes                       | None                 |
| 1366  | 900    | None          | None            | Yes                    | Yes                       | None                 |
| 1440  | 900    | None          | None            | Yes                    | Yes                       | None                 |
| 1920  | 900    | None          | None            | Yes                    | Yes                       | None                 |

Mobile search/details use sheets; their collapsed/expanded controls were exercised. Full imagery credits stay above the sheets. Expanded sheets temporarily hide native pan/zoom controls to avoid clipping them; toolbar controls remain accessible. Optional cursor coordinates are hidden on mobile/tablet. Desktop pointer movement produced a formatted latitude/longitude readout. The simulation disclosure also remains available in fullscreen. Final production console checks found no new errors or warnings.

See CONTROL_AUDIT.md for the explicit visible-control checklist.

## Production performance

| Artifact             | Size                   |
| -------------------- | ---------------------- |
| Main application JS  | 80.66 kB gzip          |
| Lazy map wrapper     | 3.71 kB gzip           |
| Lazy MapLibre engine | 281.53 kB gzip         |
| Application CSS      | 4.75 kB gzip           |
| MapLibre CSS         | 10.72 kB gzip          |
| Map worker           | 507.71 kB uncompressed |

The main JS increased by 1.88 kB gzip from the previous refinement (78.78 kB). The worker asset remains unchanged. Vite retains its advisory warning for the engine chunk over 500 kB uncompressed; it is already lazy-loaded separately. Preserved GPU/native source layers, worker clustering, debounced viewport loading, cancellation, cleanup and incremental route/source updates. No DOM vessel markers or preloaded satellite basemaps were added. Cursor updates are limited to one animation frame and do not trigger React state renders. No numerical FPS claim or live AIS scale benchmark is made.

## Limits and Phase 4 readiness

Tiles and glyphs require network access; rendering requires WebGL. Imagery availability depends on external providers. The default satellite composite is coarse at port-level zoom. All vessel records remain synthetic snapshots and port points are approximate references. State is local to this frontend session; scenario choice resets to Demo Mode on reload.

Container tracking, shipment intelligence, real AI, predictions, authentication, backend services, live AIS and NIMASA/NPA integrations remain unimplemented. The provider adapter, scenario/viewport adapter and overlay lifecycle provide a tested foundation for later authorized work.
