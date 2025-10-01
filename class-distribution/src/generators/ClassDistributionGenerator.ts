import { SpreadsheetParser } from '../parsers/SpreadsheetParser.js';
import { DataMatcher } from '../core/DataMatcher.js';
import type {
  StudentRecord,
  GeneratedFile,
  ClassDistributionProcessingResult
} from '../../../types/index.js';
import type { Logger } from '../../../shared/src/utils/Logger.js';

interface ProcessFiles {
  studentEmails: File;
  studentClassList: File;
  entraAd: File;
}

interface ProcessOptions {
  classTagFilters: string;
  yeargroupMode: boolean;
}

/**
 * Generator for class distribution group CSVs
 */
export class ClassDistributionGenerator {
  private logger: Logger | null;

  constructor(logger: Logger | null = null) {
    this.logger = logger;
  }

  /**
   * Process files and generate distribution group CSVs
   */
  async process(
    files: ProcessFiles,
    options: ProcessOptions
  ): Promise<ClassDistributionProcessingResult> {
    try {
      // Parse all files
      this.log('info', 'Reading student emails file...');
      const emailsData = await SpreadsheetParser.parseXLSX(files.studentEmails, 1);
      this.log('info', `Found ${emailsData.headers.length} headers in emails file`);

      this.log('info', 'Reading student class list file...');
      const classData = await SpreadsheetParser.parseXLSX(files.studentClassList, 2);
      this.log('info', `Found ${classData.headers.length} headers in class list file`);

      this.log('info', 'Reading Entra AD file...');
      const entraData = await SpreadsheetParser.parseCSV(files.entraAd, ['mail', 'id']);

      // Validate required columns
      SpreadsheetParser.validateHeaders(
        emailsData.headerIndex,
        ['Admission Number', 'Year Group Name', 'Student email'],
        files.studentEmails
      );

      SpreadsheetParser.validateHeaders(
        classData.headerIndex,
        ['StudentFullName', 'StudentYearGroup', 'StudentClassList', 'AdmissionNo'],
        files.studentClassList
      );

      // Match students
      const matcher = new DataMatcher(emailsData, classData, entraData, this.logger);
      const { students } = matcher.matchStudents();

      // Parse and filter by class tags
      const tags = DataMatcher.parseClassTags(options.classTagFilters);
      const filteredStudents = matcher.filterByClassTags(students, tags);

      if (filteredStudents.length === 0) {
        this.log('warning', 'No students match the specified class tags');
        return {
          totalStudents: students.length,
          matched: students.length,
          filtered: 0,
          withId: 0,
          files: [],
          yearGroups: new Map<string, number>()
        };
      }

      // Generate CSVs
      const generatedFiles = this.generateCSVs(
        filteredStudents,
        tags,
        options.yeargroupMode,
        matcher
      );

      // Calculate stats
      const yearGroupStats = matcher.getYearGroupStats(filteredStudents);

      return {
        totalStudents: students.length,
        matched: students.length,
        filtered: filteredStudents.length,
        withId: filteredStudents.length,
        files: generatedFiles,
        yearGroups: yearGroupStats
      };

    } catch (error) {
      this.log('error', `Processing failed: ${(error as Error).message}`, error);
      throw error;
    }
  }

  /**
   * Generate CSV files
   */
  generateCSVs(
    students: StudentRecord[],
    tags: string[],
    yeargroupMode: boolean,
    matcher: DataMatcher
  ): GeneratedFile[] {
    const csvHeader = [
      'version:v1.0',
      'Member object ID or user principal name [memberObjectIdOrUpn] Required',
      'Example: 9832aad8-e4fe-496b-a604-95c6eF01ae75'
    ].join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const files: GeneratedFile[] = [];

    if (yeargroupMode) {
      // Group by year
      const yearGroups = matcher.groupByYearGroup(students);

      // Create CSV for each year group
      for (const [year, ids] of yearGroups.entries()) {
        const sanitizedYear = this.sanitizeName(year);
        const tagToken = tags.slice(0, 3).join('_').slice(0, 20);
        const filename = `distribution_group_${sanitizedYear}_${tagToken}_${timestamp}.csv`;

        const content = csvHeader + '\n' + Array.from(ids).join('\n') + '\n';

        files.push({
          name: filename,
          content: content,
          year: year,
          count: ids.size
        });

        this.log('success', `Generated CSV for ${year} with ${ids.size} IDs`);
      }
    } else {
      // Single CSV for all
      const allIds = new Set(students.map(s => s.id));
      const tagToken = tags.slice(0, 3).join('_').slice(0, 20);
      const filename = `distribution_group_all_${tagToken}_${timestamp}.csv`;

      const content = csvHeader + '\n' + Array.from(allIds).join('\n') + '\n';

      files.push({
        name: filename,
        content: content,
        count: allIds.size
      });

      this.log('success', `Generated single CSV with ${allIds.size} IDs`);
    }

    return files;
  }

  /**
   * Sanitize names for use in filenames
   */
  sanitizeName(name: string): string {
    if (!name || !name.trim()) return 'Unspecified';
    return name.trim().replace(/[^A-Za-z0-9\-_]+/g, '_');
  }

  /**
   * Log a message
   */
  private log(level: string, message: string, data: any = null): void {
    if (this.logger && typeof (this.logger as any)[level] === 'function') {
      if (data) {
        (this.logger as any)[level](message, data);
      } else {
        (this.logger as any)[level](message);
      }
    }
  }
}
