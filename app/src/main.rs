mod app;
mod components;
mod file_io;
mod pages;
mod types;

use leptos::prelude::*;

fn main() {
    mount_to_body(app::App);
}
