use leptos::prelude::*;

use crate::pages::{class_distribution::ClassDistributionPage, home::HomePage, house_teams::HouseTeamsPage};
use crate::types::Page;

#[component]
pub fn App() -> impl IntoView {
    let page = RwSignal::new(Page::Home);

    view! {
        {move || match page.get() {
            Page::Home => view! { <HomePage navigate=page /> }.into_any(),
            Page::HouseTeams => view! { <HouseTeamsPage navigate=page /> }.into_any(),
            Page::ClassDistribution => view! { <ClassDistributionPage navigate=page /> }.into_any(),
        }}
    }
}
