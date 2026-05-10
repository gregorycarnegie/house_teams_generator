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

    let all_files_ready =
        move || emails_file.get().is_some() && class_file.get().is_some() && entra_file.get().is_some();
    let tags_non_empty = move || !tags_input.get().trim().is_empty();
    let can_generate = move || all_files_ready() && tags_non_empty();

    let on_generate = move |_| {
        let Some(emails) = emails_file.get_untracked() else { return };
        let Some(class) = class_file.get_untracked() else { return };
        let Some(entra) = entra_file.get_untracked() else { return };
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
                &["StudentFullName", "StudentYearGroup", "StudentClassList", "AdmissionNo"],
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
        <div class="page">
            <nav class="tool-nav">
                <a href="#" class="tool-nav__link"
                   on:click=move |ev| { ev.prevent_default(); navigate.set(Page::Home); }>
                    "← Home"
                </a>
                <a href="#" class="tool-nav__link"
                   on:click=move |ev| { ev.prevent_default(); navigate.set(Page::HouseTeams); }>
                    "House Teams Tool →"
                </a>
            </nav>

            <header class="hero">
                <span class="hero__tag">"Offline utility"</span>
                <h1>"Class Distribution Group Generator"</h1>
                <p>"Generate Entra ID distribution group CSVs based on class tags. All processing happens locally in your browser."</p>
            </header>

            <main class="layout">
                <section class="panel">
                    <div class="panel__header">
                        <h2>"1. Provide source files"</h2>
                        <p class="hint">"Upload the three required files."</p>
                    </div>
                    <div class="grid inputs">
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
                            description="Required columns: mail, id"
                            accept=".csv"
                            required_cols=&["mail", "id"]
                            is_xlsx=false
                            on_file=entra_file.write_only()
                            file_status=entra_status
                        />
                    </div>
                </section>

                <section class="panel">
                    <div class="panel__header">
                        <h2>"2. Configure filters and output"</h2>
                        <p class="hint">"Enter class tags to filter students and choose whether to split by year group."</p>
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
                            <span class="hint small">
                                "Students are included if their StudentClassList contains ANY of these tags (substring match, case-insensitive)"
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
                                " Yeargroup mode"
                            </label>
                            <span class="hint small">"Creates separate CSV files for each year group"</span>
                        </div>

                        <button
                            disabled=move || !can_generate() || processing.get()
                            on:click=on_generate
                        >
                            {move || if processing.get() { "Generating…" } else { "Generate Distribution Group CSV(s)" }}
                        </button>

                        <span class="status-text hint">
                            {move || {
                                if !all_files_ready() { "Select all three files to continue." }
                                else if !tags_non_empty() { "Enter at least one class tag to enable." }
                                else { "Ready — click to generate." }
                            }}
                        </span>
                    </div>
                    {move || error_msg.get().map(|msg| view! {
                        <p class="bad" style="margin-top:12px">{msg}</p>
                    })}
                </section>

                {move || result.get().map(|r| {
                    let ClassDistResult { total, matched, filtered, with_id, files, year_groups, warnings } = r;
                    let has_warnings = !warnings.is_empty();
                    let has_year_groups = !year_groups.is_empty();
                    let files_len = files.len();
                    view! {
                        <section class="panel">
                            <div class="panel__header">
                                <h2>"3. Summary and downloads"</h2>
                            </div>

                            <div class="stats-row">
                                <div class="stat-card">
                                    <span class="stat-card__label">"Total students"</span>
                                    <span class="stat-card__value">{total}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"Matched (all 3 sources)"</span>
                                    <span class="stat-card__value">{matched}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"Filtered by tags"</span>
                                    <span class="stat-card__value">{filtered}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"With Entra ID"</span>
                                    <span class="stat-card__value">{with_id}</span>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-card__label">"Files generated"</span>
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

                            {has_warnings.then(|| view! {
                                <details class="report-block">
                                    <summary>
                                        <b>"Processing log"</b>
                                        <span class="hint">" Warnings and unmatched students"</span>
                                    </summary>
                                    <div class="log-container">
                                        {warnings.into_iter().map(|w| view! {
                                            <p class="warn">"⚠ " {w}</p>
                                        }).collect_view()}
                                    </div>
                                </details>
                            })}

                            {has_year_groups.then(|| view! {
                                <details class="report-block">
                                    <summary>
                                        <b>"Year group breakdown"</b>
                                        <span class="hint">" Students per year group"</span>
                                    </summary>
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
