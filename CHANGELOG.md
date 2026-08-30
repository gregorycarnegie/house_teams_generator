# Changelog

Notable changes to entragen are documented here.

## 1.3.0 - 2026-08-30

### Added

- Added content-based dispatch for CSV, XLSX, XLSB, and ODS input, with an actionable error for legacy XLS files.
- Added XLSX and ODS parser fixtures and expanded regression coverage for both generators.
- Added regression tests for colliding house filenames, deterministic member ordering, and multibyte class tags.
- Added per-crate README documentation for `app` and `common`.

### Changed

- Generate member IDs in a stable sorted order, producing identical file contents for identical input.
- Propagate CSV record errors instead of discarding them defensively.
- Share header validation across CSV and spreadsheet parsing.
- Route every upload through a single `parse_any` entry point, so upload slots no longer declare a format.
- Renamed `xlsx_parser` to `spreadsheet`, which is what it now reads.
- Stop advertising unsupported legacy XLS files in the upload pickers.
- Updated Rust dependencies, including Leptos, Calamine, and wasm-bindgen.

### Fixed

- Keep distinct house/year groups separate when their sanitized filenames collide.
- Add deterministic numeric suffixes to colliding output filenames.
- Truncate class-tag filename components by Unicode characters instead of bytes, preventing multibyte input from panicking.

## 1.2.2 - 2026-06-09

### Fixed

- Read class-tag input from its textarea using the correct browser element type.

## 1.2.1 - 2026-05-11

### Fixed

- Stop validated column lookups from silently falling back to unrelated column positions.

## 1.2.0 - 2026-05-11

### Added

- Added House & Year Teams and Class Distribution Group generators in a single application.
- Added local CSV/XLSX processing, result summaries, unmatched-record reports, and browser downloads.
- Added GitHub Pages deployment with formatting, Clippy, test, and release-build checks.

### Changed

- Rebuilt the project from TypeScript as a Rust workspace using Leptos and WebAssembly.
- Consolidated the separate tools behind a shared interface and common processing crate.
- Refreshed the interface, documentation, branding, and version display.

### Removed

- Removed the previous TypeScript applications and Node-based build/test tooling.
