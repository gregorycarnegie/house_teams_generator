use thiserror::Error;

#[derive(Debug, Error, Clone)]
pub enum ParseError {
    #[error("File is empty or has no valid data")]
    EmptyFile,
    #[error("Missing required column: \"{0}\"")]
    MissingColumn(String),
    #[error("Invalid file format: {0}")]
    InvalidFormat(String),
    #[error("CSV parse error: {0}")]
    CsvError(String),
}

#[derive(Debug, Error, Clone)]
pub enum ProcessError {
    #[error("No class tags specified")]
    NoTags,
    #[error("Parse error: {0}")]
    Parse(#[from] ParseError),
}
