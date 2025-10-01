import { SpreadsheetParser } from '../parsers/SpreadsheetParser.js';
import { DataMatcher } from '../core/DataMatcher.js';
import { ExportError } from '../../../shared/src/core/errors.js';
import type { Logger } from '../../../shared/src/utils/Logger.js';
import type { GeneratedFile, HouseTeamsProcessingResult } from '../../../types/index.js';

// Extend Window interface for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

interface ProcessFiles {
  bromcom: File;
  entra: File;
}

interface ProcessOptions {
  saveMode?: 'folder' | 'downloads';
}

interface SaveResult {
  success: boolean;
  count?: number;
  cancelled?: boolean;
}

/**
 * Generator for house-teams CSV files
 */
export class HouseTeamsGenerator {
  private logger: Logger | null;

  constructor(logger: Logger | null = null) {
    this.logger = logger;
  }

  /**
   * Process files and generate house-team CSVs
   */
  async process(
    files: ProcessFiles,
    _options: ProcessOptions = {}
  ): Promise<HouseTeamsProcessingResult> {
    try {
      // Parse both files
      this.log('info', 'Reading Bromcom export...');
      const bromcomData = await SpreadsheetParser.parseCSV(
        files.bromcom,
        ['House(s)', 'Student email', 'Year Group Name']
      );
      this.log('info', `Found ${bromcomData.headers.length} headers in Bromcom file`);

      this.log('info', 'Reading Entra ID export...');
      const entraData = await SpreadsheetParser.parseCSV(
        files.entra,
        ['id', 'mail']
      );
      this.log('info', `Found ${entraData.headers.length} headers in Entra file`);

      // Match students
      const matcher = new DataMatcher(bromcomData, entraData, this.logger);
      const matchResults = matcher.matchStudents();

      // Generate CSVs
      const csvFiles = this.generateCSVs(matchResults.groups);

      return {
        processed: matchResults.processed,
        matched: matchResults.matched,
        missing: matchResults.missing.length,
        groups: matchResults.groups,
        missingDetails: matchResults.missing,
        files: csvFiles
      };

    } catch (error: any) {
      this.log('error', `Processing failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate CSV files for each house-year group
   */
  private generateCSVs(groups: Map<string, any>): GeneratedFile[] {
    const csvHeader = [
      'version:v1.0',
      'Member object ID or user principal name [memberObjectIdOrUpn] Required',
      'Example: 9832aad8-e4fe-496b-a604-95c6ef01ae75'
    ].join('\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const files: GeneratedFile[] = [];

    for (const [groupKey, groupData] of groups.entries()) {
      const filename = `${groupKey}_${timestamp}.csv`;
      const content = csvHeader + '\n' + Array.from(groupData.ids).join('\n') + '\n';

      files.push({
        name: filename,
        content: content,
        house: groupData.house,
        year: groupData.year,
        count: groupData.ids.size
      });

      this.log('success', `Generated CSV for ${groupData.house} / ${groupData.year} with ${groupData.ids.size} IDs`);
    }

    return files;
  }

  /**
   * Save files to a directory using File System Access API
   */
  async saveToFolder(files: GeneratedFile[]): Promise<SaveResult> {
    if (!window.showDirectoryPicker) {
      throw new ExportError('File System Access API not supported in this browser');
    }

    try {
      const dirHandle = await window.showDirectoryPicker();

      for (const file of files) {
        const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file.content);
        await writable.close();
        this.log('success', `Saved ${file.name}`);
      }

      return { success: true, count: files.length };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      throw err;
    }
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
