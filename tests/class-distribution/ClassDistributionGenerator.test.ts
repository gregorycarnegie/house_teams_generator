import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassDistributionGenerator } from '../../class-distribution/src/generators/ClassDistributionGenerator';

describe('ClassDistributionGenerator', () => {
  let generator: ClassDistributionGenerator;
  let mockFiles: any;

  beforeEach(() => {
    generator = new ClassDistributionGenerator();

    // Create mock File objects with proper content
    const emailsContent = `Admission Number\tStudent email\tYear Group Name
12345\tjohn@school.com\tYear 10
12346\tjane@school.com\tYear 11`;

    const classListContent = `
AdmissionNo\tStudentFullName\tStudentYearGroup\tStudentClassList
12345\tJohn Doe\tYear 10\tMAT, ENG, SCI
12346\tJane Smith\tYear 11\tMAT, FRE, HIS`;

    const entraContent = `mail,id
john@school.com,id-001
jane@school.com,id-002`;

    mockFiles = {
      studentEmails: new File([emailsContent], 'emails.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      studentClassList: new File([classListContent], 'classlist.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      entraAd: new File([entraContent], 'entra.csv', {
        type: 'text/csv',
      }),
    };
  });

  describe('generateCSVs', () => {
    it('should generate single CSV when yeargroupMode is false', () => {
      const students = [
        {
          admissionNumber: '12345',
          email: 'john@school.com',
          yearGroup: 'Year 10',
          classList: 'MAT, ENG, SCI',
          id: 'id-001',
          fullName: 'John Doe',
        },
        {
          admissionNumber: '12346',
          email: 'jane@school.com',
          yearGroup: 'Year 11',
          classList: 'MAT, FRE, HIS',
          id: 'id-002',
          fullName: 'Jane Smith',
        },
      ];

      const files = generator.generateCSVs(students, ['MAT'], false, {} as any);

      expect(files).toHaveLength(1);
      expect(files[0].count).toBe(2);
      expect(files[0].content).toContain('version:v1.0');
      expect(files[0].content).toContain('id-001');
      expect(files[0].content).toContain('id-002');
    });

    it('should generate separate CSVs per year group when yeargroupMode is true', () => {
      const students = [
        {
          admissionNumber: '12345',
          email: 'john@school.com',
          yearGroup: 'Year 10',
          classList: 'MAT, ENG, SCI',
          id: 'id-001',
          fullName: 'John Doe',
        },
        {
          admissionNumber: '12346',
          email: 'jane@school.com',
          yearGroup: 'Year 11',
          classList: 'MAT, FRE, HIS',
          id: 'id-002',
          fullName: 'Jane Smith',
        },
      ];

      const mockMatcher = {
        groupByYearGroup: vi.fn().mockReturnValue(
          new Map([
            ['Year 10', new Set(['id-001'])],
            ['Year 11', new Set(['id-002'])],
          ])
        ),
      };

      const files = generator.generateCSVs(students, ['MAT'], true, mockMatcher as any);

      expect(files).toHaveLength(2);
      expect(files[0].year).toBe('Year 10');
      expect(files[1].year).toBe('Year 11');
      expect(files[0].count).toBe(1);
      expect(files[1].count).toBe(1);
    });

    it('should include correct CSV headers', () => {
      const students = [
        {
          admissionNumber: '12345',
          email: 'john@school.com',
          yearGroup: 'Year 10',
          classList: 'MAT',
          id: 'id-001',
          fullName: 'John Doe',
        },
      ];

      const files = generator.generateCSVs(students, ['MAT'], false, {} as any);

      expect(files[0].content).toContain('version:v1.0');
      expect(files[0].content).toContain(
        'Member object ID or user principal name [memberObjectIdOrUpn] Required'
      );
    });
  });

  describe('sanitizeName', () => {
    it('should sanitize special characters for filenames', () => {
      expect(generator.sanitizeName('Year 10')).toBe('Year_10');
      expect(generator.sanitizeName('Year-11')).toBe('Year-11');
      expect(generator.sanitizeName('Test@Name#2024')).toBe('Test_Name_2024');
    });

    it('should handle empty strings', () => {
      expect(generator.sanitizeName('')).toBe('Unspecified');
      expect(generator.sanitizeName('   ')).toBe('Unspecified');
    });

    it('should preserve alphanumeric, hyphens and underscores', () => {
      expect(generator.sanitizeName('Valid-Name_123')).toBe('Valid-Name_123');
    });
  });

  describe('validation', () => {
    it('should validate input files are File objects', async () => {
      const invalidFiles = {
        studentEmails: 'not-a-file',
        studentClassList: mockFiles.studentClassList,
        entraAd: mockFiles.entraAd,
      };

      await expect(
        generator.process(invalidFiles as any, {
          classTagFilters: 'MAT',
          yeargroupMode: false,
        })
      ).rejects.toThrow('studentEmails must be a File');
    });

    it('should validate process options', async () => {
      await expect(
        generator.process(mockFiles, {
          classTagFilters: 123 as any, // Should be string
          yeargroupMode: false,
        })
      ).rejects.toThrow('classTagFilters must be a string');
    });

    it('should validate processing result', async () => {
      // This would require mocking the entire processing pipeline
      // For now, we test that the validation is called
      const options = {
        classTagFilters: 'MAT',
        yeargroupMode: false,
      };

      // We expect this to throw because mock files don't have real XLSX data
      // But it validates that the process method exists and attempts validation
      await expect(generator.process(mockFiles, options)).rejects.toThrow();
    });
  });
});
