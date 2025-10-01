import type { ErrorDetails } from '../../../types/index.js';

/**
 * Custom error classes for better error handling
 */

export class FileValidationError extends Error {
  public readonly name = 'FileValidationError';
  public readonly file: File;
  public readonly details: ErrorDetails | null;
  public readonly userMessage: string;

  constructor(message: string, file: File, details: ErrorDetails | null = null) {
    super(message);
    this.file = file;
    this.details = details;
    this.userMessage = this.getUserFriendlyMessage();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileValidationError);
    }
  }

  private getUserFriendlyMessage(): string {
    const suggestions: Record<string, string> = {
      'Missing required column': 'Please check that your file has the correct headers.',
      'No valid headers': 'Try opening the file in Excel and ensure row 1 contains column headers.',
      'Expected headers on row': 'The file may be empty or corrupted. Try re-exporting it.',
      'must have at least': 'The file appears to be empty or has too few rows.'
    };

    for (const [key, suggestion] of Object.entries(suggestions)) {
      if (this.message.includes(key)) {
        return `${this.message}\n\n💡 ${suggestion}`;
      }
    }
    return this.message;
  }
}

export class DataMatchingError extends Error {
  public readonly name = 'DataMatchingError';
  public readonly details: ErrorDetails | null;

  constructor(message: string, details: ErrorDetails | null = null) {
    super(message);
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataMatchingError);
    }
  }
}

export class ExportError extends Error {
  public readonly name = 'ExportError';
  public readonly details: ErrorDetails | null;

  constructor(message: string, details: ErrorDetails | null = null) {
    super(message);
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExportError);
    }
  }
}
