/**
 * Browser-compatible validation schemas (without Zod dependency)
 * These provide runtime validation for browser environments
 */

import type {
  ParsedSpreadsheetData,
  StudentRecord,
  ClassDistributionProcessingResult
} from '../../../types/index.js';

/**
 * Simple validation helper
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate ParsedSpreadsheetData
 */
export function validateParsedSpreadsheetData(data: any): ParsedSpreadsheetData {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('ParsedSpreadsheetData must be an object');
  }

  if (!Array.isArray(data.headers)) {
    throw new ValidationError('headers must be an array');
  }

  if (!Array.isArray(data.rows)) {
    throw new ValidationError('rows must be an array');
  }

  if (!(data.headerIndex instanceof Map)) {
    throw new ValidationError('headerIndex must be a Map');
  }

  return data as ParsedSpreadsheetData;
}

/**
 * Validate StudentRecord
 */
export function validateStudentRecord(record: any): StudentRecord {
  if (!record || typeof record !== 'object') {
    throw new ValidationError('StudentRecord must be an object');
  }

  if (typeof record.admissionNumber !== 'string') {
    throw new ValidationError('admissionNumber must be a string');
  }

  if (typeof record.email !== 'string' || !record.email.includes('@')) {
    throw new ValidationError('email must be a valid email string');
  }

  if (typeof record.yearGroup !== 'string') {
    throw new ValidationError('yearGroup must be a string');
  }

  if (typeof record.classList !== 'string') {
    throw new ValidationError('classList must be a string');
  }

  if (typeof record.id !== 'string') {
    throw new ValidationError('id must be a string');
  }

  if (typeof record.fullName !== 'string') {
    throw new ValidationError('fullName must be a string');
  }

  return record as StudentRecord;
}

/**
 * Validate ProcessFiles
 */
export function validateProcessFiles(files: any): void {
  if (!files || typeof files !== 'object') {
    throw new ValidationError('ProcessFiles must be an object');
  }

  if (!(files.studentEmails instanceof File)) {
    throw new ValidationError('studentEmails must be a File');
  }

  if (!(files.studentClassList instanceof File)) {
    throw new ValidationError('studentClassList must be a File');
  }

  if (!(files.entraAd instanceof File)) {
    throw new ValidationError('entraAd must be a File');
  }
}

/**
 * Validate ProcessOptions
 */
export function validateProcessOptions(options: any): void {
  if (!options || typeof options !== 'object') {
    throw new ValidationError('ProcessOptions must be an object');
  }

  if (typeof options.classTagFilters !== 'string') {
    throw new ValidationError('classTagFilters must be a string');
  }

  if (typeof options.yeargroupMode !== 'boolean') {
    throw new ValidationError('yeargroupMode must be a boolean');
  }
}

/**
 * Validate ClassDistributionProcessingResult
 */
export function validateProcessingResult(result: any): ClassDistributionProcessingResult {
  if (!result || typeof result !== 'object') {
    throw new ValidationError('ProcessingResult must be an object');
  }

  if (typeof result.totalStudents !== 'number' || result.totalStudents < 0) {
    throw new ValidationError('totalStudents must be a non-negative number');
  }

  if (typeof result.matched !== 'number' || result.matched < 0) {
    throw new ValidationError('matched must be a non-negative number');
  }

  if (typeof result.filtered !== 'number' || result.filtered < 0) {
    throw new ValidationError('filtered must be a non-negative number');
  }

  if (typeof result.withId !== 'number' || result.withId < 0) {
    throw new ValidationError('withId must be a non-negative number');
  }

  if (!Array.isArray(result.files)) {
    throw new ValidationError('files must be an array');
  }

  if (!(result.yearGroups instanceof Map)) {
    throw new ValidationError('yearGroups must be a Map');
  }

  return result as ClassDistributionProcessingResult;
}
