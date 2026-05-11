use std::collections::{HashMap, HashSet};

use crate::types::{GeneratedFile, HouseTeamsResult, MissingMatch, ParsedData};

const ENTRA_HEADER: &str = "version:v1.0\nMember object ID or user principal name [memberObjectIdOrUpn] Required\nExample: 9832aad8-e4fe-496b-a604-95c6ef01ae75";

fn normalize(s: &str) -> String {
    s.trim().to_lowercase()
}

fn sanitize_name(name: &str) -> String {
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

pub fn process(bromcom: &ParsedData, entra: &ParsedData, timestamp: &str) -> HouseTeamsResult {
    let mail_idx = entra.col_idx("mail").expect("validated by parser");
    let id_idx = entra.col_idx("id").expect("validated by parser");

    let mut email_to_id: HashMap<String, String> = HashMap::new();
    for row in &entra.rows {
        let email = normalize(row.get(mail_idx).map(String::as_str).unwrap_or(""));
        let id = row
            .get(id_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if !email.is_empty() && !id.is_empty() {
            email_to_id.entry(email).or_insert(id);
        }
    }

    let house_idx = bromcom.col_idx("House(s)").expect("validated by parser");
    let email_idx = bromcom
        .col_idx("Student email")
        .expect("validated by parser");
    let year_idx = bromcom
        .col_idx("Year Group Name")
        .expect("validated by parser");

    // group key -> (house label, year label, set of Entra IDs)
    let mut groups: HashMap<String, (String, String, HashSet<String>)> = HashMap::new();
    let mut missing: Vec<MissingMatch> = Vec::new();
    let mut processed = 0usize;

    for row in &bromcom.rows {
        let email = normalize(row.get(email_idx).map(String::as_str).unwrap_or(""));
        if email.is_empty() {
            continue;
        }
        processed += 1;

        let house = row
            .get(house_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let year = row
            .get(year_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        match email_to_id.get(&email) {
            None => missing.push(MissingMatch {
                email,
                house,
                year,
                reason: "No Entra ID found".to_string(),
            }),
            Some(_) if house.is_empty() || year.is_empty() => {
                missing.push(MissingMatch {
                    email,
                    house,
                    year,
                    reason: "Missing house or year group".to_string(),
                });
            }
            Some(id) => {
                let key = format!("{}_{}", sanitize_name(&house), sanitize_name(&year));
                let entry = groups
                    .entry(key)
                    .or_insert_with(|| (house.clone(), year.clone(), HashSet::new()));
                entry.2.insert(id.clone());
            }
        }
    }

    let matched = processed - missing.len();
    let group_count = groups.len();

    let mut files: Vec<GeneratedFile> = groups
        .into_iter()
        .map(|(key, (_house, _year, ids))| {
            let id_list: Vec<String> = ids.into_iter().collect();
            let content = format!("{}\n{}\n", ENTRA_HEADER, id_list.join("\n"));
            GeneratedFile {
                name: format!("{}_{}.csv", key, timestamp),
                content,
                count: id_list.len(),
            }
        })
        .collect();

    files.sort_by(|a, b| a.name.cmp(&b.name));

    HouseTeamsResult {
        processed,
        matched,
        missing_count: missing.len(),
        group_count,
        files,
        missing,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parsed(headers: &[&str], rows: Vec<Vec<&str>>) -> ParsedData {
        ParsedData {
            headers: headers.iter().map(|h| h.to_string()).collect(),
            rows: rows
                .into_iter()
                .map(|row| row.into_iter().map(|value| value.to_string()).collect())
                .collect(),
        }
    }

    #[test]
    fn process_groups_matches_and_reports_missing_students() {
        let bromcom = parsed(
            &["House(s)", "Student email", "Year Group Name"],
            vec![
                vec!["Red House", "Alice@School.org ", "Year 7"],
                vec!["Blue/House", "missing@school.org", "Year 8"],
                vec!["", "blankhouse@school.org", "Year 9"],
                vec!["Green", "   ", "Year 10"],
            ],
        );
        let entra = parsed(
            &["id", "mail"],
            vec![
                vec!["ID-ALICE", "alice@school.org"],
                vec!["ID-BLANKHOUSE", "blankhouse@school.org"],
            ],
        );

        let result = process(&bromcom, &entra, "20260510");

        assert_eq!(result.processed, 3);
        assert_eq!(result.matched, 1);
        assert_eq!(result.missing_count, 2);
        assert_eq!(result.group_count, 1);

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].name, "Red_House_Year_7_20260510.csv");
        assert_eq!(result.files[0].count, 1);
        assert!(result.files[0].content.contains("ID-ALICE"));

        let unmatched = result
            .missing
            .iter()
            .find(|m| m.email == "missing@school.org")
            .expect("unmatched student should be reported");
        assert_eq!(unmatched.house, "Blue/House");
        assert_eq!(unmatched.year, "Year 8");
        assert_eq!(unmatched.reason, "No Entra ID found");

        let incomplete = result
            .missing
            .iter()
            .find(|m| m.email == "blankhouse@school.org")
            .expect("student missing house should be reported");
        assert_eq!(incomplete.house, "");
        assert_eq!(incomplete.year, "Year 9");
        assert_eq!(incomplete.reason, "Missing house or year group");
    }
}
