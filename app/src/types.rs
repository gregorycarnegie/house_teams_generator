#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct FileData {
    pub name: String,
    pub bytes: Vec<u8>,
}

#[derive(Clone, Copy, PartialEq)]
pub enum Page {
    Home,
    HouseTeams,
    ClassDistribution,
}
