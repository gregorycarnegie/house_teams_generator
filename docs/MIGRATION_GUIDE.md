# Migration Guide: Old vs New Architecture

## Overview

This document compares the old procedural implementation (`script.js.old`) with the new modular architecture.

---

## File Structure Comparison

### Old Structure (Single File)

```text
class-distribution/
├── index.html
├── script.js        (722 lines - everything in one file)
└── styles.css
```

### New Structure (Modular)

```text
class-distribution/
├── src/
│   ├── core/           (3 files - 200 lines)
│   ├── ui/             (1 file - 180 lines)
│   ├── parsers/        (1 file - 210 lines)
│   ├── generators/     (1 file - 150 lines)
│   ├── config/         (1 file - 70 lines)
│   ├── utils/          (1 file - 150 lines)
│   └── main.js         (1 file - 280 lines)
├── index.html          (simplified)
└── styles.css
```

**Result**: Same functionality, better organization, ~1240 lines total (vs 722), but with:

- Better comments/documentation
- More robust error handling
- Reusable components
- Easier to test

---

## Code Organization Comparison

### Old: Global State

```javascript
// Old way - global variables
const requiredFiles = {
  studentEmails: null,
  studentClassList: null,
  entraAd: null
};

const logger = new Logger('processingLog');

// Files directly accessed everywhere
async function processFiles() {
  const emailsData = await readXLSX(requiredFiles.studentEmails, 1);
  // ...
}
```

### New: Centralized State

```javascript
// New way - encapsulated state
class AppState {
  constructor() {
    this.files = { /* ... */ };
    this.listeners = [];
  }

  setFile(key, file) {
    this.files[key] = file;
    this.notify('fileChanged', { key, file });
  }
}

// Usage
const state = new AppState();
state.subscribe('fileChanged', updateUI);
state.setFile('studentEmails', file);
```

**Benefits**:

- ✅ State changes are trackable
- ✅ No accidental global modifications
- ✅ Easy to add state persistence
- ✅ Better for debugging

---

## File Parsing Comparison

### Old: Mixed Responsibilities

```javascript
// Parsing logic mixed with file reading
async function readXLSX(file, headerRow = 2) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // 70+ lines of parsing logic
      // Mixed with error handling
      // Mixed with validation
      // Mixed with header detection
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseCSV(text, requiredHeaders = []) {
  // 60+ lines of CSV parsing
  // Manual state machine
}
```

### New: Separated Concerns

```javascript
// Clean separation of concerns
class SpreadsheetParser {
  static async parseCSV(file, requiredHeaders) {
    const text = await this.readTextFile(file);
    // Parse...
    return { headers, rows, headerIndex };
  }

  static async parseXLSX(file, headerRow) {
    const buffer = await file.arrayBuffer();
    // Parse using SheetJS...
    return this.normalizeSpreadsheetData(data, headerRow, file);
  }

  static validateHeaders(headerIndex, requiredHeaders, file) {
    // Validation logic separate
  }
}
```

**Benefits**:

- ✅ Single responsibility per method
- ✅ Easy to test parsing without file I/O
- ✅ Reusable across different tools
- ✅ Cleaner error handling

---

## Data Matching Comparison

### Old: Procedural Logic

```javascript
// Everything in processFiles()
async function processFiles() {
  // 1. Parse files (inline)
  const emailsData = await readXLSX(requiredFiles.studentEmails, 1);
  const classData = await readXLSX(requiredFiles.studentClassList, 2);
  const entraData = parseCSV(entraText, ['mail', 'id']);

  // 2. Build lookups (inline)
  const entraLookup = new Map();
  for (const row of entraData.rows) { /* ... */ }

  const studentsLookup = new Map();
  for (const row of emailsData.rows) { /* ... */ }

  // 3. Match students (inline)
  const canonicalStudents = [];
  for (const row of classData.rows) { /* ... */ }

  // 4. Filter (inline)
  const filteredStudents = canonicalStudents.filter(/* ... */);

  // 5. Generate CSVs (inline)
  const files = [];
  if (yearGroupMode) { /* ... */ }

  // All ~250 lines in one function
}
```

### New: Separated Classes

