import { describe, it, expect } from 'vitest';
import {
  validateParsedSpreadsheetData,
  validateStudentRecord,
  validateProcessFiles,
  validateProcessOptions,
  validateProcessingResult,
} from '../../shared/src/validation/schemas-browser';

describe('schemas-browser', () => {
  describe('validateParsedSpreadsheetData', () => {
    it('should validate correct spreadsheet data', () => {
      const validData = {
        headers: ['Name', 'Age', 'Email'],
        rows: [
          ['John', '25', 'john@example.com'],
          ['Jane', '30', 'jane@example.com'],
        ],
        headerIndex: new Map([
          ['Name', 0],
          ['Age', 1],
          ['Email', 2],
        ]),
      };

      expect(() => validateParsedSpreadsheetData(validData)).not.toThrow();
      const result = validateParsedSpreadsheetData(validData);
      expect(result).toEqual(validData);
    });

    it('should throw error for missing headers', () => {
      const invalidData = {
        rows: [['data']],
        headerIndex: new Map(),
      };

      expect(() => validateParsedSpreadsheetData(invalidData)).toThrow(
        'headers must be an array'
      );
    });

    it('should throw error for invalid headerIndex type', () => {
      const invalidData = {
        headers: ['Name'],
        rows: [['John']],
        headerIndex: {},
      };

      expect(() => validateParsedSpreadsheetData(invalidData)).toThrow(
        'headerIndex must be a Map'
      );
    });
  });

  describe('validateStudentRecord', () => {
    it('should validate correct student record', () => {
      const validRecord = {
        admissionNumber: '12345',
        email: 'student@school.com',
        yearGroup: 'Year 10',
        classList: 'MAT, ENG, SCI',
        id: 'abc-123-def',
        fullName: 'John Doe',
      };

      expect(() => validateStudentRecord(validRecord)).not.toThrow();
      const result = validateStudentRecord(validRecord);
      expect(result).toEqual(validRecord);
    });

    it('should throw error for invalid email', () => {
      const invalidRecord = {
        admissionNumber: '12345',
        email: 'not-an-email',
        yearGroup: 'Year 10',
        classList: 'MAT',
        id: 'abc-123',
        fullName: 'John Doe',
      };

      expect(() => validateStudentRecord(invalidRecord)).toThrow(
        'email must be a valid email string'
      );
    });

    it('should throw error for missing required field', () => {
      const invalidRecord = {
        admissionNumber: '12345',
        email: 'student@school.com',
        yearGroup: 'Year 10',
        classList: 'MAT',
        // missing id
        fullName: 'John Doe',
      };

      expect(() => validateStudentRecord(invalidRecord)).toThrow(
        'id must be a string'
      );
    });
  });

  describe('validateProcessFiles', () => {
    it('should validate correct file objects', () => {
      const mockFile1 = new File(['content'], 'file1.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const mockFile2 = new File(['content'], 'file2.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const mockFile3 = new File(['content'], 'file3.csv', { type: 'text/csv' });

      const validFiles = {
        studentEmails: mockFile1,
        studentClassList: mockFile2,
        entraAd: mockFile3,
      };

      expect(() => validateProcessFiles(validFiles)).not.toThrow();
    });

    it('should throw error for missing file', () => {
      const invalidFiles = {
        studentEmails: new File(['content'], 'file1.xlsx'),
        studentClassList: new File(['content'], 'file2.xlsx'),
        entraAd: null,
      };

      expect(() => validateProcessFiles(invalidFiles)).toThrow(
        'entraAd must be a File'
      );
    });
  });

  describe('validateProcessOptions', () => {
    it('should validate correct options', () => {
      const validOptions = {
        classTagFilters: 'MAT, ENG, SCI',
        yeargroupMode: true,
      };

      expect(() => validateProcessOptions(validOptions)).not.toThrow();
    });

    it('should throw error for invalid yeargroupMode type', () => {
      const invalidOptions = {
        classTagFilters: 'MAT',
        yeargroupMode: 'true', // should be boolean
      };

      expect(() => validateProcessOptions(invalidOptions)).toThrow(
        'yeargroupMode must be a boolean'
      );
    });
  });

  describe('validateProcessingResult', () => {
    it('should validate correct processing result', () => {
      const validResult = {
        totalStudents: 100,
        matched: 95,
        filtered: 50,
        withId: 50,
        files: [
          {
            name: 'output.csv',
            content: 'data',
            count: 50,
          },
        ],
        yearGroups: new Map([['Year 10', 25], ['Year 11', 25]]),
      };

      expect(() => validateProcessingResult(validResult)).not.toThrow();
      const result = validateProcessingResult(validResult);
      expect(result).toEqual(validResult);
    });

    it('should throw error for negative numbers', () => {
      const invalidResult = {
        totalStudents: -5,
        matched: 0,
        filtered: 0,
        withId: 0,
        files: [],
        yearGroups: new Map(),
      };

      expect(() => validateProcessingResult(invalidResult)).toThrow(
        'totalStudents must be a non-negative number'
      );
    });

    it('should throw error for invalid files array', () => {
      const invalidResult = {
        totalStudents: 100,
        matched: 95,
        filtered: 50,
        withId: 50,
        files: 'not-an-array',
        yearGroups: new Map(),
      };

      expect(() => validateProcessingResult(invalidResult)).toThrow(
        'files must be an array'
      );
    });
  });
});
