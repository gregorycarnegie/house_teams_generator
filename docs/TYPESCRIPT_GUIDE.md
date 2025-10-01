# TypeScript Integration Guide

## Overview

This guide covers adding TypeScript to the house teams generator project. There are **two approaches** you can take:

1. **Full TypeScript Conversion** - Convert all `.js` files to `.ts` files
2. **JSDoc with TypeScript** - Keep `.js` files but add type checking via JSDoc comments (Recommended)

## Current Status

✅ **Already Set Up:**

- TypeScript installed (`typescript` v5.9.3)
- Type definitions created (`types/index.ts`)
- TypeScript configurations (`tsconfig.json`)
- Build scripts in `package.json`
- Example TypeScript files:
  - `class-distribution/src/core/errors.ts`
  - `class-distribution/src/core/AppState.ts`
  - `class-distribution/src/utils/Logger.ts`

---

## Approach 1: Full TypeScript Conversion (In Progress)

### Advantages

- ✅ Full type safety at compile time
- ✅ Better IDE autocomplete and refactoring
- ✅ Catches type errors before runtime
- ✅ Self-documenting code with explicit types
- ✅ Easier for teams with TypeScript experience

### Disadvantages

- ❌ Requires build step before running
- ❌ More verbose code
- ❌ Time-consuming conversion process
- ❌ Need to update all imports/exports
- ❌ Separate source (`src/`) and compiled (`dist/`) directories

### How to Complete the Conversion

#### 1. Convert Remaining Files

For each `.js` file in `src/`, create a `.ts` version:

**Before (`FileUploadCard.js`):**

```javascript
export class FileUploadCard {
  constructor(config, onFileChange) {
    this.config = config;
    this.file = null;
    this.onFileChange = onFileChange;
  }

  async validateFile() {
    if (!this.file) return;
    // ...
  }
}
```

**After (`FileUploadCard.ts`):**

```typescript
import type { FileConfig } from '../../../types/index.js';

export class FileUploadCard {
  private config: FileConfig;
  private file: File | null;
  private onFileChange: (fileId: string, file: File | null) => void;
  private element: HTMLElement;

  constructor(
    config: FileConfig,
    onFileChange: (fileId: string, file: File | null) => void
  ) {
    this.config = config;
    this.file = null;
    this.onFileChange = onFileChange;
    this.element = this.render();
  }

  private async validateFile(): Promise<void> {
    if (!this.file) return;
    // ...
  }

  public getFile(): File | null {
    return this.file;
  }
}
```

#### 2. Files to Convert

**Class-Distribution:**

- ✅ `core/errors.ts` (done)
- ✅ `core/AppState.ts` (done)
- ✅ `utils/Logger.ts` (done)
- ⏳ `core/DataMatcher.ts`
- ⏳ `parsers/SpreadsheetParser.ts`
- ⏳ `generators/ClassDistributionGenerator.ts`
- ⏳ `ui/FileUploadCard.ts`
- ⏳ `config/tools.ts`
- ⏳ `main.ts`

**House-Teams:**

- Same files as class-distribution

#### 3. Build and Run

```bash
# Build TypeScript to JavaScript
npm run build

# Or build just one tool
npm run build:class-distribution
npm run build:house-teams

# Type check without building
npm run type-check

# Watch mode for development
npm run build:watch
```

#### 4. Update HTML

Change imports to use compiled files:

**Before:**

```html
<script type="module" src="src/main.js"></script>
```

**After:**

```html
<script type="module" src="dist/main.js"></script>
```

---

## Approach 2: JSDoc with TypeScript (Recommended)

### Advantages

- ✅ No build step required
- ✅ Keep existing `.js` files
- ✅ Get type checking with `npm run type-check`
- ✅ Great IDE support (VS Code)
- ✅ Easier to adopt incrementally
- ✅ Can convert to full TypeScript later

### Disadvantages

- ❌ Less strict than full TypeScript
- ❌ More verbose JSDoc comments
- ❌ Type errors only shown during type-check, not at runtime

### How to Use JSDoc

#### 1. Add JSDoc Comments to Existing Files

**Example: `FileUploadCard.js`**

