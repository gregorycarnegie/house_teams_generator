import { FileValidationError } from '../../../shared/src/core/errors.js';
import type { ParsedSpreadsheetData } from '../../../types/index.js';

// Declare SheetJS types
declare global {
  interface Window {
    XLSX: any;
  }
}

/**
 * Spreadsheet parser for CSV and XLSX files
 */
export class SpreadsheetParser {
  /**
   * Parse a CSV file with proper handling of quotes, delimiters, and BOM
   */
  static async parseCSV(file: File, requiredHeaders: string[] = []): Promise<ParsedSpreadsheetData> {
    const text = await this.readTextFile(file);

    // Remove BOM if present
    let cleanText = text;
    if (text.charCodeAt(0) === 0xFEFF) {
      cleanText = text.slice(1);
    }

    const rows: any[][] = [];
    let i = 0;
    let field = '';
    let row: any[] = [];
    let inQuotes = false;
    let c: string;

    const pushField = (): void => { row.push(field.trim()); field = ''; };
    const pushRow = (): void => { if (row.length) { rows.push(row); row = []; } };

    while (i < cleanText.length) {
      c = cleanText[i++];
      if (inQuotes) {
        if (c === '"') {
          if (cleanText[i] === '"') {
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

    const headers = rows.shift()!.map((h: any) => String(h).trim());
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
   * Parse an XLSX file using SheetJS
   */
  static async parseXLSX(file: File, headerRow: number = 1): Promise<ParsedSpreadsheetData> {
    if (!window.XLSX) {
      throw new Error('SheetJS library not loaded');
    }

    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false
    });

    // Validate header row exists
    if (data.length < headerRow) {
      throw new FileValidationError(
        `Expected headers on row ${headerRow}, but file only has ${data.length} rows`,
        file
      );
    }

    return this.normalizeSpreadsheetData(data, headerRow, file);
  }

  /**
   * Normalize spreadsheet data by extracting headers and rows
   */
  static normalizeSpreadsheetData(
    data: any[][],
    headerRow: number,
    file: File
  ): ParsedSpreadsheetData {
    let actualHeaderRow = headerRow - 1; // Convert to 0-based index
    let headers: string[] = [];

    // Try to extract headers from specified row
    if (data[actualHeaderRow]) {
      headers = data[actualHeaderRow]
        .map((h: any) => String(h || '')
          .trim()
          .replace(/^\uFEFF/, '') // Remove BOM
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/[^\x20-\x7E]/g, '') // Remove non-printable
        )
        .filter((h: string) => h);
    }

    // If no headers found, try row 1
    if (headers.length === 0 && data[0]) {
      actualHeaderRow = 0;
      headers = data[0]
        .map((h: any) => String(h || '')
          .trim()
          .replace(/^\uFEFF/, '')
          .replace(/\s+/g, ' ')
          .replace(/[^\x20-\x7E]/g, '')
        )
        .filter((h: string) => h);
    }

    if (headers.length === 0) {
      throw new FileValidationError('No valid headers found in the XLSX file', file);
    }

    const rows = data.slice(actualHeaderRow + 1);
    const headerIndex = new Map<string, number>(headers.map((h, i) => [h, i]));

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
