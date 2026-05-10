use wasm_bindgen::JsCast;

pub fn trigger_download(filename: &str, content: &str) {
    let window = web_sys::window().expect("no window");
    let document = window.document().expect("no document");

    let uint8 = js_sys::Uint8Array::from(content.as_bytes());
    let parts = js_sys::Array::new();
    parts.push(&uint8);

    let opts = web_sys::BlobPropertyBag::new();
    opts.set_type("text/csv;charset=utf-8");
    let blob = web_sys::Blob::new_with_u8_array_sequence_and_options(&parts, opts.as_ref())
        .expect("blob creation failed");
    let url = web_sys::Url::create_object_url_with_blob(&blob).expect("url creation failed");

    let a: web_sys::HtmlAnchorElement = document
        .create_element("a")
        .expect("create_element failed")
        .dyn_into()
        .expect("dyn_into HtmlAnchorElement failed");
    a.set_href(&url);
    a.set_download(filename);
    document.body().expect("no body").append_child(&a).ok();
    a.click();
    document.body().expect("no body").remove_child(&a).ok();
    web_sys::Url::revoke_object_url(&url).ok();
}

pub fn current_timestamp() -> String {
    let d = js_sys::Date::new_0();
    format!(
        "{:04}{:02}{:02}T{:02}{:02}{:02}",
        d.get_full_year(),
        d.get_month() + 1,
        d.get_date(),
        d.get_hours(),
        d.get_minutes(),
        d.get_seconds(),
    )
}
