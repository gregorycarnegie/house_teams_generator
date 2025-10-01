import { DataMatchingError } from '../../../shared/src/core/errors.js';
import type { ParsedSpreadsheetData, StudentRecord } from '../../../types/index.js';
import type { Logger } from '../../../shared/src/utils/Logger.js';

interface StudentLookupData {
  admissionNumber: string;
  email: string;
  emailLower: string;
  yearGroup: string;
  firstName: string;
  lastName: string;
}

/**
 * Handles matching and merging of student data from multiple sources
 */
export class DataMatcher {
  private emailsData: ParsedSpreadsheetData;
  private classData: ParsedSpreadsheetData;
  private entraData: ParsedSpreadsheetData;
  private logger: Logger | null;

  constructor(
    emailsData: ParsedSpreadsheetData,
    classData: ParsedSpreadsheetData,
    entraData: ParsedSpreadsheetData,
    logger: Logger | null = null
  ) {
    this.emailsData = emailsData;
    this.classData = classData;
    this.entraData = entraData;
    this.logger = logger;
  }

  /**
   * Build a lookup map of Entra IDs by email
   */
  buildEntraLookup(): Map<string, string> {
    this.log('info', 'Building Entra ID lookup...');

    const entraLookup = new Map<string, string>();
    const mailIdx = this.entraData.headerIndex.get('mail')!;
    const idIdx = this.entraData.headerIndex.get('id')!;

    for (const row of this.entraData.rows) {
      const mail = (row[mailIdx] || '').trim().toLowerCase();
      const id = (row[idIdx] || '').trim();

      if (mail && id && !entraLookup.has(mail)) {
        entraLookup.set(mail, id);
      }
    }

    this.log('info', `Loaded ${entraLookup.size} Entra IDs`);
    return entraLookup;
  }

  /**
   * Build a lookup map of student data by admission number
   */
  buildStudentLookup(): Map<string, StudentLookupData> {
    this.log('info', 'Building student emails lookup...');

    const studentsLookup = new Map<string, StudentLookupData>();
    const admIdx = this.emailsData.headerIndex.get('Admission Number')!;
    const emailIdx = this.emailsData.headerIndex.get('Student email')!;
    const yearIdx = this.emailsData.headerIndex.get('Year Group Name')!;
    const firstIdx = this.emailsData.headerIndex.get('Preferred First name');
    const lastIdx = this.emailsData.headerIndex.get('Preferred Last name');

    for (const row of this.emailsData.rows) {
      const admNo = (row[admIdx] || '').toString().trim();
      const email = (row[emailIdx] || '').trim();
      const year = (row[yearIdx] || '').trim();
      const firstName = firstIdx !== undefined ? (row[firstIdx] || '').trim() : '';
      const lastName = lastIdx !== undefined ? (row[lastIdx] || '').trim() : '';

      if (admNo && email) {
        if (!studentsLookup.has(admNo)) {
          studentsLookup.set(admNo, {
            admissionNumber: admNo,
            email: email,
            emailLower: email.toLowerCase(),
            yearGroup: year,
            firstName: firstName,
            lastName: lastName
          });
        }
      }
    }

    this.log('info', `Loaded ${studentsLookup.size} students from emails file`);
    return studentsLookup;
  }

  /**
   * Match students from all three data sources
   */
  matchStudents(): { students: StudentRecord[]; warnings: Set<string> } {
    this.log('info', 'Processing class lists and matching data...');

    const entraLookup = this.buildEntraLookup();
    const studentsLookup = this.buildStudentLookup();

    const canonicalStudents: StudentRecord[] = [];
    const warnings = new Set<string>();

    const classAdmIdx = this.classData.headerIndex.get('AdmissionNo')!;
    const classListIdx = this.classData.headerIndex.get('StudentClassList')!;
    const classYearIdx = this.classData.headerIndex.get('StudentYearGroup')!;
    const classNameIdx = this.classData.headerIndex.get('StudentFullName')!;

    for (const row of this.classData.rows) {
      const admNo = (row[classAdmIdx] || '').toString().trim();
      const classList = (row[classListIdx] || '').trim();
      const yearGroup = (row[classYearIdx] || '').trim();
      const fullName = (row[classNameIdx] || '').trim();

      if (!admNo) continue;

      const student = studentsLookup.get(admNo);
      if (!student) {
        warnings.add(`AdmissionNo ${admNo} (${fullName}) in class list but not in emails file`);
        continue;
      }

      // Verify year groups match
      if (yearGroup && student.yearGroup && yearGroup !== student.yearGroup) {
        this.log('warning', `Year group mismatch for ${admNo}: "${yearGroup}" (class list) vs "${student.yearGroup}" (emails)`);
      }

      // Get Entra ID
      const entraId = entraLookup.get(student.emailLower);
      if (!entraId) {
        warnings.add(`No Entra ID for ${student.email} (${fullName})`);
        continue;
      }

      // Add to canonical list
      canonicalStudents.push({
        admissionNumber: admNo,
        email: student.email,
        yearGroup: student.yearGroup || yearGroup,
        classList: classList,
        id: entraId,
        fullName: fullName
      });
    }

    // Log warnings
    for (const warning of warnings) {
      this.log('warning', warning);
    }

    this.log('success', `Built canonical dataset with ${canonicalStudents.length} students`);

    return { students: canonicalStudents, warnings };
  }

  /**
   * Filter students by class tags
   */
  filterByClassTags(students: StudentRecord[], tags: string[]): StudentRecord[] {
    if (tags.length === 0) {
      throw new DataMatchingError('No class tags specified');
    }

    this.log('info', `Filtering by tags: ${tags.join(', ')}`);

    const filtered = students.filter(student =>
      this.matchesClassTags(student.classList, tags)
    );

    this.log('info', `Filtered to ${filtered.length} students with matching tags`);

    return filtered;
  }

  /**
   * Check if a class list contains any of the specified tags
   */
  matchesClassTags(classList: string, tags: string[]): boolean {
    if (!classList || !tags.length) return false;

    const classListLower = classList.toLowerCase();
    return tags.some(tag => classListLower.includes(tag.toLowerCase()));
  }

  /**
   * Parse class tags from input string
   */
  static parseClassTags(input: string): string[] {
    if (!input || !input.trim()) return [];

    // Split by whitespace, commas, and newlines
    const tags = input.split(/[\s,\n]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Group students by year group
   */
  groupByYearGroup(students: StudentRecord[]): Map<string, Set<string>> {
    const yearGroups = new Map<string, Set<string>>();

    for (const student of students) {
      const year = student.yearGroup || 'Unspecified';
      if (!yearGroups.has(year)) {
        yearGroups.set(year, new Set<string>());
      }
      yearGroups.get(year)!.add(student.id);
    }

    return yearGroups;
  }

  /**
   * Get year group statistics
   */
  getYearGroupStats(students: StudentRecord[]): Map<string, number> {
    const stats = new Map<string, number>();

    for (const student of students) {
      const year = student.yearGroup || 'Unspecified';
      stats.set(year, (stats.get(year) || 0) + 1);
    }

    return stats;
  }

  /**
   * Log a message
   */
  private log(level: string, message: string): void {
    if (this.logger && typeof (this.logger as any)[level] === 'function') {
      (this.logger as any)[level](message);
    }
  }
}
