use leptos::prelude::*;
use wasm_bindgen_futures::spawn_local;

use crate::components::file_upload::{FileStatus, FileUploadCard};
use crate::file_io::{current_timestamp, trigger_download};
use crate::types::{FileData, Page};
use common::house_teams;
use common::types::HouseTeamsResult;

#[component]
pub fn HouseTeamsPage(navigate: RwSignal<Page>) -> impl IntoView {
    let bromcom_file: RwSignal<Option<FileData>> = RwSignal::new(None);
    let entra_file: RwSignal<Option<FileData>> = RwSignal::new(None);
    let bromcom_status = RwSignal::new(FileStatus::Idle);
    let entra_status = RwSignal::new(FileStatus::Idle);

    let processing = RwSignal::new(false);
    let error_msg: RwSignal<Option<String>> = RwSignal::new(None);
    let result: RwSignal<Option<HouseTeamsResult>> = RwSignal::new(None);

    let can_generate = move || bromcom_file.get().is_some() && entra_file.get().is_some();

    let on_generate = move |_| {
        let Some(bromcom) = bromcom_file.get_untracked() else { return };
        let Some(entra) = entra_file.get_untracked() else { return };

        processing.set(true);
        result.set(None);
        error_msg.set(None);

        spawn_local(async move {
            let timestamp = current_timestamp();

            let bromcom_text = String::from_utf8_lossy(&bromcom.bytes).into_owned();
            let bromcom_parsed = match common::csv_parser::parse_csv(
                &bromcom_text,
                &["House(s)", "Student email", "Year Group Name"],
            ) {
                Ok(d) => d,
                Err(e) => {
                    error_msg.set(Some(format!("Bromcom file error: {e}")));
                    processing.set(false);
                    return;
                }
            };

            let entra_text = String::from_utf8_lossy(&entra.bytes).into_owned();
            let entra_parsed = match common::csv_parser::parse_csv(&entra_text, &["id", "mail"]) {
                Ok(d) => d,
                Err(e) => {
                    error_msg.set(Some(format!("Entra file error: {e}")));
                    processing.set(false);
                    return;
                }
            };

            let res = house_teams::process(&bromcom_parsed, &entra_parsed, &timestamp);
            result.set(Some(res));
            processing.set(false);
        });
    };

    view! {
        <div class="page">
            <nav class="tool-nav">
                <a href="#" class="tool-nav__link"
                   on:click=move |ev| { ev.prevent_default(); navigate.set(Page::Home); }>
                    "← Home"
                </a>
                <a href="#" class="tool-nav__link"
                   on:click=move |ev| { ev.prevent_default(); navigate.set(Page::ClassDistribution); }>
                    "Class Distribution Tool →"
                </a>
            </nav>

            <header class="hero">
                <span class="hero__tag">"Offline utility"</span>
                <h1>"House & Year Entra ID CSV Builder"</h1>
                <p>"All processing happens locally in your browser. Works offline. No data is uploaded anywhere."</p>
            </header>

            <main class="layout">
                <section class="panel">
                    <div class="panel__header">
                        <h2>"1. Provide the source exports"</h2>
                        <p class="hint">"Drop each file or use the pickers."</p>
                    </div>
                    <div class="grid inputs">
                        <FileUploadCard
                            label="Bromcom Export"
                            badge="CSV"
                            description="Required columns: House(s), Student email, Year Group Name"
                            accept=".csv"
                            required_cols=&["House(s)", "Student email", "Year Group Name"]
                            is_xlsx=false
                            on_file=bromcom_file.write_only()
                            file_status=bromcom_status
                        />
                        <FileUploadCard
                            label="Entra ID Export"
                            badge="CSV"
                            description="Required columns: id, mail"
                            accept=".csv"
                            required_cols=&["id", "mail"]
                            is_xlsx=false
                            on_file=entra_file.write_only()
                            file_status=entra_status
                        />
                    </div>
                </section>

                <section class="panel">
                    <div class="panel__header">
                        <h2>"2. Generate CSVs"</h2>
                    </div>
                    <div class="controls">
                        <button
                            disabled=move || !can_generate() || processing.get()
                            on:click=on_generate
                        >
                            {move || if processing.get() { "Generating…" } else { "Generate CSVs" }}
                        </button>
                        <span class="status-text hint">
                            {move || if can_generate() { "Ready — click to generate." } else { "Select both files to enable." }}
                        </span>
                    </div>
                    {move || error_msg.get().map(|msg| view! {
                        <p class="bad" style="margin-top:12px">{msg}</p>
                    })}
                </section>

                {move || result.get().map(|r| {
                    let HouseTeamsResult { processed, matched, missing_count, group_count, files, missing } = r;
                    let has_missing = !missing.is_empty();
                    let files_len = files.len();
                    view! {
                        <section class="panel">
                            <div class="panel__header">
                                <h2>"3. Review summary"</h2>
                            </div>

                            <div class="stats-row">
                                <div class="stat-card">
                                    <span class="stat-card__label">"Processed"</span>
                                    <span class="stat-card__value">{processed}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"Matched"</span>
                                    <span class="stat-card__value">{matched}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"Missing"</span>
                                    <span class="stat-card__value">{missing_count}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"House-Year groups"</span>
                                    <span class="stat-card__value">{group_count}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"CSV files"</span>
                                    <span class="stat-card__value">{files_len}</span>
                                </div>
                            </div>

                            <div class="download-panel">
                                <h3 class="download-panel__title">"Generated CSV files"</h3>
                                <div class="list">
                                    {files.into_iter().map(|f| {
                                        let name = f.name.clone();
                                        let content = f.content.clone();
                                        let count = f.count;
                                        view! {
                                            <a href="#" class="linklike"
                                               on:click=move |ev| {
                                                   ev.prevent_default();
                                                   trigger_download(&name, &content);
                                               }>
                                                {f.name} " (" {count} " IDs)"
                                            </a>
                                        }
                                    }).collect_view()}
                                </div>
                            </div>

                            {has_missing.then(|| view! {
                                <details class="report-block">
                                    <summary>
                                        <b>"Missing matches report"</b>
                                        <span class="hint">" Unmatched emails and reasons"</span>
                                    </summary>
                                    <div class="table-shell table-shell--tall">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>"#"</th><th>"Student email"</th>
                                                    <th>"Reason"</th><th>"Details"</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {missing.into_iter().enumerate().map(|(i, m)| view! {
                                                    <tr>
                                                        <td>{i + 1}</td>
                                                        <td>{m.email}</td>
                                                        <td class="warn">{m.reason}</td>
                                                        <td class="hint">{format!("{} / {}", m.house, m.year)}</td>
                                                    </tr>
                                                }).collect_view()}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            })}
                        </section>
                    }
                })}
            </main>

            <footer class="footnote">
                <p class="hint small">
                    "Output CSV format: "
                    <code>"version:v1.0"</code>
                    " followed by one Entra " <code>"id"</code> " per line."
                </p>
            </footer>
        </div>
    }
}
