use leptos::prelude::*;

use crate::types::Page;

#[component]
pub fn HomePage(navigate: RwSignal<Page>) -> impl IntoView {
    let go = move |p: Page| {
        move |ev: web_sys::MouseEvent| {
            ev.prevent_default();
            navigate.set(p);
        }
    };

    view! {
        <div class="topbar">
            <div class="topbar__inner">
                <div class="logo">
                    <div class="logo__mark"></div>
                    <span>"entragen"</span>
                    <span class="mono" style="color:var(--ink-4);font-size:0.82rem;font-weight:400">"v1.2.0"</span>
                </div>
                <nav class="nav">
                    <a href="#tools">"Tools"</a>
                    <a href="#pipeline">"Pipeline"</a>
                    <a href="#privacy">"Privacy"</a>
                    <a href="https://github.com/gregorycarnegie/entragen" target="_blank">"Docs"</a>
                </nav>
                <div class="topbar__right">
                    <a href="https://github.com/gregorycarnegie/entragen" target="_blank" class="btn-sm">"GitHub ↗"</a>
                    <a href="#tools" class="btn-sm solid">"Launch →"</a>
                </div>
            </div>
        </div>

        <div class="wrap">
            <section class="hero">
                <div class="badge">
                    <span class="badge__pill">"NEW"</span>
                    " XLSX support for class lists "
                    <span class="badge__sep">"→"</span>
                </div>
                <h1>
                    "Distribution groups for Entra ID,"
                    <br/>
                    "without the spreadsheet pain."
                </h1>
                <p>"A WebAssembly toolkit that turns Bromcom student exports into Microsoft Entra ID bulk-import CSVs. All processing happens in your browser — files never touch a server."</p>
                <div class="hero-cta">
                    <a href="#tools" class="btn btn-primary">
                        "Get started"
                        <span class="mono-key">"↵"</span>
                    </a>
                    <a href="#pipeline" class="btn btn-secondary">
                        "See pipeline"
                    </a>
                </div>

                <div class="terminal">
                    <div class="terminal__bar">
                        <span class="term-dot" style="background:var(--rose)"></span>
                        <span class="term-dot" style="background:var(--amber)"></span>
                        <span class="term-dot" style="background:var(--green)"></span>
                        <span class="terminal__title">"~/exports ▸ entragen house-teams"</span>
                    </div>
                    <div class="terminal__body">
                        <span class="term-line">
                            <span class="term-prompt">"$"</span>
                            " "
                            <span class="term-cmd">"entragen house-teams --bromcom students.csv --entra entra.csv"</span>
                        </span>
                        <span class="term-line">
                            <span class="term-mute">"› reading bromcom export ……………"</span>
                            " "
                            <span class="term-ok">"✓"</span>
                            " "
                            <span class="term-mute">"1,247 students"</span>
                        </span>
                        <span class="term-line">
                            <span class="term-mute">"› reading entra directory ………"</span>
                            " "
                            <span class="term-ok">"✓"</span>
                            " "
                            <span class="term-mute">"1,251 accounts"</span>
                        </span>
                        <span class="term-line">
                            <span class="term-mute">"› matching by email …………………"</span>
                            " "
                            <span class="term-ok">"✓"</span>
                            " "
                            <span class="term-mute">"1,240 matched"</span>
                            " "
                            <span class="term-warn">"7 unmatched"</span>
                        </span>
                        <span class="term-line">
                            <span class="term-mute">"› building house × year groups"</span>
                            " "
                            <span class="term-ok">"✓"</span>
                            " "
                            <span class="term-info">"32 csv files"</span>
                        </span>
                        <span class="term-line">
                            <span class="term-ok">"✓"</span>
                            " done in "
                            <span class="term-info">"142ms"</span>
                            <span class="term-cursor"></span>
                        </span>
                    </div>
                </div>
            </section>

            <section id="tools">
                <header class="section__head">
                    <span class="section__tag">"01 ⌁ tools"</span>
                    <h2 class="section__title">"Pick the generator that matches your workflow."</h2>
                </header>

                <div class="tools">
                    <a href="#" class="tool" on:click=go(Page::HouseTeams)>
                        <div class="tool__top">
                            <span class="tool__num">"// 01"</span>
                            <span class="tool__inputs">
                                <span class="pip"></span>
                                "2 input files"
                            </span>
                        </div>
                        <h3>"House & Year Teams"</h3>
                        <p>"Match Bromcom students against your Entra ID directory and emit one CSV per house × year combination."</p>
                        <pre class="tool__schema">{r#"{
  "inputs": [
    "bromcom.csv",
    "entra.csv"
  ],
  "required": [
    "House(s)",
    "Student email",
    "Year Group Name"
  ],
  "output": "csv-pack/"
}"#}</pre>
                        <span class="tool__cta">
                            "Open tool "
                            <span class="mono">"→"</span>
                        </span>
                    </a>

                    <a href="#" class="tool" on:click=go(Page::ClassDistribution)>
                        <div class="tool__top">
                            <span class="tool__num">"// 02"</span>
                            <span class="tool__inputs">
                                <span class="pip"></span>
                                "3 input files"
                            </span>
                        </div>
                        <h3>"Class Distribution Groups"</h3>
                        <p>"Filter by class tags (MA, EN, SC…) and optionally split by year group. Three-source pipeline with class-list XLSX."</p>
                        <pre class="tool__schema">{r#"{
  "inputs": [
    "student-emails.xlsx",
    "class-list.xlsx",
    "entra.csv"
  ],
  "filter": "[MA, EN, SC]",
  "split_by_year": true
}"#}</pre>
                        <span class="tool__cta">
                            "Open tool "
                            <span class="mono">"→"</span>
                        </span>
                    </a>
                </div>
            </section>

            <section id="pipeline">
                <header class="section__head">
                    <span class="section__tag">"02 ⌁ pipeline"</span>
                    <h2 class="section__title">"Drop files in. Walk away with a CSV pack."</h2>
                </header>
                <div class="pipeline">
                    <div class="step">
                        <div class="step__num">"01"</div>
                        <h4>"Upload"</h4>
                        <p>"Drag in Bromcom & Entra ID exports. Stays in your browser."</p>
                    </div>
                    <div class="step">
                        <div class="step__num">"02"</div>
                        <h4>"Match"</h4>
                        <p>"WASM matches students to directory accounts by email."</p>
                    </div>
                    <div class="step">
                        <div class="step__num">"03"</div>
                        <h4>"Group"</h4>
                        <p>"Split records by house, year, class — or all three."</p>
                    </div>
                    <div class="step">
                        <div class="step__num">"04"</div>
                        <h4>"Download"</h4>
                        <p>"Get a bulk-import CSV pack ready for Entra ID."</p>
                    </div>
                </div>
            </section>

            <section id="privacy">
                <header class="section__head">
                    <span class="section__tag">"03 ⌁ guarantees"</span>
                    <h2 class="section__title">"No servers. No telemetry. No surprises."</h2>
                </header>
                <div class="quality">
                    <div class="quality__cell">
                        <div class="quality__num">"0"</div>
                        <div class="quality__lbl">"Bytes uploaded"</div>
                        <div class="quality__det">"Files stay in the page"</div>
                    </div>
                    <div class="quality__cell">
                        <div class="quality__num">"100%"</div>
                        <div class="quality__lbl">"Open source"</div>
                        <div class="quality__det">"MIT licensed, audit-friendly"</div>
                    </div>
                    <div class="quality__cell">
                        <div class="quality__num">"~50ms"</div>
                        <div class="quality__lbl">"Parse latency"</div>
                        <div class="quality__det">"Typical 1k-student export"</div>
                    </div>
                    <div class="quality__cell">
                        <div class="quality__num">"∞"</div>
                        <div class="quality__lbl">"Offline runs"</div>
                        <div class="quality__det">"Cache once, use forever"</div>
                    </div>
                </div>
            </section>

            <footer>
                <div>"© 2026 · Gregory Carnegie · MIT"</div>
                <div class="mono-tags">
                    <span class="mono-tag">"rust"</span>
                    <span class="mono-tag">"leptos"</span>
                    <span class="mono-tag">"webassembly"</span>
                    <span class="mono-tag">"github-pages"</span>
                </div>
            </footer>
        </div>
    }
}
