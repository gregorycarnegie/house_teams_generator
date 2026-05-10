use leptos::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;

use crate::components::file_upload::{FileStatus, FileUploadCard};
use crate::file_io::{current_timestamp, trigger_download};
use crate::types::{FileData, Page};
use common::class_distribution;
use common::types::ClassDistResult;

#[component]
pub fn ClassDistributionPage(navigate: RwSignal<Page>) -> impl IntoView {
    let emails_file: RwSignal<Option<FileData>> = RwSignal::new(None);
    let class_file: RwSignal<Option<FileData>> = RwSignal::new(None);
    let entra_file: RwSignal<Option<FileData>> = RwSignal::new(None);
    let emails_status = RwSignal::new(FileStatus::Idle);
    let class_status = RwSignal::new(FileStatus::Idle);
    let entra_status = RwSignal::new(FileStatus::Idle);

    let tags_input = RwSignal::new(String::new());
    let yeargroup_mode = RwSignal::new(false);

    let processing = RwSignal::new(false);
    let error_msg: RwSignal<Option<String>> = RwSignal::new(None);
    let result: RwSignal<Option<ClassDistResult>> = RwSignal::new(None);

    let all_files_ready = move || {
        emails_file.get().is_some() && class_file.get().is_some() && entra_file.get().is_some()
    };
    let tags_non_empty = move || !tags_input.get().trim().is_empty();
    let can_generate = move || all_files_ready() && tags_non_empty();

    let on_generate = move |_| {
        let Some(emails) = emails_file.get_untracked() else {
            return;
        };
        let Some(class) = class_file.get_untracked() else {
            return;
        };
        let Some(entra) = entra_file.get_untracked() else {
            return;
        };
        let raw_tags = tags_input.get_untracked();
        let yg_mode = yeargroup_mode.get_untracked();

        processing.set(true);
        result.set(None);
        error_msg.set(None);

        spawn_local(async move {
            let timestamp = current_timestamp();
            let tags = class_distribution::parse_tags(&raw_tags);

            let emails_parsed = match common::xlsx_parser::parse_xlsx(
                &emails.bytes,
                &["Admission Number", "Year Group Name", "Student email"],
            ) {
                Ok(d) => d,
                Err(e) => {
                    error_msg.set(Some(format!("Student emails file error: {e}")));
                    processing.set(false);
                    return;
                }
            };

            let class_parsed = match common::xlsx_parser::parse_xlsx(
                &class.bytes,
                &[
                    "StudentFullName",
                    "StudentYearGroup",
                    "StudentClassList",
                    "AdmissionNo",
                ],
            ) {
                Ok(d) => d,
                Err(e) => {
                    error_msg.set(Some(format!("Class list file error: {e}")));
                    processing.set(false);
                    return;
                }
            };

            let entra_text = String::from_utf8_lossy(&entra.bytes).into_owned();
            let entra_parsed = match common::csv_parser::parse_csv(&entra_text, &["mail", "id"]) {
                Ok(d) => d,
                Err(e) => {
                    error_msg.set(Some(format!("Entra file error: {e}")));
                    processing.set(false);
                    return;
                }
            };

            match class_distribution::process(
                &emails_parsed,
                &class_parsed,
                &entra_parsed,
                &tags,
                yg_mode,
                &timestamp,
            ) {
                Ok(res) => result.set(Some(res)),
                Err(e) => error_msg.set(Some(e.to_string())),
            }
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
                    <a href="#" class="always"
                       on:click=move |ev| { ev.prevent_default(); navigate.set(Page::HouseTeams); }>
                        "House Teams"
                    </a>
                    <a href="#" class="active always"
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
                <h1>"Class Distribution Groups"</h1>
                <p>"Generate Entra ID distribution group CSVs filtered by class tags. Three-source pipeline — all processed locally in your browser."</p>
            </div>

            <div class="panel">
                <div class="panel__num">"01"</div>
                <div class="panel__head">
                    <h2>"Source files"</h2>
                    <p>"Upload the three required files."</p>
                </div>
                <div class="upload-grid">
                    <FileUploadCard
                        label="Student Emails"
                        badge="XLSX"
                        description="Required: Admission Number, Year Group Name, Student email"
                        accept=".xlsx,.xls"
                        required_cols=&["Admission Number", "Year Group Name", "Student email"]
                        is_xlsx=true
                        on_file=emails_file.write_only()
                        file_status=emails_status
                    />
                    <FileUploadCard
                        label="Student Class List"
                        badge="XLSX"
                        description="Required: StudentFullName, StudentYearGroup, StudentClassList, AdmissionNo"
                        accept=".xlsx,.xls"
                        required_cols=&["StudentFullName", "StudentYearGroup", "StudentClassList", "AdmissionNo"]
                        is_xlsx=true
                        on_file=class_file.write_only()
                        file_status=class_status
                    />
                    <FileUploadCard
                        label="Entra ID Export"
                        badge="CSV"
                        description="Required: mail, id"
                        accept=".csv"
                        required_cols=&["mail", "id"]
                        is_xlsx=false
                        on_file=entra_file.write_only()
                        file_status=entra_status
                    />
                </div>
            </div>

            <div class="panel">
                <div class="panel__num">"02"</div>
                <div class="panel__head">
                    <h2>"Configure"</h2>
                    <p>"Enter class tags to filter by, then choose whether to split by year group."</p>
                </div>
                <div class="controls-grid">
                    <div class="control-group control-group--wide">
                        <label for="classTagFilters">"Class tag filters"</label>
                        <textarea
                            id="classTagFilters"
                            rows="3"
                            placeholder="Enter class tags (one per line or space-separated)\nExample: MAT MAF SCI"
                            on:input=move |ev| {
                                let el: web_sys::HtmlInputElement =
                                    ev.target().unwrap().dyn_into().unwrap();
                                tags_input.set(el.value());
                            }
                            prop:value=move || tags_input.get()
                        />
                        <span class="status-hint">
                            "Students included if their class list contains ANY tag (substring, case-insensitive)"
                        </span>
                    </div>

                    <div class="control-group">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                prop:checked=move || yeargroup_mode.get()
                                on:change=move |ev| {
                                    let el: web_sys::HtmlInputElement =
                                        ev.target().unwrap().dyn_into().unwrap();
                                    yeargroup_mode.set(el.checked());
                                }
                            />
                            " Year group mode"
                        </label>
                        <span class="status-hint">"Creates separate CSV files for each year group"</span>
                    </div>
                </div>
            </div>

            <div class="panel">
                <div class="panel__num">"03"</div>
                <div class="panel__head">
                    <h2>"Generate"</h2>
                </div>
                <div class="controls">
                    <button
                        class="btn-generate"
                        disabled=move || !can_generate() || processing.get()
                        on:click=on_generate
                    >
                        {move || if processing.get() { "Generating…" } else { "Generate CSV(s)" }}
                    </button>
                    <span class="status-hint">
                        {move || {
                            if !all_files_ready() { "Select all three files to continue." }
                            else if !tags_non_empty() { "Enter at least one class tag." }
                            else { "Ready — click to generate." }
                        }}
                    </span>
                </div>
                {move || error_msg.get().map(|msg| view! {
                    <div class="error-msg">{msg}</div>
                })}
            </div>

            {move || result.get().map(|r| {
                let ClassDistResult { total, matched, filtered, with_id, files, year_groups, warnings } = r;
                let has_warnings = !warnings.is_empty();
                let has_year_groups = !year_groups.is_empty();
                let files_len = files.len();
                let warnings_count = warnings.len();
                view! {
                    <div class="panel">
                        <div class="panel__num">"04"</div>
                        <div class="panel__head">
                            <h2>"Results"</h2>
                        </div>

                        <div class="stats-strip">
                            <div class="stat-cell">
                                <div class="stat-cell__val">{total}</div>
                                <div class="stat-cell__lbl">"Total"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{matched}</div>
                                <div class="stat-cell__lbl">"Matched"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{filtered}</div>
                                <div class="stat-cell__lbl">"Filtered"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{with_id}</div>
                                <div class="stat-cell__lbl">"With ID"</div>
                            </div>
                            <div class="stat-cell">
                                <div class="stat-cell__val">{files_len}</div>
                                <div class="stat-cell__lbl">"Files"</div>
                            </div>
                        </div>

                        <div class="terminal" style="margin:0 0 16px;max-width:none;">
                            <div class="terminal__bar">
                                <span class="term-dot" style="background:var(--rose)"></span>
                                <span class="term-dot" style="background:var(--amber)"></span>
                                <span class="term-dot" style="background:var(--green)"></span>
                                <span class="terminal__title">"class-distribution — run output"</span>
                            </div>
                            <div class="terminal__body">
                                <span class="term-line">
                                    <span class="term-mute">"› loading student records …  "</span>
                                    <span class="term-ok">"✓"</span>
                                    "  "
                                    <span class="term-mute">{total}" students"</span>
                                </span>
                                <span class="term-line">
                                    <span class="term-mute">"› matching class + entra …  "</span>
                                    <span class="term-ok">"✓"</span>
                                    "  "
                                    <span class="term-mute">{matched}" with IDs"</span>
                                </span>
                                <span class="term-line">
                                    <span class="term-mute">"› applying tag filter ………  "</span>
                                    <span class="term-ok">"✓"</span>
                                    "  "
                                    <span class="term-info">{filtered}" matched"</span>
                                    {(warnings_count > 0).then(|| view! {
                                        <span class="term-warn">"  ⚠ "{warnings_count}" warnings"</span>
                                    })}
                                </span>
                                <span class="term-line">
                                    <span class="term-ok">"✓"</span>
                                    " done — "
                                    <span class="term-info">{files_len}" csv file(s)"</span>
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

                        {has_warnings.then(|| view! {
                            <details class="report-block">
                                <summary>
                                    <b>"Processing log"</b>
                                    <span class="hint">" — warnings and unmatched students"</span>
                                </summary>
                                <div class="report-block__body">
                                    <div class="log-container">
                                        {warnings.into_iter().map(|w| view! {
                                            <p>"⚠ " {w}</p>
                                        }).collect_view()}
                                    </div>
                                </div>
                            </details>
                        })}

                        {has_year_groups.then(|| view! {
                            <details class="report-block">
                                <summary>
                                    <b>"Year group breakdown"</b>
                                    <span class="hint">" — students per year group"</span>
                                </summary>
                                <div class="report-block__body">
                                    <div class="table-shell table-shell--medium">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>"Year Group"</th>
                                                    <th>"Students"</th>
                                                    <th>"IDs Exported"</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {year_groups.into_iter().map(|yg| view! {
                                                    <tr>
                                                        <td>{yg.year}</td>
                                                        <td>{yg.count}</td>
                                                        <td>{yg.count}</td>
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
