import { describe, it, expect, beforeEach } from 'vitest';
import { DataMatcher } from '../../class-distribution/src/core/DataMatcher';
import type { ParsedSpreadsheetData } from '../../types';

describe('DataMatcher', () => {
  let emailsData: ParsedSpreadsheetData;
  let classData: ParsedSpreadsheetData;
  let entraData: ParsedSpreadsheetData;

  beforeEach(() => {
    emailsData = {
      headers: ['Admission Number', 'Student email', 'Year Group Name'],
      rows: [
        ['12345', 'john@school.com', 'Year 10'],
        ['12346', 'jane@school.com', 'Year 11'],
        ['12347', 'bob@school.com', 'Year 10'],
      ],
      headerIndex: new Map([
        ['Admission Number', 0],
        ['Student email', 1],
        ['Year Group Name', 2],
      ]),
    };

    classData = {
      headers: ['AdmissionNo', 'StudentFullName', 'StudentYearGroup', 'StudentClassList'],
      rows: [
        ['12345', 'John Doe', 'Year 10', 'MAT, ENG, SCI'],
        ['12346', 'Jane Smith', 'Year 11', 'MAT, ENG, FRE'],
        ['12347', 'Bob Johnson', 'Year 10', 'ENG, SCI, HIS'],
      ],
      headerIndex: new Map([
        ['AdmissionNo', 0],
        ['StudentFullName', 1],
        ['StudentYearGroup', 2],
        ['StudentClassList', 3],
      ]),
    };

    entraData = {
      headers: ['mail', 'id'],
      rows: [
        ['john@school.com', 'id-001'],
        ['jane@school.com', 'id-002'],
        ['bob@school.com', 'id-003'],
      ],
      headerIndex: new Map([
        ['mail', 0],
        ['id', 1],
      ]),
    };
  });

  describe('buildEntraLookup', () => {
    it('should build a lookup map of email to ID', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const lookup = matcher.buildEntraLookup();

      expect(lookup.size).toBe(3);
      expect(lookup.get('john@school.com')).toBe('id-001');
      expect(lookup.get('jane@school.com')).toBe('id-002');
      expect(lookup.get('bob@school.com')).toBe('id-003');
    });

    it('should handle case-insensitive emails', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const lookup = matcher.buildEntraLookup();

      expect(lookup.get('JOHN@school.com'.toLowerCase())).toBe('id-001');
    });
  });

  describe('buildStudentLookup', () => {
    it('should build a lookup map of admission number to student data', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const lookup = matcher.buildStudentLookup();

      expect(lookup.size).toBe(3);
      expect(lookup.get('12345')).toMatchObject({
        admissionNumber: '12345',
        email: 'john@school.com',
        yearGroup: 'Year 10',
      });
    });
  });

  describe('matchStudents', () => {
    it('should match students from all three data sources', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const { students, warnings } = matcher.matchStudents();

      expect(students).toHaveLength(3);
      expect(students[0]).toMatchObject({
        admissionNumber: '12345',
        email: 'john@school.com',
        yearGroup: 'Year 10',
        classList: 'MAT, ENG, SCI',
        id: 'id-001',
        fullName: 'John Doe',
      });
    });

    it('should generate warnings for missing Entra IDs', () => {
      const entraDataMissing = {
        headers: ['mail', 'id'],
        rows: [
          ['john@school.com', 'id-001'],
          // Missing jane and bob
        ],
        headerIndex: new Map([
          ['mail', 0],
          ['id', 1],
        ]),
      };

      const matcher = new DataMatcher(emailsData, classData, entraDataMissing);
      const { students, warnings } = matcher.matchStudents();

      expect(students).toHaveLength(1);
      expect(warnings.size).toBeGreaterThan(0);
    });
  });

  describe('parseClassTags', () => {
    it('should parse comma-separated tags', () => {
      const tags = DataMatcher.parseClassTags('MAT, ENG, SCI');
      expect(tags).toEqual(['MAT', 'ENG', 'SCI']);
    });

    it('should parse space-separated tags', () => {
      const tags = DataMatcher.parseClassTags('MAT ENG SCI');
      expect(tags).toEqual(['MAT', 'ENG', 'SCI']);
    });

    it('should parse newline-separated tags', () => {
      const tags = DataMatcher.parseClassTags('MAT\nENG\nSCI');
      expect(tags).toEqual(['MAT', 'ENG', 'SCI']);
    });

    it('should remove duplicates', () => {
      const tags = DataMatcher.parseClassTags('MAT, MAT, ENG');
      expect(tags).toEqual(['MAT', 'ENG']);
    });

    it('should handle empty input', () => {
      const tags = DataMatcher.parseClassTags('');
      expect(tags).toEqual([]);
    });
  });

  describe('filterByClassTags', () => {
    it('should filter students by class tags', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const { students } = matcher.matchStudents();

      const filtered = matcher.filterByClassTags(students, ['MAT']);
      expect(filtered).toHaveLength(2); // John and Jane have MAT
    });

    it('should filter with multiple tags (OR logic)', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const { students } = matcher.matchStudents();

      const filtered = matcher.filterByClassTags(students, ['HIS', 'FRE']);
      expect(filtered).toHaveLength(2); // Bob has HIS, Jane has FRE
    });

    it('should be case-insensitive', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const { students } = matcher.matchStudents();

      const filtered = matcher.filterByClassTags(students, ['mat']);
      expect(filtered).toHaveLength(2); // Should match MAT
    });
  });

  describe('groupByYearGroup', () => {
    it('should group students by year group', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const { students } = matcher.matchStudents();

      const grouped = matcher.groupByYearGroup(students);

      expect(grouped.size).toBe(2);
      expect(grouped.get('Year 10')?.size).toBe(2);
      expect(grouped.get('Year 11')?.size).toBe(1);
    });
  });

  describe('getYearGroupStats', () => {
    it('should return statistics per year group', () => {
      const matcher = new DataMatcher(emailsData, classData, entraData);
      const { students } = matcher.matchStudents();

      const stats = matcher.getYearGroupStats(students);

      expect(stats.get('Year 10')).toBe(2);
      expect(stats.get('Year 11')).toBe(1);
    });
  });
});
