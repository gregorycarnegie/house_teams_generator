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
        let Some(bromcom) = bromcom_file.get_untracked() else {
            return;
        };
        let Some(entra) = entra_file.get_untracked() else {
            return;
        };

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
        <div class="topbar">
            <div class="topbar__inner">
                <div class="logo" on:click=move |ev| { ev.prevent_default(); navigate.set(Page::Home); }>
                    <div class="logo__mark"></div>
                    <span>"entragen"</span>
                    <span class="mono" style="color:var(--ink-4);font-size:0.82rem;font-weight:400">"v1.2.0"</span>
                </div>
                <nav class="nav">
                    <a href="#" class="active always"
                       on:click=move |ev| { ev.prevent_default(); navigate.set(Page::HouseTeams); }>
                        "House Teams"
                    </a>
                    <a href="#" class="always"
                       on:click=move |ev| { ev.prevent_default(); navigate.set(Page::ClassDistribution); }>
                        "Class Distribution"
                    </a>
                </nav>
                <div class="topbar__right">
                    <a href="https://github.com/gregorycarnegie/house_teams_generator" target="_blank" class="btn-sm">
                        "GitHub ↗"
                    </a>
                </div>
            </div>
        </div>

        <div class="tool-wrap">
            <div class="page-header">
                <button class="page-header__back"
                    on:click=move |_| navigate.set(Page::Home)>
                    "← home"
                </button>
                <h1>"House & Year Teams"</h1>
                <p>"Match Bromcom students to Entra ID accounts and emit one CSV per house × year combination. All processing happens in your browser."</p>
            </div>

            <div class="panel">
                <div class="panel__num">"01"</div>
                <div class="panel__head">
                    <h2>"Source files"</h2>
                    <p>"Drop each file or click to browse."</p>
                </div>
                <div class="upload-grid">
                    <FileUploadCard
                        label="Bromcom Export"
                        badge="CSV"
                        description="Required: House(s), Student email, Year Group Name"
                        accept=".csv"
                        required_cols=&["House(s)", "Student email", "Year Group Name"]
                        is_xlsx=false
                        on_file=bromcom_file.write_only()
                        file_status=bromcom_status
                    />
                    <FileUploadCard
                        label="Entra ID Export"
                        badge="CSV"
                        description="Required: id, mail"
                        accept=".csv"
                        required_cols=&["id", "mail"]
                        is_xlsx=false
                        on_file=entra_file.write_only()
                        file_status=entra_status
                    />
                </div>
            </div>

            <div class="panel">
                <div class="panel__num">"02"</div>
                <div class="panel__head">
                    <h2>"Generate"</h2>
                </div>
                <div class="controls">
                    <button
                        class="btn-generate"
                        disabled=move || !can_generate() || processing.get()
                        on:click=on_generate
                    >
                        {move || if processing.get() { "Generating…" } else { "Generate CSVs" }}
                    </button>
                    <span class="status-hint">
                        {move || if can_generate() { "Ready — click to generate." } else { "Select both files to enable." }}
                    </span>
                </div>
                {move || error_msg.get().map(|msg| view! {
                    <div class="error-msg">{msg}</div>
                })}
            </div>

            {move || result.get().map(|r| {
                let HouseTeamsResult { processed, matched, missing_count, group_count, files, missing } = r;
                let has_missing = !missing.is_empty();
                let files_len = files.len();
                view! {
                    <div class="panel">
                        <div class="panel__num">"03"</div>
                        <div class="panel__head">
                            <h2>"Results"</h2>
                        </div>

                        <div class="stats-strip">
                            <div class="stat-cell">
                                <div class="stat-cell__val">{processed}</div>
                                <div class="stat-cell__lbl">"Processed"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{matched}</div>
                                <div class="stat-cell__lbl">"Matched"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{missing_count}</div>
                                <div class="stat-cell__lbl">"Unmatched"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{group_count}</div>
                                <div class="stat-cell__lbl">"Groups"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{files_len}</div>
                                <div class="stat-cell__lbl">"CSV files"</div>
                            </div>
                        </div>

                        <div class="terminal" style="margin:0 0 16px;max-width:none;">
                            <div class="terminal__bar">
                                <span class="term-dot" style="background:var(--rose)"></span>
                                <span class="term-dot" style="background:var(--amber)"></span>
                                <span class="term-dot" style="background:var(--green)"></span>
                                <span class="terminal__title">"house-teams — run output"</span>
                            </div>
                            <div class="terminal__body">
                                <span class="term-line">
                                    <span class="term-mute">"› parsing bromcom …………………  "</span>
                                    <span class="term-ok">"✓"</span>
                                    "  "
                                    <span class="term-mute">{processed}" students"</span>
                                </span>
                                <span class="term-line">
                                    <span class="term-mute">"› matching entra IDs …………  "</span>
                                    <span class="term-ok">"✓"</span>
                                    "  "
                                    <span class="term-mute">{matched}" matched"</span>
                                    {(missing_count > 0).then(|| view! {
                                        <span class="term-warn">"  ⚠ "{missing_count}" unmatched"</span>
                                    })}
                                </span>
                                <span class="term-line">
                                    <span class="term-mute">"› building groups ……………………  "</span>
                                    <span class="term-ok">"✓"</span>
                                    "  "
                                    <span class="term-info">{group_count}" groups"</span>
                                </span>
                                <span class="term-line">
                                    <span class="term-ok">"✓"</span>
                                    " done — "
                                    <span class="term-info">{files_len}" csv files"</span>
                                    " ready"
                                    <span class="term-cursor"></span>
                                </span>
                            </div>
                        </div>

                        <div class="download-panel">
                            <h3>"Generated CSV files"</h3>
                            <div class="download-list">
                                {files.into_iter().map(|f| {
                                    let name = f.name.clone();
                                    let content = f.content.clone();
                                    let count = f.count;
                                    view! {
                                        <a href="#" class="download-item"
                                           on:click=move |ev| {
                                               ev.prevent_default();
                                               trigger_download(&name, &content);
                                           }>
                                            {f.name}
                                            <span class="download-item__count">{count} " IDs"</span>
                                        </a>
                                    }
                                }).collect_view()}
                            </div>
                        </div>

                        {has_missing.then(|| view! {
                            <details class="report-block">
                                <summary>
                                    <b>"Missing matches"</b>
                                    <span class="hint">" — unmatched emails and reasons"</span>
                                </summary>
                                <div class="report-block__body">
                                    <div class="table-shell table-shell--tall">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>"#"</th>
                                                    <th>"Student email"</th>
                                                    <th>"Reason"</th>
                                                    <th>"Details"</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {missing.into_iter().enumerate().map(|(i, m)| view! {
                                                    <tr>
                                                        <td>{i + 1}</td>
                                                        <td>{m.email}</td>
                                                        <td class="warn">{m.reason}</td>
                                                        <td class="ok" style="color:var(--ink-3)">{format!("{} / {}", m.house, m.year)}</td>
                                                    </tr>
                                                }).collect_view()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </details>
                        })}
                    </div>
                }
            })}

            <div class="tool-footer">
                "Output: "
                <code>"version:v1.0"</code>
                " header, then one Entra "
                <code>"id"</code>
                " per line."
            </div>
        </div>
    }
}
