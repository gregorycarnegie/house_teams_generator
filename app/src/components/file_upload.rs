use js_sys::{ArrayBuffer, Uint8Array};
use leptos::prelude::*;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::{spawn_local, JsFuture};

use crate::types::FileData;

#[derive(Clone, PartialEq)]
pub enum FileStatus {
    Idle,
    Loading,
    Ready(String),
    Error(String),
}

async fn read_file_bytes(file: &web_sys::File) -> Result<Vec<u8>, String> {
    let reader =
        web_sys::FileReader::new().map_err(|e| format!("FileReader init failed: {e:?}"))?;

    // Build a Promise that resolves when onload fires
    let reader_for_closure = reader.clone();
    let promise = js_sys::Promise::new(&mut move |resolve, reject| {
        let r = reader_for_closure.clone();

        let onload = Closure::once(move |_: web_sys::Event| {
            let result = r.result().unwrap_or(JsValue::NULL);
            resolve.call1(&JsValue::NULL, &result).ok();
        });
        reader_for_closure.set_onload(Some(onload.as_ref().unchecked_ref()));
        onload.forget();

        let onerror = Closure::once(move |_: web_sys::Event| {
            reject.call0(&JsValue::NULL).ok();
        });
        reader_for_closure.set_onerror(Some(onerror.as_ref().unchecked_ref()));
        onerror.forget();
    });

    reader
        .read_as_array_buffer(file)
        .map_err(|e| format!("read_as_array_buffer failed: {e:?}"))?;

    let result = JsFuture::from(promise)
        .await
        .map_err(|e| format!("FileReader error: {e:?}"))?;

    let array_buffer: ArrayBuffer = result
        .dyn_into()
        .map_err(|_| "Result is not an ArrayBuffer".to_string())?;

    Ok(Uint8Array::new(&array_buffer).to_vec())
}

#[component]
pub fn FileUploadCard(
    label: &'static str,
    badge: &'static str,
    description: &'static str,
    accept: &'static str,
    required_cols: &'static [&'static str],
    is_xlsx: bool,
    on_file: WriteSignal<Option<FileData>>,
    file_status: RwSignal<FileStatus>,
) -> impl IntoView {
    let handle_bytes = move |name: String, bytes: Vec<u8>| {
        let validation = if is_xlsx {
            common::xlsx_parser::parse_xlsx(&bytes, required_cols)
                .map(|_| ())
                .map_err(|e| e.to_string())
        } else {
            let text = String::from_utf8_lossy(&bytes).into_owned();
            common::csv_parser::parse_csv(&text, required_cols)
                .map(|_| ())
                .map_err(|e| e.to_string())
        };
        match validation {
            Ok(()) => {
                file_status.set(FileStatus::Ready(name.clone()));
                on_file.set(Some(FileData { name, bytes }));
            }
            Err(msg) => {
                file_status.set(FileStatus::Error(msg));
                on_file.set(None);
            }
        }
    };

    let handle_file = move |file: web_sys::File| {
        let name = file.name();
        file_status.set(FileStatus::Loading);
        spawn_local(async move {
            match read_file_bytes(&file).await {
                Ok(bytes) => handle_bytes(name, bytes),
                Err(e) => file_status.set(FileStatus::Error(e)),
            }
        });
    };

    let on_change = move |ev: web_sys::Event| {
        let input: web_sys::HtmlInputElement = ev.target().unwrap().dyn_into().unwrap();
        if let Some(files) = input.files() {
            if let Some(file) = files.get(0) {
                handle_file(file);
            }
        }
    };

    let on_dragover = |ev: web_sys::DragEvent| {
        ev.prevent_default();
    };

    let on_drop = move |ev: web_sys::DragEvent| {
        ev.prevent_default();
        if let Some(dt) = ev.data_transfer() {
            if let Some(files) = dt.files() {
                if let Some(file) = files.get(0) {
                    handle_file(file);
                }
            }
        }
    };

    view! {
        <div class="upload-card">
            <div class="upload-card__meta">
                <div class="upload-card__header">
                    <h3>{label}</h3>
                </div>
                <span class="upload-card__badge">{badge}</span>
                <p class="upload-card__description hint">{description}</p>
            </div>
            <div
                class="file-picker"
                on:dragover=on_dragover
                on:drop=on_drop
            >
                <input
                    type="file"
                    accept=accept
                    on:change=on_change
                />
                {move || match file_status.get() {
                    FileStatus::Idle => view! {
                        <span class="file-picker__title">"Drop file or click to browse"</span>
                        <span class="file-picker__formats">{accept}</span>
                    }.into_any(),
                    FileStatus::Loading => view! {
                        <span class="file-picker__title">"Reading…"</span>
                    }.into_any(),
                    FileStatus::Ready(name) => view! {
                        <span class="file-picker__title ok">"✓ " {name}</span>
                    }.into_any(),
                    FileStatus::Error(msg) => view! {
                        <span class="file-picker__title bad">"⚠ " {msg}</span>
                    }.into_any(),
                }}
            </div>
        </div>
    }
}
