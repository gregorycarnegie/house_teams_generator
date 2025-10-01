import { SpreadsheetParser } from '../parsers/SpreadsheetParser.js';
import type { FileConfig } from '../../../types/index.js';

/**
 * Validate XLSX file
 */
async function validateXLSX(file: File, headerRow: number): Promise<boolean> {
  try {
    await SpreadsheetParser.parseXLSX(file, headerRow);
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Validate CSV file
 */
async function validateCSV(file: File): Promise<boolean> {
  try {
    await SpreadsheetParser.parseCSV(file);
    return true;
  } catch (error) {
    throw error;
  }
}

interface ToolOption {
  type: 'textarea' | 'checkbox';
  id: string;
  label: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  validator?: (value: string) => boolean;
}

interface ToolDefinition {
  name: string;
  description: string;
  files: FileConfig[];
  options: ToolOption[];
}

interface ToolsConfig {
  [key: string]: ToolDefinition;
}

/**
 * Tool configurations
 */
export const TOOLS: ToolsConfig = {
  classDistribution: {
    name: 'Class Distribution Group Generator',
    description: 'Generate Entra ID distribution group CSVs based on class tags',
    files: [
      {
        id: 'studentEmails',
        label: 'Student Emails Report',
        icon: '../shared/icons/bromcom.svg',
        format: 'XLSX',
        accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: 'Bromcom XLSX file with headers on row 1',
        requiredHeaders: ['Admission Number', 'Year Group Name', 'Student email'],
        headerRow: 1,
        validator: (file: File) => validateXLSX(file, 1)
      },
      {
        id: 'studentClassList',
        label: 'Student Class List',
        icon: '../shared/icons/bromcom.svg',
        format: 'XLSX',
        accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: 'Bromcom XLSX file with headers on row 2',
        requiredHeaders: ['StudentFullName', 'StudentYearGroup', 'StudentClassList', 'AdmissionNo'],
        headerRow: 2,
        validator: (file: File) => validateXLSX(file, 2)
      },
      {
        id: 'entraAd',
        label: 'Entra AD Export',
        icon: '../shared/icons/entra.svg',
        format: 'CSV',
        accept: '.csv,text/csv',
        description: 'CSV file with headers: "mail", "id"',
        requiredHeaders: ['mail', 'id'],
        validator: (file: File) => validateCSV(file)
      }
    ],
    options: [
      {
        type: 'textarea',
        id: 'classTagFilters',
        label: 'Class tag filters',
        placeholder: 'Enter class tags (one per line or space-separated)\nExample: MAT MAF SCI',
        rows: 3,
        hint: 'Students will be included if their StudentClassList contains ANY of these tags (substring match, case-insensitive)',
        validator: (value: string) => value.trim().length > 0
      },
      {
        type: 'checkbox',
        id: 'yeargroupMode',
        label: 'Yeargroup mode',
        hint: 'When checked, creates separate CSV files for each year group'
      }
    ]
  }
};

/**
 * Get tool configuration by ID
 */
export function getToolConfig(toolId: string): ToolDefinition | undefined {
  return TOOLS[toolId];
}

/**
 * Get file configuration by ID
 */
export function getFileConfig(toolId: string, fileId: string): FileConfig | undefined {
  const tool = TOOLS[toolId];
  return tool?.files.find(f => f.id === fileId);
}