```javascript
/**
 * @typedef {import('../../../types/index.js').FileConfig} FileConfig
 */

/**
 * File upload card component with drag-and-drop support and validation
 */
export class FileUploadCard {
  /** @type {FileConfig} */
  config;

  /** @type {File | null} */
  file;

  /** @type {(fileId: string, file: File | null) => void} */
  onFileChange;

  /** @type {HTMLElement} */
  element;

  /**
   * @param {FileConfig} config - File configuration
   * @param {(fileId: string, file: File | null) => void} onFileChange - Callback when file changes
   */
  constructor(config, onFileChange) {
    this.config = config;
    this.file = null;
    this.onFileChange = onFileChange;
    this.element = this.render();
    this.setupEventListeners();
  }

  /**
   * Render the upload card HTML
   * @returns {HTMLElement}
   */
  render() {
    // ...
  }

  /**
   * Validate the selected file
   * @returns {Promise<void>}
   */
  async validateFile() {
    if (!this.file) return;
    // ...
  }

  /**
   * Get the current file
   * @returns {File | null}
   */
  getFile() {
    return this.file;
  }
}
```

#### 2. Create a `jsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "checkJs": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": [
    "class-distribution/src/**/*.js",
    "house-teams/src/**/*.js",
    "types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.old"
  ]
}
```

#### 3. Type Check Your Code

```bash
# Check for type errors
npx tsc --noEmit

# Or add to package.json
npm run type-check
```

#### 4. VS Code Integration

Create `.vscode/settings.json`:

```json
{
  "javascript.validate.enable": true,
  "javascript.suggestionActions.enabled": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "js/ts.implicitProjectConfig.checkJs": true
}
```

---

## Shared Type Definitions

The `types/index.ts` file contains all shared types:

```typescript
// Already created in types/index.ts
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

// ... many more
```

### Using Types in JavaScript with JSDoc

```javascript
/**
 * @typedef {import('../../../types/index.js').FileConfig} FileConfig
 * @typedef {import('../../../types/index.js').ParsedSpreadsheetData} ParsedSpreadsheetData
 */

/**
 * Parse a CSV file
 * @param {File} file - The file to parse
 * @param {string[]} requiredHeaders - Required headers
 * @returns {Promise<ParsedSpreadsheetData>}
 */
export async function parseCSV(file, requiredHeaders) {
  // TypeScript knows the return type!
}
```

---

## Build Scripts

Already configured in `package.json`:

```json
{
  "scripts": {
    "build": "npm run build:class-distribution && npm run build:house-teams",
    "build:class-distribution": "tsc -p class-distribution/tsconfig.json",
    "build:house-teams": "tsc -p house-teams/tsconfig.json",
    "build:watch": "tsc -p tsconfig.json --watch",
    "type-check": "tsc --noEmit"
  }
}
```

---

## TypeScript Configuration

### Root `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "removeComments": false,
    "noEmitOnError": true
  }
}
```

### Tool-Specific Configs

Each tool extends the root config:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.js", "**/*.old"]
}
```

---

## Conversion Checklist

### For Full TypeScript Conversion

- [ ] Convert `core/errors.js` → `errors.ts` ✅ (done)
- [ ] Convert `core/AppState.js` → `AppState.ts` ✅ (done)
- [ ] Convert `utils/Logger.js` → `Logger.ts` ✅ (done)
- [ ] Convert `core/DataMatcher.js` → `DataMatcher.ts`
- [ ] Convert `parsers/SpreadsheetParser.js` → `SpreadsheetParser.ts`
- [ ] Convert `generators/*.js` → `*.ts`
- [ ] Convert `ui/FileUploadCard.js` → `FileUploadCard.ts`
- [ ] Convert `config/tools.js` → `tools.ts`
- [ ] Convert `main.js` → `main.ts`
- [ ] Update HTML to use `dist/` files
- [ ] Test compilation with `npm run build`
- [ ] Test both tools work correctly
- [ ] Delete old `.js` files (keep `.js.old` backups)

### For JSDoc Approach

