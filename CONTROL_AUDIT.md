# Visible-control audit — Phases 1–3

Verified in the production browser. Noninteractive status text, legend symbols, the scale and reference metadata are presentation elements rather than buttons. No future intelligence layers are presented as clickable controls.

## Navigation and environment

- [x] Maritime Map — closes explorer and fits the region; named, titled, focused and selected.
- [x] Vessels — opens its explorer tab; selected state and accessible label.
- [x] Ports — opens port references; selected state and accessible label.
- [x] BlueEye AI (Preview) — opens the planned-capability dialog; no AI responses, backend or LLM.
- [x] AI preview Close — closes the dialog and restores navigation state.
- [x] AI preview Escape — dismisses the native modal; keyboard focus is managed by the dialog.
- [x] Mobile AI preview button — same preview action with accessible name and tooltip.
- [x] Simulation information — focus/hover disclosure uses the new demonstration wording.
- [x] Fullscreen simulation information — same disclosure remains available while the map is fullscreen.

## Explorer, selection and details

- [x] Explore Maritime Activity / compact Explore — open, close and reopen predictably.
- [x] Vessels / Ports tabs — mouse selection and arrow-key navigation.
- [x] Vessel search — name, simulated ID and destination queries; no-results state.
- [x] Port search — matching locations; no-results state.
- [x] Clear search — clears the current dataset's query.
- [x] Vessel type — Cargo, Tanker, Container, Support and All vessels.
- [x] Navigation status — Under way, At anchor and All statuses.
- [x] Vessel list row — selection, map focus, highlight and details.
- [x] Port list row — selection, map focus, highlight and active-scenario counts.
- [x] Nearby synthetic vessel row — selects the listed vessel in the active scenario.
- [x] Map vessel / port selection and cluster expansion — retain native layer interaction.
- [x] Focus — refocuses the selected feature.
- [x] Show / Hide Route — explicit route request; updates selected route and visibility.
- [x] Route unavailable — action is disabled and explained for anchored vessels with no route.
- [x] Detail Close / Escape — clears selection and route; restores explorer-control focus.
- [x] Explorer Close / Escape — closes the panel; reopen retains tab and filters.
- [x] Mobile explorer expand / collapse — useful search and results states.
- [x] Mobile details expand / collapse — fields scroll internally; credits remain visible.

## Map toolbar, providers and overlays

- [x] Zoom in / out — native MapLibre controls.
- [x] Reset bearing / north — native compass; rotation was observed and reset to 0 degrees.
- [x] Fit Nigeria / Gulf of Guinea — restores the regional camera.
- [x] Enter / Exit fullscreen — working in the supported preview browser.
- [x] Basemap open / close / Escape — menu fits all eight requested widths.
- [x] Dark Maritime — operational vector style renders.
- [x] Standard — cartographic vector style renders.
- [x] Satellite — NASA raster imagery renders, with full attribution.
- [x] Repeated basemap switching — selection, filters, explorer and selected route retained; one map canvas.
- [x] Layers open / Close / Escape — panel fits all eight widths.
- [x] Vessels overlay — native points, clusters and dependent labels toggle.
- [x] Ports overlay — reference points and dependent labels toggle.
- [x] Routes overlay — route layers toggle; a requested selected route respects visibility.
- [x] Vessel Labels — toggle at their supported zoom threshold (above zoom 8).
- [x] Port Labels — independent preference with Ports as parent overlay.
- [x] Required attribution links — full source credits remain visible; provider references are valid.

## Demonstration settings

- [x] Settings open / Close / Escape — accessible tooltip and selected popup state.
- [x] Demo Mode — 84 synthetic vessels; selected radio and presentation footer.
- [x] Stress Test Mode — 1,200 synthetic vessels; selected radio and test footer.
- [x] Scenario changes — clear obsolete selection, cancel stale loads and preserve camera/filters.
- [x] Cursor coordinates checkbox — optional on desktop; clearly disabled on smaller layouts.
- [x] Cursor readout — real map pointer coordinates, correctly formatted and hidden on mobile.

Map initialization/provider error messages retain working retry and explicit return-to-dark controls. Provider configuration/error paths are also covered by tests. No browser alert dialogs or silent provider fallback are used.
