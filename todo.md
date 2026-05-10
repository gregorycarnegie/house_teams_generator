# Refactor to Rust + Leptos (GitHub Pages)

## 1. Project Setup

- [ ] Install Rust toolchain (`rustup`) and `cargo`
- [ ] Install `trunk` (`cargo install trunk`) — builds and bundles Leptos WASM apps
- [ ] Add WASM target: `rustup target add wasm32-unknown-unknown`
- [ ] Install `wasm-bindgen-cli` (`cargo install wasm-bindgen-cli`)
- [ ] Create new Cargo workspace at repo root with two members: `house-teams` and `class-distribution`
- [ ] Add shared library crate `common` to the workspace for code reused by both tools
- [ ] Configure `Trunk.toml` for each tool (output dir, public URL for GitHub Pages subdirectory)

## 2. Dependencies (Cargo.toml)

- [ ] Add `leptos` with the `csr` (client-side rendering) feature — required for static hosting
- [ ] Add `web-sys` with required features: `File`, `FileList`, `FileReader`, `Blob`, `Url`, `HtmlAnchorElement`, `DataTransfer`, `DragEvent`, `FileSystemDirectoryHandle`
- [ ] Add `wasm-bindgen` and `wasm-bindgen-futures` for async file reading
- [ ] Add `csv` crate for CSV parsing and generation
- [ ] Add `calamine` crate for XLSX parsing (replaces SheetJS CDN dependency)
- [ ] Add `serde` + `serde_json` for data structures
- [ ] Add `thiserror` for custom error types

## 3. Shared `common` Crate

- [ ] Define shared data types: `Student`, `EntraUser`, `MatchedRecord`, `MatchResult`, `ProcessingStats`
- [ ] Port `errors.ts` → custom `AppError` enum with `thiserror` variants: `FileValidation`, `DataMatching`, `Export`
- [ ] Port email normalization logic (trim + lowercase)
- [ ] Port filename sanitisation helper
- [ ] Port Entra ID CSV output format writer (header block + IDs)
- [ ] Port class tag parsing helper (space/comma/newline separated input)

## 4. House Teams Tool — Core Logic

- [ ] Port `SpreadsheetParser.ts` → CSV parser using `csv` crate; parse Bromcom CSV (columns: `House(s)`, `Student email`, `Year Group Name`)
- [ ] Port Entra ID CSV parser (columns: `id`, `mail`)
- [ ] Port `DataMatcher.ts` → build email→ID lookup map; match students; collect missing matches with reasons
- [ ] Port `HouseTeamsGenerator.ts` → group students by house+year; generate one CSV string per group
- [ ] Port header validation (required column checking)
- [ ] Write unit tests for matcher and generator logic

## 5. Class Distribution Tool — Core Logic

- [ ] Port `SpreadsheetParser.ts` → CSV parser for student emails file; XLSX parser using `calamine` for class list and Entra export
- [ ] Port three-way `DataMatcher.ts` → admission number → email → Entra ID lookup chain
- [ ] Port class tag filter (substring match, case-insensitive against `StudentClassList`)
- [ ] Port year group splitting logic
- [ ] Port `ClassDistributionGenerator.ts` → generate CSV string(s) per year group or combined
- [ ] Port duplicate deduplication (admission number keyed)
- [ ] Write unit tests for matcher, filter, and generator logic

## 6. Leptos UI — Shared Components

- [ ] `<FileUploadCard>` component: drag-and-drop zone, click-to-browse, file name display, validation state (valid / error message)
- [ ] `<StatsPanel>` component: grid of labelled count cards
- [ ] `<ProcessingLog>` component: scrollable list of log entries with level colours (info/warning/error/success)
- [ ] `<DataTable>` component: generic header + rows table for missing matches and year group breakdowns
- [ ] `<CsvDownloadList>` component: list of download anchor links generated from `Blob` URLs
- [ ] Implement reactive signals for: file state, config state, results state

## 7. Leptos UI — House Teams Tool

- [ ] Landing/upload section: two `<FileUploadCard>` instances (Bromcom CSV, Entra ID CSV)
- [ ] Config section: save-mode radio buttons ("Download each CSV" / "Save to folder")
- [ ] Process button: disabled until both files are valid; triggers async WASM processing
- [ ] Results section: `<StatsPanel>`, `<CsvDownloadList>`, missing matches `<DataTable>`
- [ ] Wire File System Access API folder picker (web-sys) for bulk folder save mode
- [ ] Wire individual CSV Blob download links (fallback and default)
- [ ] Match visual layout of existing `house-teams/index.html`

## 8. Leptos UI — Class Distribution Tool

- [ ] Upload section: three `<FileUploadCard>` instances (Student Emails, Class List XLSX, Entra ID CSV)
- [ ] Optional data preview toggle: show first-N-rows table per file after upload
- [ ] Config section: class tags textarea, year-group-mode checkbox
- [ ] Process button: disabled until all three files are valid and tags are non-empty
- [ ] Results section: `<StatsPanel>`, year group breakdown `<DataTable>`, `<CsvDownloadList>`, `<ProcessingLog>`
- [ ] Match visual layout of existing `class-distribution/index.html`

## 9. Landing Page

- [ ] Create root Leptos app with `leptos_router` routes: `/`, `/house-teams/`, `/class-distribution/`
- [ ] Port landing page hero section and two feature cards with navigation links
- [ ] Port privacy/offline-first statements

## 10. Styling

- [ ] Port `shared/landing.css` to a global CSS file included via `Trunk.toml`
- [ ] Port `house-teams/styles.css` into the house-teams route/component
- [ ] Port `class-distribution/styles.css` into the class-distribution route/component
- [ ] Verify responsive layout and drag-drop visual feedback states

## 11. Async File Reading (WASM Bridge)

- [ ] Implement `read_file_as_text(file: &web_sys::File) -> Future<String>` using `FileReader` + `wasm-bindgen-futures`
- [ ] Implement `read_file_as_array_buffer(file: &web_sys::File) -> Future<Vec<u8>>` for XLSX files fed to `calamine`
- [ ] Implement `create_download_link(filename: &str, content: &str) -> String` returning an object URL from a `Blob`
- [ ] Implement `revoke_object_url(url: &str)` to clean up Blob URLs after download

## 12. GitHub Pages Deployment

- [ ] Add `.github/workflows/deploy.yml` — workflow that runs `trunk build --release` and deploys `dist/` to `gh-pages` branch
- [ ] Set `public_url` in `Trunk.toml` to match the GitHub Pages subdirectory (e.g. `/house_teams_generator/`)
- [ ] Add a top-level `index.html` redirect (or configure Leptos router base path) so the landing page loads at the repo Pages URL
- [ ] Confirm `404.html` or hash-based routing so deep links don't 404 on GitHub Pages
- [ ] Test production build locally with `trunk serve --release`

## 13. Testing

- [ ] Port or rewrite `ClassDistributionGenerator.test.ts` as Rust unit tests in `class-distribution/src/`
- [ ] Add unit tests for house-teams generator logic
- [ ] Add integration smoke test: feed sample CSV bytes through the full pipeline and assert output CSV content
- [ ] Run `cargo test --workspace` in CI workflow

## 14. Cleanup

- [ ] Remove old TypeScript source directories (`house-teams/src`, `class-distribution/src`, `shared/`)
- [ ] Remove `package.json`, `tsconfig.json`, `vitest.config.ts` and all `node_modules`
- [ ] Remove old `dist/` directories
- [ ] Update `README.md` with Rust/Leptos setup instructions and new build commands
