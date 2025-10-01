import type { ParsedSpreadsheetData } from '../../../types/index.js';
import type { Logger } from '../../../shared/src/utils/Logger.js';

interface HouseYearGroup {
  house: string;
  year: string;
  ids: Set<string>;
}

interface MissingStudent {
  email: string;
  house: string;
  year: string;
  reason: string;
}

interface MatchResult {
  groups: Map<string, HouseYearGroup>;
  missing: MissingStudent[];
  processed: number;
  matched: number;
}

/**
 * Handles matching of student data for house-teams generation
 */
export class DataMatcher {
  private bromcomData: ParsedSpreadsheetData;
  private entraData: ParsedSpreadsheetData;
  private logger: Logger | null;

  constructor(
    bromcomData: ParsedSpreadsheetData,
    entraData: ParsedSpreadsheetData,
    logger: Logger | null = null
  ) {
    this.bromcomData = bromcomData;
    this.entraData = entraData;
    this.logger = logger;
  }

  /**
   * Build a lookup map of Entra IDs by email
   */
  buildEntraLookup(): Map<string, string> {
    this.log('info', 'Building Entra ID lookup...');

    const emailToId = new Map<string, string>();
    const mailIdx = this.entraData.headerIndex.get('mail')!;
    const idIdx = this.entraData.headerIndex.get('id')!;

    for (const row of this.entraData.rows) {
      if (!row || !row.length) continue;

      const email = this.normalize(row[mailIdx] || '');
      const id = (row[idIdx] || '').trim();

      if (!email || !id) continue;

      if (!emailToId.has(email)) {
        emailToId.set(email, id);
      }
    }

    this.log('info', `Loaded ${emailToId.size} Entra IDs`);
    return emailToId;
  }

  /**
   * Match Bromcom students with Entra IDs and group by house and year
   */
  matchStudents(): MatchResult {
    this.log('info', 'Processing Bromcom records and matching with Entra IDs...');

    const emailToId = this.buildEntraLookup();
    const groupMap = new Map<string, HouseYearGroup>(); // "House_Year" -> Group info
    const missing: MissingStudent[] = [];

    const houseIdx = this.bromcomData.headerIndex.get('House(s)')!;
    const emailIdx = this.bromcomData.headerIndex.get('Student email')!;
    const yearIdx = this.bromcomData.headerIndex.get('Year Group Name')!;

    for (const row of this.bromcomData.rows) {
      if (!row || !row.length) continue;

      const email = this.normalize(row[emailIdx] || '');
      const house = (row[houseIdx] || '').trim();
      const year = (row[yearIdx] || '').trim();

      if (!email) continue;

      const entraId = emailToId.get(email);
      if (!entraId) {
        missing.push({ email, house, year, reason: 'No Entra ID found' });
        continue;
      }

      if (!house || !year) {
        missing.push({ email, house, year, reason: 'Missing house or year group' });
        continue;
      }

      // Create group key
      const groupKey = `${this.sanitizeName(house)}_${this.sanitizeName(year)}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, { house, year, ids: new Set<string>() });
      }

      groupMap.get(groupKey)!.ids.add(entraId);
    }

    this.log('success', `Processed ${this.bromcomData.rows.length} records`);
    this.log('success', `Matched ${this.bromcomData.rows.length - missing.length} students`);
    this.log('info', `Created ${groupMap.size} house-year groups`);

    if (missing.length > 0) {
      this.log('warning', `${missing.length} students could not be matched`);
    }

    return {
      groups: groupMap,
      missing: missing,
      processed: this.bromcomData.rows.length,
      matched: this.bromcomData.rows.length - missing.length
    };
  }

  /**
   * Normalize email for comparison
   */
  private normalize(str: string): string {
    return (str || '').trim().toLowerCase();
  }

  /**
   * Sanitize names for use in filenames
   */
  sanitizeName(name: string): string {
    if (!name || !name.trim()) return '_Unspecified';
    return name.trim().replace(/[^A-Za-z0-9\-_]+/g, '_');
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
