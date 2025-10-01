import { FileValidationError } from '../../../shared/src/core/errors.js';
import type { ParsedSpreadsheetData } from '../../../types/index.js';

/**
 * CSV file parser
 * Simplified version for house-teams (CSV only, no XLSX)
 */
export class SpreadsheetParser {
  /**
   * Parse a CSV file with proper handling of quotes, delimiters, and BOM
   */
  static async parseCSV(file: File, requiredHeaders: string[] = []): Promise<ParsedSpreadsheetData> {
    const text = await this.readTextFile(file);

    const rows: any[][] = [];
    let i = 0;
    let field = '';
    let row: any[] = [];
    let inQuotes = false;
    let c: string;

    const pushField = (): void => { row.push(field); field = ''; };
    const pushRow = (): void => { if (row.length) { rows.push(row); row = []; } };

    while (i < text.length) {
      c = text[i++];
      if (inQuotes) {
        if (c === '"') {
          if (text[i] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          pushField();
        } else if (c === '\r') {
          // ignore
        } else if (c === '\n') {
          pushField();
          pushRow();
        } else {
          field += c;
        }
      }
    }

    if (field.length || row.length) {
      pushField();
      pushRow();
    }

    if (rows.length === 0) {
      throw new FileValidationError('CSV file is empty or has no valid data', file);
    }

    // Remove BOM if present in first header
    if (rows[0][0] && rows[0][0].charCodeAt(0) === 0xFEFF) {
      rows[0][0] = rows[0][0].slice(1);
    }

    const headers = rows.shift()!.map(h => (h || '').trim());
    const headerIndex = new Map<string, number>();
    headers.forEach((h, i) => headerIndex.set(h, i));

    // Validate required headers
    for (const required of requiredHeaders) {
      if (!headerIndex.has(required)) {
        throw new FileValidationError(
          `Missing required column "${required}" in CSV`,
          file,
          { availableHeaders: headers }
        );
      }
    }

    return { headers, rows, headerIndex };
  }

  /**
   * Read a text file
   */
  static readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Validate that required headers exist in the parsed data
   */
  static validateHeaders(
    headerIndex: Map<string, number>,
    requiredHeaders: string[],
    file: File
  ): void {
    const missing: string[] = [];
    for (const required of requiredHeaders) {
      if (!headerIndex.has(required)) {
        missing.push(required);
      }
    }

    if (missing.length > 0) {
      throw new FileValidationError(
        `Missing required column(s): ${missing.join(', ')}`,
        file,
        {
          missing,
          available: Array.from(headerIndex.keys())
        }
      );
    }
  }
}
