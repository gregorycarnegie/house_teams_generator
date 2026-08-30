# entragen

[![Deploy to GitHub Pages](https://github.com/gregorycarnegie/entragen/actions/workflows/deploy.yml/badge.svg)](https://github.com/gregorycarnegie/entragen/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/badge/live-GitHub%20Pages-blue?logo=github)](https://gregorycarnegie.github.io/entragen/)
[![Rust](https://img.shields.io/badge/language-Rust-orange?logo=rust)](https://www.rust-lang.org/)
[![Leptos](https://img.shields.io/badge/framework-Leptos-EF3939?logo=leptos&logoColor=white)](https://leptos.dev/)
[![WebAssembly](https://img.shields.io/badge/runtime-WebAssembly-654FF0?logo=webassembly)](https://webassembly.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A browser-based suite of tools for generating Microsoft Entra ID distribution group CSV files from Bromcom student data exports. Built with Rust + Leptos, compiled to WebAssembly, and statically hosted on GitHub Pages.

All processing happens entirely in the browser — no data leaves your machine.

## Tools

### House & Year Teams Generator

Upload a Bromcom export and an Entra ID export. Matches students by email address and generates one Entra ID import CSV per house/year combination.

Required columns:

- Bromcom: `House(s)`, `Student email`, `Year Group Name`
- Entra ID: `mail`, `id`

### Class Distribution Group Generator

Upload a Bromcom Student Emails export, a Bromcom Class List export, and an Entra ID export. Filter students by class tags (e.g. `MA`, `EN`, `SC`) and optionally split output by year group.

Required columns:

- Student Emails: `Admission Number`, `Student email`, `Year Group Name`
- Class List: `AdmissionNo`, `StudentClassList`, `StudentYearGroup`, `StudentFullName`
- Entra ID: `mail`, `id`

## Input Formats

Every upload accepts `.csv`, `.xlsx`, `.xlsb` or `.ods`, in any slot. The format
is detected from the file's content rather than its name, so a mislabelled file
still works. Pre-2007 `.xls` workbooks are refused with a prompt to re-save:
the format is long superseded and carries the legacy macro attack surface.

## Output Format

All tools produce CSVs in the Entra ID bulk import format:

```text
version:v1.0
Member object ID or user principal name [memberObjectIdOrUpn] Required
Example: 9832aad8-e4fe-496b-a604-95c6ef01ae75
<entra-id-1>
<entra-id-2>
...
```

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- [Trunk](https://trunkrs.dev/): `cargo install trunk`

### Run locally

```bash
cd app
trunk serve
```

Opens at `http://localhost:8080`.

### Run tests

```bash
cargo test --workspace
```

The `common` crate (pure Rust) is tested natively; the `app` crate (Leptos WASM) has no unit tests.
Per-crate detail is in [`common/README.md`](common/README.md) and [`app/README.md`](app/README.md).

### Production build

```bash
trunk build --release --public-url /entragen/
```

Output is in `dist/`.

## Project Structure

```text
entragen/
├── common/          # Pure-Rust logic (parsers, processors) — testable natively
│   ├── README.md
│   ├── fixtures/    # Generated .xlsx / .ods test workbooks
│   └── src/
│       ├── csv_parser.rs
│       ├── spreadsheet.rs
│       ├── house_teams.rs
│       ├── class_distribution.rs
│       ├── types.rs
│       └── errors.rs
├── app/             # Leptos WASM frontend
│   ├── README.md
│   ├── src/
│   │   ├── app.rs
│   │   ├── file_io.rs
│   │   ├── types.rs
│   │   ├── components/
│   │   │   └── file_upload.rs
│   │   └── pages/
│   │       ├── home.rs
│   │       ├── house_teams.rs
│   │       └── class_distribution.rs
│   ├── index.html
│   └── styles.css
├── Trunk.toml
├── CHANGELOG.md
├── Cargo.toml
└── .github/workflows/deploy.yml
```

## Deployment

Pushes to `main` automatically build and deploy to GitHub Pages via the Actions workflow in `.github/workflows/deploy.yml`. The live URL is `https://<org>.github.io/entragen/`.
