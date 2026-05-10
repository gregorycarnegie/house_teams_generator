use calamine::{Reader, Xlsx, XlsxError, open_workbook_from_rs};
use std::io::Cursor;

use crate::errors::ParseError;
use crate::types::ParsedData;

pub fn parse_xlsx(bytes: &[u8], required: &[&str]) -> Result<ParsedData, ParseError> {
    let cursor = Cursor::new(bytes);
    let mut workbook: Xlsx<_> = open_workbook_from_rs(cursor)
        .map_err(|e: XlsxError| ParseError::InvalidFormat(e.to_string()))?;

    let sheet_names: Vec<String> = workbook.sheet_names().to_owned();
    let first = sheet_names.first().ok_or(ParseError::EmptyFile)?.clone();

    let range = workbook
        .worksheet_range(&first)
        .map_err(|e: XlsxError| ParseError::InvalidFormat(e.to_string()))?;

    let mut row_iter = range.rows();

    let header_row = row_iter.next().ok_or(ParseError::EmptyFile)?;
    let headers: Vec<String> = header_row
        .iter()
        .map(|c| c.to_string().trim().to_string())
        .collect();

    if headers.is_empty() || headers.iter().all(|h| h.is_empty()) {
        return Err(ParseError::EmptyFile);
    }

    for req in required {
        if !headers.iter().any(|h| h == req) {
            return Err(ParseError::MissingColumn(req.to_string()));
        }
    }

    let rows: Vec<Vec<String>> = row_iter
        .filter(|row| row.iter().any(|c| !c.to_string().trim().is_empty()))
        .map(|row| {
            let mut fields: Vec<String> = row.iter().map(|c| c.to_string()).collect();
            while fields.len() < headers.len() {
                fields.push(String::new());
            }
            fields
        })
        .collect();

    Ok(ParsedData { headers, rows })
}
