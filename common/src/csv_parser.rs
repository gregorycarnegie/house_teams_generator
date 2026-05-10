use crate::errors::ParseError;
use crate::types::ParsedData;

pub fn parse_csv(text: &str, required: &[&str]) -> Result<ParsedData, ParseError> {
    let text = text.trim_start_matches('\u{FEFF}');

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(text.as_bytes());

    let raw_headers = reader
        .headers()
        .map_err(|e| ParseError::CsvError(e.to_string()))?;

    let headers: Vec<String> = raw_headers.iter().map(|h| h.trim().to_string()).collect();

    if headers.is_empty() || headers.iter().all(|h| h.is_empty()) {
        return Err(ParseError::EmptyFile);
    }

    for req in required {
        if !headers.iter().any(|h| h == req) {
            return Err(ParseError::MissingColumn(req.to_string()));
        }
    }

    let rows: Vec<Vec<String>> = reader
        .records()
        .filter_map(|r| r.ok())
        .filter(|r| r.iter().any(|f| !f.trim().is_empty()))
        .map(|r| {
            let mut fields: Vec<String> = r.iter().map(|f| f.to_string()).collect();
            // Pad short rows to header length so col_idx lookups are safe
            while fields.len() < headers.len() {
                fields.push(String::new());
            }
            fields
        })
        .collect();

    Ok(ParsedData { headers, rows })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_csv_trims_headers_skips_empty_rows_and_pads_short_rows() {
        let parsed = parse_csv(
            "\u{FEFF} Name , Email , Year \nAlice,alice@example.com,7\n,,\nBob,bob@example.com\n",
            &["Name", "Email"],
        )
        .expect("CSV should parse");

        assert_eq!(
            parsed.headers,
            vec!["Name".to_string(), "Email".to_string(), "Year".to_string()]
        );
        assert_eq!(
            parsed.rows,
            vec![
                vec![
                    "Alice".to_string(),
                    "alice@example.com".to_string(),
                    "7".to_string()
                ],
                vec![
                    "Bob".to_string(),
                    "bob@example.com".to_string(),
                    String::new()
                ]
            ]
        );
    }

    #[test]
    fn parse_csv_reports_missing_required_column() {
        let err = parse_csv("Name,Email\nAlice,alice@example.com\n", &["Year"])
            .expect_err("missing required column should fail");

        match err {
            ParseError::MissingColumn(column) => assert_eq!(column, "Year"),
            other => panic!("expected MissingColumn, got {other:?}"),
        }
    }

    #[test]
    fn parse_csv_reports_empty_file_when_headers_are_blank() {
        let err = parse_csv(", ,\n", &[]).expect_err("blank headers should fail");

        assert!(matches!(err, ParseError::EmptyFile));
    }
}
