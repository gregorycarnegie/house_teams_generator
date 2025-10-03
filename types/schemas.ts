/**
 * Zod schemas for runtime validation
 */
import { z } from 'zod';

// ===== File Processing Schemas =====

export const ParsedSpreadsheetDataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.any())),
  headerIndex: z.instanceof(Map<string, number>)
});

export const FileConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  format: z.string(),
  accept: z.string(),
  description: z.string(),
  requiredHeaders: z.array(z.string()),
  headerRow: z.number().optional(),
  validator: z.function()
});

export const SelectOptionSchema = z.object({
  value: z.string(),
  label: z.string()
});

export const OptionConfigSchema = z.object({
  type: z.enum(['textarea', 'checkbox', 'select']),
  id: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  rows: z.number().optional(),
  hint: z.string().optional(),
  options: z.array(SelectOptionSchema).optional(),
  default: z.any().optional(),
  validator: z.function().optional()
});

export const ToolConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  files: z.array(FileConfigSchema),
  options: z.array(OptionConfigSchema)
});

// ===== State Management Schemas =====

export const AppFilesSchema = z.record(z.string(), z.instanceof(File).nullable());

export const AppConfigSchema = z.record(z.string(), z.any());

export const StateListenerSchema = z.object({
  event: z.string(),
  callback: z.function()
});

// ===== Logger Schemas =====

export const LogLevelSchema = z.enum(['debug', 'info', 'warning', 'error', 'success']);

export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: LogLevelSchema,
  message: z.string(),
  data: z.any().optional()
});

// ===== Error Schemas =====

export const ErrorDetailsSchema = z.record(z.string(), z.any());

// ===== Class Distribution Schemas =====

export const StudentRecordSchema = z.object({
  admissionNumber: z.string(),
  email: z.string().email(),
  yearGroup: z.string(),
  classList: z.string(),
  id: z.string(),
  fullName: z.string()
});

export const GeneratedFileSchema = z.object({
  name: z.string(),
  content: z.string(),
  year: z.string().optional(),
  house: z.string().optional(),
  count: z.number().int().nonnegative()
});

export const ClassDistributionProcessingResultSchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  filtered: z.number().int().nonnegative(),
  withId: z.number().int().nonnegative(),
  files: z.array(GeneratedFileSchema),
  yearGroups: z.instanceof(Map<string, number>)
});

// ===== House Teams Schemas =====

export const MissingMatchSchema = z.object({
  email: z.string().email(),
  house: z.string().optional(),
  year: z.string().optional(),
  reason: z.string()
});

export const GroupDataSchema = z.object({
  house: z.string(),
  year: z.string(),
  ids: z.instanceof(Set<string>)
});

export const HouseTeamsProcessingResultSchema = z.object({
  processed: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
  groups: z.instanceof(Map),
  missingDetails: z.array(MissingMatchSchema),
  files: z.array(GeneratedFileSchema)
});

export const SaveFolderResultSchema = z.object({
  success: z.boolean(),
  count: z.number().int().nonnegative().optional(),
  cancelled: z.boolean().optional()
});

// ===== UI Component Schemas =====

export const ValidationFeedbackSchema = z.object({
  message: z.string(),
  type: z.enum(['success', 'error', 'warning'])
});

// ===== Process Options Schemas =====

export const ProcessFilesSchema = z.object({
  studentEmails: z.instanceof(File),
  studentClassList: z.instanceof(File),
  entraAd: z.instanceof(File)
});

export const ProcessOptionsSchema = z.object({
  classTagFilters: z.string(),
  yeargroupMode: z.boolean()
});
