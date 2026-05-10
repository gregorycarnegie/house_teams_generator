# House Teams Generator

A browser-based suite of tools for generating Microsoft Entra ID distribution group CSV files from Bromcom student data exports. Built with Rust + Leptos, compiled to WebAssembly, and statically hosted on GitHub Pages.

All processing happens entirely in the browser — no data leaves your machine.

## Tools

### House & Year Teams Generator

Upload a Bromcom CSV export and an Entra ID CSV export. Matches students by email address and generates one Entra ID import CSV per house/year combination.

Required columns:

- Bromcom: `House(s)`, `Student email`, `Year Group Name`
- Entra ID: `mail`, `id`

### Class Distribution Group Generator

Upload a Bromcom Student Emails XLSX, a Bromcom Class List XLSX, and an Entra ID CSV. Filter students by class tags (e.g. `MA`, `EN`, `SC`) and optionally split output by year group.

Required columns:

- Student Emails XLSX: `Admission Number`, `Student email`, `Year Group Name`
- Class List XLSX: `AdmissionNo`, `StudentClassList`, `StudentYearGroup`, `StudentFullName`
- Entra ID CSV: `mail`, `id`

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
trunk serve
```

Opens at `http://localhost:8080`.

### Run tests

```bash
cargo test --workspace
```

The `common` crate (pure Rust) is tested natively; the `app` crate (Leptos WASM) has no unit tests.

### Production build

```bash
trunk build --release --public-url /house_teams_generator/
```

Output is in `dist/`.

## Project Structure

```text
house_teams_generator/
├── common/          # Pure-Rust logic (parsers, processors) — testable natively
│   └── src/
│       ├── csv_parser.rs
│       ├── xlsx_parser.rs
│       ├── house_teams.rs
│       ├── class_distribution.rs
│       ├── types.rs
│       └── errors.rs
├── app/             # Leptos WASM frontend
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
├── Cargo.toml
└── .github/workflows/deploy.yml
```

## Deployment

Pushes to `main` automatically build and deploy to GitHub Pages via the Actions workflow in `.github/workflows/deploy.yml`. The live URL is `https://<org>.github.io/house_teams_generator/`.