```javascript
// Clear separation of responsibilities

// 1. Parsing (SpreadsheetParser)
const emailsData = await SpreadsheetParser.parseXLSX(files.studentEmails, 1);
const classData = await SpreadsheetParser.parseXLSX(files.studentClassList, 2);
const entraData = await SpreadsheetParser.parseCSV(files.entraAd, ['mail', 'id']);

// 2. Validation
SpreadsheetParser.validateHeaders(emailsData.headerIndex, requiredHeaders, files.studentEmails);

// 3. Matching (DataMatcher)
const matcher = new DataMatcher(emailsData, classData, entraData, logger);
const { students, warnings } = matcher.matchStudents();

// 4. Filtering
const tags = DataMatcher.parseClassTags(options.classTagFilters);
const filteredStudents = matcher.filterByClassTags(students, tags);

// 5. Generation (ClassDistributionGenerator)
const files = this.generateCSVs(filteredStudents, tags, options.yeargroupMode, matcher);
```

**Benefits**:

- ✅ Each step is testable independently
- ✅ Easy to add new matching strategies
- ✅ Logic is reusable
- ✅ Much easier to understand flow

---

## Error Handling Comparison

### Old: Basic Error Handling

```javascript
// Generic error messages
if (!headerIndex.has(required)) {
  throw new Error(`Missing required column "${required}" in CSV`);
}

// Caught at top level
try {
  const results = await processFiles();
  // ...
} catch (error) {
  console.error('Processing error:', error);
  status.textContent = `Error: ${error.message}`;
}
```

### New: Rich Error Context

```javascript
// Custom error types with context
export class FileValidationError extends Error {
  constructor(message, file, details) {
    super(message);
    this.file = file;
    this.details = details;
    this.userMessage = this.getUserFriendlyMessage();
  }

  getUserFriendlyMessage() {
    // Provides helpful suggestions based on error type
    return `${this.message}\n\n💡 ${suggestion}`;
  }
}

// Better error handling
throw new FileValidationError(
  `Missing required column "${required}"`,
  file,
  { availableHeaders: headers }
);

// Caught with full context
catch (error) {
  logger.error(`Processing failed: ${error.message}`, error);
  statusText.textContent = error.userMessage || error.message;
}
```

**Benefits**:

- ✅ Users see helpful error messages
- ✅ Developers see full context
- ✅ Errors are categorized
- ✅ Easier to handle different error types

---

## UI Component Comparison

### Old: Manual DOM Manipulation

```javascript
// Hardcoded in HTML
<input id="studentEmails" type="file" />

// Manual event listeners
byId('studentEmails').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
  requiredFiles.studentEmails = file;

  const picker = e.target.closest('.file-picker');
  const title = picker.querySelector('.file-picker__title');
  if (file) {
    title.textContent = file.name;
    title.style.color = 'var(--good)';
    picker.style.borderColor = 'var(--good)';
    picker.style.background = 'rgba(76, 217, 100, 0.1)';
  } else {
    title.textContent = 'Select or drop file';
    title.style.color = '';
    picker.style.borderColor = '';
    picker.style.background = '';
  }

  updateGenerateButton();
});

// Repeated for each file input (3x duplication)
```

### New: Reusable Component

```javascript
// Component class
class FileUploadCard {
  constructor(config, onFileChange) {
    this.config = config;
    this.element = this.render();  // Generate HTML
    this.setupEventListeners();     // Wire up events
  }

  async handleFileChange(file) {
    this.file = file;
    await this.validateFile();
    this.updateUI();
    this.onFileChange(this.config.id, file);
  }
}

// Usage - no duplication
for (const fileConfig of toolConfig.files) {
  const card = new FileUploadCard(fileConfig, (fileId, file) => {
    state.setFile(fileId, file);
  });
  container.appendChild(card.getElement());
}
```

**Benefits**:

- ✅ No code duplication
- ✅ Easy to add new file types
- ✅ Built-in validation feedback
- ✅ Drag-and-drop included
- ✅ Consistent behavior

---

## Configuration Comparison

### Old: Hardcoded

```javascript
// Validation rules hardcoded in function
const emailsRequired = ['Admission Number', 'Year Group Name', 'Student email'];
for (const col of emailsRequired) {
  if (!emailsData.headerIndex.has(col)) {
    throw new Error(`Missing required column "${col}"`);
  }
}

// HTML hardcoded in index.html (repeated 3 times)
```

### New: Configuration-Driven

