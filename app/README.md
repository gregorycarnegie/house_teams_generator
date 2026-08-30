# app

The [entragen](../README.md) frontend: a [Leptos](https://leptos.dev/) CSR
application compiled to WebAssembly and served as static files. It is the only
crate that touches the browser — all parsing and generation lives in
[`common`](../common/README.md).

```bash
cd app
trunk serve            # http://localhost:8080
```

The crate builds only for `wasm32-unknown-unknown`; it has no unit tests,
because everything worth asserting on is in `common`.

## How a file gets processed

1. `FileUploadCard` reads the dropped or picked file into a `Vec<u8>` via
   `FileReader`, then calls `common::parse_any` to validate it immediately —
   so a wrong file is reported on the card, not after clicking Generate.
2. The page keeps the raw bytes in a signal and re-parses them on Generate,
   this time keeping the `ParsedData`.
3. The generator returns `GeneratedFile`s, and `file_io::trigger_download`
   hands each one to the browser as a blob.

Nothing is uploaded anywhere. There is no server component and no network call
after the initial page load.

## Upload cards

`FileUploadCard` takes a `label`, a `description` and the `required_cols` that
slot needs. It deliberately has **no** format prop: every slot accepts every
supported format, and `common::ACCEPTED_EXTENSIONS` is the single source of
truth for what the picker advertises. A per-slot format would go stale the
moment `common` learns a new one — which is exactly how the pickers ended up
advertising `.xls` support that never existed.

## Layout

| File | What it holds |
| --- | --- |
| `main.rs` | Mount point |
| `app.rs` | Page routing (a signal, not a router — there are three pages) |
| `types.rs` | `Page`, `FileData` |
| `components/file_upload.rs` | Drop target, `FileReader`, per-file validation |
| `file_io.rs` | Blob downloads and the filename timestamp |
| `pages/` | `home`, `house_teams`, `class_distribution` |
| `index.html` | Trunk entry point |
| `styles.css` | All styling — no CSS framework |

The version shown in the header comes from `env!("CARGO_PKG_VERSION")`, so it
follows the workspace version with nothing to update by hand.

## Building for deployment

```bash
trunk build --release --public-url /entragen/
```

Output lands in `../dist/`. `--public-url` must match the GitHub Pages
subpath, or every asset 404s; CI passes it from `PUBLIC_URL`.
