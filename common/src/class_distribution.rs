use std::collections::{HashMap, HashSet};

use crate::errors::ProcessError;
use crate::types::{ClassDistResult, GeneratedFile, ParsedData, YearGroupStat};

const ENTRA_HEADER: &str = "version:v1.0\nMember object ID or user principal name [memberObjectIdOrUpn] Required\nExample: 9832aad8-e4fe-496b-a604-95c6eF01ae75";

fn sanitize(name: &str) -> String {
    let t = name.trim();
    if t.is_empty() {
        return "Unspecified".to_string();
    }
    t.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

pub fn parse_tags(input: &str) -> Vec<String> {
    let seen: HashSet<String> = input
        .split(|c: char| c == ',' || c == '\n' || c.is_whitespace())
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();
    let mut tags: Vec<String> = seen.into_iter().collect();
    tags.sort();
    tags
}

struct StudentRecord {
    year_group: String,
    class_list: String,
    entra_id: String,
}

pub fn process(
    emails: &ParsedData,
    class_list: &ParsedData,
    entra: &ParsedData,
    tags: &[String],
    yeargroup_mode: bool,
    timestamp: &str,
) -> Result<ClassDistResult, ProcessError> {
    if tags.is_empty() {
        return Err(ProcessError::NoTags);
    }

    // Build email -> Entra ID
    let mail_idx = entra.col_idx("mail").unwrap_or(0);
    let id_idx = entra.col_idx("id").unwrap_or(1);
    let mut entra_lookup: HashMap<String, String> = HashMap::new();
    for row in &entra.rows {
        let mail = row
            .get(mail_idx)
            .map(|s| s.trim().to_lowercase())
            .unwrap_or_default();
        let id = row
            .get(id_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if !mail.is_empty() && !id.is_empty() {
            entra_lookup.entry(mail).or_insert(id);
        }
    }

    // Build admission number -> (email_lower, year, first, last)
    let adm_idx = emails.col_idx("Admission Number").unwrap_or(0);
    let email_idx = emails.col_idx("Student email").unwrap_or(1);
    let year_idx = emails.col_idx("Year Group Name").unwrap_or(2);
    let mut student_lookup: HashMap<String, (String, String)> = HashMap::new(); // adm -> (email_lower, year)
    for row in &emails.rows {
        let adm = row
            .get(adm_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let email = row
            .get(email_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let year = row
            .get(year_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if !adm.is_empty() && !email.is_empty() {
            student_lookup
                .entry(adm)
                .or_insert((email.to_lowercase(), year));
        }
    }

    // Process class list
    let cl_adm_idx = class_list.col_idx("AdmissionNo").unwrap_or(0);
    let cl_list_idx = class_list.col_idx("StudentClassList").unwrap_or(1);
    let cl_year_idx = class_list.col_idx("StudentYearGroup").unwrap_or(2);
    let cl_name_idx = class_list.col_idx("StudentFullName").unwrap_or(3);

    let mut warnings: Vec<String> = Vec::new();
    let mut students: Vec<StudentRecord> = Vec::new();

    let tags_lower: Vec<String> = tags.iter().map(|t| t.to_lowercase()).collect();

    for row in &class_list.rows {
        let adm = row
            .get(cl_adm_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if adm.is_empty() {
            continue;
        }
        let class_str = row
            .get(cl_list_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let year = row
            .get(cl_year_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let name = row
            .get(cl_name_idx)
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        let Some((email_lower, student_year)) = student_lookup.get(&adm) else {
            warnings.push(format!(
                "AdmissionNo {adm} ({name}) in class list but not in emails file"
            ));
            continue;
        };

        let Some(entra_id) = entra_lookup.get(email_lower) else {
            warnings.push(format!("No Entra ID for {email_lower} ({name})"));
            continue;
        };

        let resolved_year = if student_year.is_empty() {
            year.clone()
        } else {
            student_year.clone()
        };

        students.push(StudentRecord {
            year_group: resolved_year,
            class_list: class_str,
            entra_id: entra_id.clone(),
        });
    }

    let total = student_lookup.len();
    let matched = students.len();

    // Filter by tags
    let filtered_students: Vec<&StudentRecord> = students
        .iter()
        .filter(|s| {
            let cl_lower = s.class_list.to_lowercase();
            tags_lower.iter().any(|t| cl_lower.contains(t.as_str()))
        })
        .collect();

    let filtered = filtered_students.len();
    let with_id = filtered;

    // Deduplicate by email_lower within each group
    let tag_token: String = tags
        .iter()
        .take(3)
        .map(|t| t.as_str())
        .collect::<Vec<_>>()
        .join("_");
    let tag_token = &tag_token[..tag_token.len().min(20)];

    let files: Vec<GeneratedFile> = if yeargroup_mode {
        let mut year_map: HashMap<String, HashSet<String>> = HashMap::new();
        for s in &filtered_students {
            let year = if s.year_group.is_empty() {
                "Unspecified".to_string()
            } else {
                s.year_group.clone()
            };
            year_map.entry(year).or_default().insert(s.entra_id.clone());
        }
        let mut entries: Vec<(String, HashSet<String>)> = year_map.into_iter().collect();
        entries.sort_by(|a, b| a.0.cmp(&b.0));
        entries
            .into_iter()
            .map(|(year, ids)| {
                let id_vec: Vec<String> = ids.into_iter().collect();
                let content = format!("{}\n{}\n", ENTRA_HEADER, id_vec.join("\n"));
                GeneratedFile {
                    name: format!(
                        "distribution_group_{}_{}_{}.csv",
                        sanitize(&year),
                        tag_token,
                        timestamp
                    ),
                    content,
                    count: id_vec.len(),
                }
            })
            .collect()
    } else {
        let all_ids: HashSet<String> = filtered_students
            .iter()
            .map(|s| s.entra_id.clone())
            .collect();
        let id_vec: Vec<String> = all_ids.into_iter().collect();
        let content = format!("{}\n{}\n", ENTRA_HEADER, id_vec.join("\n"));
        vec![GeneratedFile {
            name: format!("distribution_group_all_{}_{}.csv", tag_token, timestamp),
            content,
            count: id_vec.len(),
        }]
    };

    // Year group stats (across all filtered students)
    let mut year_counts: HashMap<String, usize> = HashMap::new();
    for s in &filtered_students {
        let year = if s.year_group.is_empty() {
            "Unspecified".to_string()
        } else {
            s.year_group.clone()
        };
        *year_counts.entry(year).or_default() += 1;
    }
    let mut year_groups: Vec<YearGroupStat> = year_counts
        .into_iter()
        .map(|(year, count)| YearGroupStat { year, count })
        .collect();
    year_groups.sort_by(|a, b| a.year.cmp(&b.year));

    Ok(ClassDistResult {
        total,
        matched,
        filtered,
        with_id,
        files,
        year_groups,
        warnings,
    })
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

    fn emails_data() -> ParsedData {
        parsed(
            &["Admission Number", "Student email", "Year Group Name"],
            vec![
                vec!["A1", "Alice@school.org", "Year 7"],
                vec!["A2", "bob@school.org", "Year 8"],
                vec!["A3", "charlie@school.org", "Year 8"],
            ],
        )
    }

    fn class_list_data() -> ParsedData {
        parsed(
            &[
                "AdmissionNo",
                "StudentClassList",
                "StudentYearGroup",
                "StudentFullName",
            ],
            vec![
                vec!["A1", "7MA Biology", "Y7", "Alice A"],
                vec!["A2", "8EN English", "Y8", "Bob B"],
                vec!["A3", "8MA Maths", "Y8", "Charlie C"],
                vec!["A4", "7MA Biology", "Y7", "Dana D"],
            ],
        )
    }

    fn entra_data() -> ParsedData {
        parsed(
            &["id", "mail"],
            vec![
                vec!["ID-ALICE", "alice@school.org"],
                vec!["ID-BOB", "bob@school.org"],
            ],
        )
    }

    #[test]
    fn parse_tags_splits_deduplicates_and_sorts_tokens() {
        assert_eq!(
            parse_tags(" 7MA,8SC\n7MA\tScience "),
            vec!["7MA".to_string(), "8SC".to_string(), "Science".to_string()]
        );
    }

    #[test]
    fn process_requires_at_least_one_tag() {
        let err = process(
            &emails_data(),
            &class_list_data(),
            &entra_data(),
            &[],
            false,
            "20260510",
        )
        .expect_err("empty tags should fail");

        assert!(matches!(err, ProcessError::NoTags));
    }

    #[test]
    fn process_filters_by_tag_and_generates_combined_file() {
        let result = process(
            &emails_data(),
            &class_list_data(),
            &entra_data(),
            &["MA".to_string()],
            false,
            "20260510",
        )
        .expect("class distribution should process");

        assert_eq!(result.total, 3);
        assert_eq!(result.matched, 2);
        assert_eq!(result.filtered, 1);
        assert_eq!(result.with_id, 1);
        assert_eq!(result.warnings.len(), 2);
        assert!(
            result
                .warnings
                .iter()
                .any(|w| w.contains("No Entra ID for charlie@school.org"))
        );
        assert!(result.warnings.iter().any(|w| w.contains("AdmissionNo A4")));

        assert_eq!(result.files.len(), 1);
        assert_eq!(
            result.files[0].name,
            "distribution_group_all_MA_20260510.csv"
        );
        assert_eq!(result.files[0].count, 1);
        assert!(result.files[0].content.contains("ID-ALICE"));
        assert!(!result.files[0].content.contains("ID-BOB"));

        assert_eq!(result.year_groups.len(), 1);
        assert_eq!(result.year_groups[0].year, "Year 7");
        assert_eq!(result.year_groups[0].count, 1);
    }

    #[test]
    fn process_can_split_filtered_students_by_year_group() {
        let result = process(
            &emails_data(),
            &class_list_data(),
            &entra_data(),
            &["EN".to_string(), "MA".to_string()],
            true,
            "20260510",
        )
        .expect("class distribution should process");

        assert_eq!(result.filtered, 2);
        assert_eq!(result.files.len(), 2);
        assert_eq!(
            result
                .files
                .iter()
                .map(|f| f.name.as_str())
                .collect::<Vec<_>>(),
            vec![
                "distribution_group_Year_7_EN_MA_20260510.csv",
                "distribution_group_Year_8_EN_MA_20260510.csv"
            ]
        );
        assert!(result.files[0].content.contains("ID-ALICE"));
        assert!(result.files[1].content.contains("ID-BOB"));
        assert_eq!(
            result
                .year_groups
                .iter()
                .map(|stat| (stat.year.as_str(), stat.count))
                .collect::<Vec<_>>(),
            vec![("Year 7", 1), ("Year 8", 1)]
        );
    }
}