```javascript
// Single source of truth
export const TOOLS = {
  classDistribution: {
    name: 'Class Distribution Group Generator',
    files: [
      {
        id: 'studentEmails',
        label: 'Student Emails Report',
        format: 'XLSX',
        requiredHeaders: ['Admission Number', 'Year Group Name', 'Student email'],
        headerRow: 1,
        validator: (file) => validateXLSX(file, 1)
      },
      // ... other files
    ]
  }
};

// UI and validation generated from config
```

**Benefits**:

- ✅ Single source of truth
- ✅ Easy to add new tools
- ✅ Self-documenting
- ✅ Consistent validation

---

## Testing Comparison

### Old: Hard to Test

```javascript
// Can't test without:
// - Loading actual files
// - Setting up DOM
// - Mocking file system
// - Global state

// No clear way to test parseCSV in isolation
// No way to test matching logic without full flow
```

### New: Easy to Test

```javascript
// Unit test SpreadsheetParser
import { SpreadsheetParser } from './parsers/SpreadsheetParser.js';

test('parseCSV handles quoted fields', async () => {
  const file = new File(['name,age\n"John,Doe",25'], 'test.csv');
  const result = await SpreadsheetParser.parseCSV(file);
  expect(result.rows[0][0]).toBe('John,Doe');
});

// Unit test DataMatcher
test('matchStudents returns matched students', () => {
  const matcher = new DataMatcher(mockEmails, mockClass, mockEntra);
  const { students } = matcher.matchStudents();
  expect(students).toHaveLength(5);
});

// Integration test
test('full processing flow', async () => {
  const generator = new ClassDistributionGenerator();
  const results = await generator.process(mockFiles, mockOptions);
  expect(results.files).toHaveLength(1);
});
```

**Benefits**:

- ✅ Each module testable in isolation
- ✅ Can mock dependencies
- ✅ Fast unit tests
- ✅ Better code coverage

---

## Maintainability Comparison

### Old: Procedural Spaghetti

- 722 lines in one file
- Functions call each other in complex ways
- Hard to find where state changes
- Mixing of concerns (parsing, matching, UI, logging)
- Duplication in event handlers

### New: Modular Architecture

- 9 focused modules
- Clear dependencies
- Single responsibility per class
- Easy to find and fix bugs
- No duplication

---

## Performance Comparison

### Both

- Same runtime performance
- Files processed in main thread
- Results rendered synchronously

### Future Improvements (Easier with New)

```javascript
// Easy to add Web Worker support
class ClassDistributionGenerator {
  async process(files, options) {
    if (window.Worker) {
      return this.processInWorker(files, options);
    }
    return this.processInMainThread(files, options);
  }
}

// Easy to add progress tracking
class DataMatcher {
  matchStudents(onProgress) {
    for (let i = 0; i < rows.length; i++) {
      // Process row
      if (i % 100 === 0) {
        onProgress(i / rows.length);
      }
    }
  }
}
```

---

## Summary

| Aspect | Old | New |
|--------|-----|-----|
| **Lines of Code** | 722 (1 file) | ~1240 (9 files) |
| **Organization** | Procedural | Modular |
| **State Management** | Global variables | AppState class |
| **Error Handling** | Basic | Rich with context |
| **UI Components** | Hardcoded HTML | Dynamic components |
| **Configuration** | Hardcoded | Config-driven |
| **Testability** | Hard | Easy |
| **Reusability** | Low | High |
| **Maintainability** | Difficult | Easy |
| **Extensibility** | Hard | Easy |
| **Documentation** | Comments only | Self-documenting |

---

## Migration Checklist

If you want to migrate another tool to this architecture:

- [ ] Create `src/` directory structure
- [ ] Move state to `AppState` class
- [ ] Extract parsing logic to `SpreadsheetParser`
- [ ] Create dedicated generator class
- [ ] Move UI components to classes
- [ ] Create configuration file
- [ ] Add custom error types
- [ ] Update HTML to use ES6 modules
- [ ] Add logging with `Logger` class
- [ ] Test thoroughly

---

## Conclusion

The new architecture is **more code** but provides:

1. **Better Organization** - Easy to find and modify functionality
2. **Testability** - Can test each part independently
3. **Reusability** - Components work in other tools
4. **Maintainability** - Easier to fix bugs and add features
5. **Extensibility** - Simple to add new capabilities
6. **Debugging** - Better error messages and logging

**Trade-off**: More files and initial complexity, but massive long-term benefits for maintainability and team collaboration.
