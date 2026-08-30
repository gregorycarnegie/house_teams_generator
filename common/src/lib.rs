pub mod class_distribution;
mod csv_parser;
pub mod errors;
pub mod house_teams;
mod spreadsheet;
pub mod types;

use errors::ParseError;
use types::ParsedData;

/// File extensions the pickers advertise. Anything else is still sniffed by
/// content, so a mislabelled file works too.
pub const ACCEPTED_EXTENSIONS: &str = ".csv,.xlsx,.xlsb,.ods";

/// Parses a dropped file, whatever the user gave us.
///
/// Dispatch is on content, not on the filename: names get mangled, and a file
/// dragged out of another app may not have one.
pub fn parse_any(bytes: &[u8], required: &[&str]) -> Result<ParsedData, ParseError> {
    if bytes.starts_with(&[0xD0, 0xCF, 0x11, 0xE0]) {
        // Compound File Binary: a pre-2007 .xls. Readable, but the format is
        // long superseded and carries the legacy macro attack surface, so we
        // ask for a re-save rather than opening it.
        return Err(ParseError::InvalidFormat(
            "legacy .xls workbooks are not supported - open the file and save it as .xlsx or .ods"
                .to_string(),
        ));
    }
    if bytes.starts_with(b"PK\x03\x04") {
        return spreadsheet::parse_workbook(bytes, required);
    }
    csv_parser::parse_csv(&String::from_utf8_lossy(bytes), required)
}

/// Shared by both parsers: headers must exist and cover the required columns.
pub(crate) fn validate_headers(headers: &[String], required: &[&str]) -> Result<(), ParseError> {
    if headers.is_empty() || headers.iter().all(|h| h.is_empty()) {
        return Err(ParseError::EmptyFile);
    }
    for req in required {
        if !headers.iter().any(|h| h == req) {
            return Err(ParseError::MissingColumn(req.to_string()));
        }
    }
    Ok(())
}