- [ ] Create `jsconfig.json`
- [ ] Add JSDoc comments to all exported functions
- [ ] Add JSDoc comments to all classes
- [ ] Add type imports at top of files
- [ ] Run `npm run type-check` to verify
- [ ] Fix any type errors
- [ ] Keep `.js` files, no build step needed

---

## Recommendation

**For this project, I recommend Approach 2 (JSDoc) because:**

1. ✅ You already have working JavaScript
2. ✅ No build step keeps it simple
3. ✅ Still get type safety and IDE support
4. ✅ Can incrementally add types
5. ✅ Can convert to full TypeScript later if needed

**Use Approach 1 (Full TypeScript) if:**

- You want maximum type safety
- You're comfortable with build tools
- You plan to add a bundler (Vite/Webpack) anyway
- You're working in a team that prefers TypeScript

---

## Example: Converting One Module

### Before (JavaScript)

```javascript
// src/core/DataMatcher.js
export class DataMatcher {
  constructor(emailsData, classData, entraData, logger = null) {
    this.emailsData = emailsData;
    this.classData = classData;
    this.entraData = entraData;
    this.logger = logger;
  }

  matchStudents() {
    // ...
    return { students, warnings };
  }
}
```

### After (TypeScript)

```typescript
// src/core/DataMatcher.ts
import type { ParsedSpreadsheetData, StudentRecord } from '../../../types/index.js';
import type { Logger } from '../utils/Logger.js';

export class DataMatcher {
  private emailsData: ParsedSpreadsheetData;
  private classData: ParsedSpreadsheetData;
  private entraData: ParsedSpreadsheetData;
  private logger: Logger | null;

  constructor(
    emailsData: ParsedSpreadsheetData,
    classData: ParsedSpreadsheetData,
    entraData: ParsedSpreadsheetData,
    logger: Logger | null = null
  ) {
    this.emailsData = emailsData;
    this.classData = classData;
    this.entraData = entraData;
    this.logger = logger;
  }

  public matchStudents(): { students: StudentRecord[]; warnings: Set<string> } {
    // ...
    return { students, warnings };
  }
}
```

### After (JSDoc)

```javascript
// src/core/DataMatcher.js
/**
 * @typedef {import('../../../types/index.js').ParsedSpreadsheetData} ParsedSpreadsheetData
 * @typedef {import('../../../types/index.js').StudentRecord} StudentRecord
 * @typedef {import('../utils/Logger.js').Logger} Logger
 */

/**
 * Handles matching and merging of student data from multiple sources
 */
export class DataMatcher {
  /** @type {ParsedSpreadsheetData} */
  emailsData;
  /** @type {ParsedSpreadsheetData} */
  classData;
  /** @type {ParsedSpreadsheetData} */
  entraData;
  /** @type {Logger | null} */
  logger;

  /**
   * @param {ParsedSpreadsheetData} emailsData
   * @param {ParsedSpreadsheetData} classData
   * @param {ParsedSpreadsheetData} entraData
   * @param {Logger | null} logger
   */
  constructor(emailsData, classData, entraData, logger = null) {
    this.emailsData = emailsData;
    this.classData = classData;
    this.entraData = entraData;
    this.logger = logger;
  }

  /**
   * Match students from all three data sources
   * @returns {{ students: StudentRecord[]; warnings: Set<string> }}
   */
  matchStudents() {
    // ...
    return { students, warnings };
  }
}
```

---

## Next Steps

### Option A: Continue Full TypeScript Conversion

```bash
# Continue converting files to TypeScript
# Then build and test
npm run build
```

### Option B: Switch to JSDoc Approach

```bash
# Create jsconfig.json
# Add JSDoc comments to existing .js files
# Type check
npm run type-check
```

### Option C: Keep as-is with Type Definitions

- Use the `types/index.ts` file for documentation
- Reference types in code comments
- No automatic type checking
- Simplest option, least intrusive

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [JSDoc Type Checking](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

---

## Conclusion

You now have:

- ✅ TypeScript installed and configured
- ✅ Shared type definitions created
- ✅ Three example TypeScript files
- ✅ Build scripts ready
- ✅ Three approaches to choose from

**My recommendation**: Start with JSDoc (Approach 2) to get immediate benefits without disrupting your working code. You can always convert to full TypeScript later.
