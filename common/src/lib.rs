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

/// Header block every Entra ID bulk-import CSV starts with.
pub(crate) const ENTRA_HEADER: &str = "version:v1.0\nMember object ID or user principal name [memberObjectIdOrUpn] Required\nExample: 9832aad8-e4fe-496b-a604-95c6ef01ae75";

/// Makes a group name safe to use as a filename component.
pub(crate) fn sanitize_name(name: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return "_Unspecified".to_string();
    }
    trimmed
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
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
