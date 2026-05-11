#[derive(Debug, Clone)]
pub struct ParsedData {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

impl ParsedData {
    pub fn col_idx(&self, name: &str) -> Option<usize> {
        self.headers.iter().position(|h| h == name)
    }

    pub fn get(&self, row: &[String], name: &str) -> String {
        self.col_idx(name)
            .and_then(|i| row.get(i))
            .cloned()
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parsed_data_finds_columns_and_returns_default_for_missing_values() {
        let data = ParsedData {
            headers: vec!["Name".to_string(), "Email".to_string()],
            rows: vec![vec!["Ada".to_string(), "ada@example.com".to_string()]],
        };

        assert_eq!(data.col_idx("Email"), Some(1));
        assert_eq!(data.col_idx("House"), None);
        assert_eq!(data.get(&data.rows[0], "Name"), "Ada");
        assert_eq!(data.get(&data.rows[0], "House"), "");
        assert_eq!(data.get(&["Only name".to_string()], "Email"), "");
    }
}

#[derive(Debug, Clone)]
pub struct GeneratedFile {
    pub name: String,
    pub content: String,
    pub count: usize,
}

#[derive(Debug, Clone)]
pub struct MissingMatch {
    pub email: String,
    pub house: String,
    pub year: String,
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct HouseTeamsResult {
    pub processed: usize,
    pub matched: usize,
    pub missing_count: usize,
    pub group_count: usize,
    pub files: Vec<GeneratedFile>,
    pub missing: Vec<MissingMatch>,
}

#[derive(Debug, Clone)]
pub struct YearGroupStat {
    pub year: String,
    pub count: usize,
}

#[derive(Debug, Clone)]
pub struct ClassDistResult {
    pub total: usize,
    pub matched: usize,
    pub filtered: usize,
    pub files: Vec<GeneratedFile>,
    pub year_groups: Vec<YearGroupStat>,
    pub warnings: Vec<String>,
}
