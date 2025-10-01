/**
 * Shared TypeScript type definitions for house teams generator tools
 */

// ===== File Processing Types =====

export interface ParsedSpreadsheetData {
  headers: string[];
  rows: any[][];
  headerIndex: Map<string, number>;
}

export interface FileConfig {
  id: string;
  label: string;
  icon: string;
  format: string;
  accept: string;
  description: string;
  requiredHeaders: string[];
  headerRow?: number;
  validator: (file: File) => Promise<boolean>;
}

export interface ToolConfig {
  name: string;
  description: string;
  files: FileConfig[];
  options: OptionConfig[];
}

export interface OptionConfig {
  type: 'textarea' | 'checkbox' | 'select';
  id: string;
  label: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  options?: SelectOption[];
  default?: any;
  validator?: (value: any) => boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

// ===== State Management Types =====

export interface AppFiles {
  [key: string]: File | null;
}

export interface AppConfig {
  [key: string]: any;
}

export interface StateListener {
  event: string;
  callback: (data: any, event?: string) => void;
}

// ===== Logger Types =====

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'success';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

// ===== Error Types =====

export interface ErrorDetails {
  [key: string]: any;
}

// ===== Class Distribution Types =====

export interface StudentRecord {
  admissionNumber: string;
  email: string;
  yearGroup: string;
  classList: string;
  id: string;
  fullName: string;
}

export interface ClassDistributionProcessingResult {
  totalStudents: number;
  matched: number;
  filtered: number;
  withId: number;
  files: GeneratedFile[];
  yearGroups: Map<string, number>;
}

export interface GeneratedFile {
  name: string;
  content: string;
  year?: string;
  house?: string;
  count: number;
}

// ===== House Teams Types =====

export interface HouseTeamsProcessingResult {
  processed: number;
  matched: number;
  missing: number;
  groups: Map<string, GroupData>;
  missingDetails: MissingMatch[];
  files: GeneratedFile[];
}

export interface GroupData {
  house: string;
  year: string;
  ids: Set<string>;
}

export interface MissingMatch {
  email: string;
  house?: string;
  year?: string;
  reason: string;
}

export interface SaveFolderResult {
  success: boolean;
  count?: number;
  cancelled?: boolean;
}

// ===== UI Component Types =====

export interface ValidationFeedback {
  message: string;
  type: 'success' | 'error' | 'warning';
}
