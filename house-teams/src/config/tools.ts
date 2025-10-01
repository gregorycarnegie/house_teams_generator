import { SpreadsheetParser } from '../parsers/SpreadsheetParser.js';
import type { FileConfig } from '../../../types/index.js';

/**
 * Validate CSV file
 */
async function validateCSV(file: File, requiredHeaders: string[] = []): Promise<boolean> {
  try {
    await SpreadsheetParser.parseCSV(file, requiredHeaders);
    return true;
  } catch (error) {
    throw error;
  }
}

interface ToolOption {
  type: 'select';
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  default: string;
  hint: string;
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
  houseTeams: {
    name: 'House & Year Entra ID CSV Builder',
    description: 'Generate Entra ID CSV files grouped by house and year',
    files: [
      {
        id: 'bromcom',
        label: 'Bromcom export',
        icon: '../shared/icons/bromcom.svg',
        format: 'CSV',
        accept: '.csv,text/csv',
        description: 'CSV including columns "House(s)", "Student email", and "Year Group Name"',
        requiredHeaders: ['House(s)', 'Student email', 'Year Group Name'],
        validator: (file: File) => validateCSV(file, ['House(s)', 'Student email', 'Year Group Name'])
      },
      {
        id: 'entra',
        label: 'Entra ID export',
        icon: '../shared/icons/entra.svg',
        format: 'CSV',
        accept: '.csv,text/csv',
        description: 'CSV including columns "id" and "mail"',
        requiredHeaders: ['id', 'mail'],
        validator: (file: File) => validateCSV(file, ['id', 'mail'])
      }
    ],
    options: [
      {
        type: 'select',
        id: 'saveMode',
        label: 'Save mode',
        options: [
          { value: 'folder', label: 'Save to a folder (recommended)' },
          { value: 'downloads', label: 'Download each CSV' }
        ],
        default: 'folder',
        hint: 'Choose how the CSV files should be saved once generated'
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
