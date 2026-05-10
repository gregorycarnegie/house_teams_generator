#[derive(Clone, Debug)]
pub struct FileData {
    pub bytes: Vec<u8>,
}

#[derive(Clone, Copy, PartialEq)]
pub enum Page {
    Home,
    HouseTeams,
    ClassDistribution,
}
