# TypeScript Conversion Status

## ✅ Completed Files

### Class-Distribution Tool

**Core Modules:**

- ✅ `src/core/errors.ts` - Custom error classes (fully typed)
- ✅ `src/core/AppState.ts` - State management (fully typed)
- ✅ `src/core/DataMatcher.ts` - Business logic (fully typed)

**Parsers:**

- ✅ `src/parsers/SpreadsheetParser.ts` - CSV/XLSX parsing (fully typed)

**Generators:**

- ✅ `src/generators/ClassDistributionGenerator.ts` - CSV generation (fully typed)

**Utils:**

- ✅ `src/utils/Logger.ts` - Logging utility (fully typed)

### Shared Types

- ✅ `types/index.ts` - All type definitions (120 lines)

---

## ⏳ Remaining Files to Convert

### Class-Distribution Tool (3 files)

1. **`src/ui/FileUploadCard.ts`**
   - Current: `FileUploadCard.js` (180 lines)
   - Types needed: FileConfig, ValidationFeedback
   - Complexity: Medium (DOM manipulation)

2. **`src/config/tools.ts`**
   - Current: `tools.js` (70 lines)
   - Types needed: ToolConfig, FileConfig, OptionConfig
   - Complexity: Low (just configuration)

3. **`src/main.ts`**
   - Current: `main.js` (280 lines)
   - Types needed: All tool types
   - Complexity: High (orchestration)

### House-Teams Tool (9 files)

All files need to be converted (same structure as class-distribution):

- `src/core/AppState.ts` (can copy from class-distribution)
- `src/core/DataMatcher.ts` (needs adaptation)
- `src/core/errors.ts` (can copy from class-distribution)
- `src/parsers/SpreadsheetParser.ts` (simplified CSV-only version)
- `src/generators/HouseTeamsGenerator.ts` (different from class-dist)
- `src/ui/FileUploadCard.ts` (can copy from class-distribution)
- `src/utils/Logger.ts` (can copy from class-distribution)
- `src/config/tools.ts` (tool-specific)
- `src/main.ts` (tool-specific)

---

## 🚀 Quick Conversion Guide

### Step 1: Convert Remaining Class-Distribution Files

#### FileUploadCard.ts

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
    // ... implementation
  }

  // Add proper return types to all methods
}
```

#### config/tools.ts

```typescript
import type { ToolConfig } from '../../../types/index.js';
import { SpreadsheetParser } from '../parsers/SpreadsheetParser.js';

async function validateXLSX(file: File, headerRow: number): Promise<boolean> {
  // ... implementation
}

async function validateCSV(file: File): Promise<boolean> {
  // ... implementation
}

export const TOOLS: Record<string, ToolConfig> = {
  classDistribution: {
    // ... configuration
  }
};
```

#### main.ts

```typescript
import { AppState } from './core/AppState.js';
import { Logger } from './utils/Logger.js';
// ... other imports
import type { ClassDistributionProcessingResult } from '../../types/index.js';

class ClassDistributionApp {
  private state: AppState;
  private logger: Logger;
  private generator: ClassDistributionGenerator;
  // ... other properties

  constructor() {
    // ... initialization
  }

  // Add proper return types to all methods
}
```

### Step 2: Copy Reusable Files to House-Teams

These can be copied directly:

```bash
# From class-distribution to house-teams
cp class-distribution/src/core/AppState.ts house-teams/src/core/
cp class-distribution/src/core/errors.ts house-teams/src/core/
cp class-distribution/src/ui/FileUploadCard.ts house-teams/src/ui/
cp class-distribution/src/utils/Logger.ts house-teams/src/utils/
```

### Step 3: Adapt Tool-Specific Files for House-Teams

- `DataMatcher.ts` - Use the house-teams specific matching logic
- `SpreadsheetParser.ts` - Simplified CSV-only version
- `HouseTeamsGenerator.ts` - House/year grouping logic
- `config/tools.ts` - House-teams configuration
- `main.ts` - House-teams specific orchestration

---

## 📝 Conversion Checklist

### Class-Distribution

- [x] core/errors.ts
- [x] core/AppState.ts
- [x] core/DataMatcher.ts
- [x] parsers/SpreadsheetParser.ts
- [x] generators/ClassDistributionGenerator.ts
- [x] utils/Logger.ts
- [ ] ui/FileUploadCard.ts
- [ ] config/tools.ts
- [ ] main.ts

### House-Teams

- [ ] core/AppState.ts
- [ ] core/DataMatcher.ts
- [ ] core/errors.ts
- [ ] parsers/SpreadsheetParser.ts
- [ ] generators/HouseTeamsGenerator.ts
- [ ] ui/FileUploadCard.ts
- [ ] utils/Logger.ts
- [ ] config/tools.ts
- [ ] main.ts

---

## 🔨 Build and Test Process

Once all files are converted:

### 1. Build TypeScript

```bash
# Build both tools
npm run build

# Or build individually
npm run build:class-distribution
npm run build:house-teams
```

### 2. Check for Errors

```bash
# Type check without building
npm run type-check
```

### 3. Update HTML Files

**class-distribution/index.html:**

```html
<!-- Change from: -->
<script type="module" src="src/main.js"></script>

<!-- To: -->
<script type="module" src="dist/main.js"></script>
```

**house-teams/index.html:**

```html
<!-- Change from: -->
<script type="module" src="src/main.js"></script>

<!-- To: -->
<script type="module" src="dist/main.js"></script>
```

### 4. Test in Browser

```bash
# Start local server
cd class-distribution
python -m http.server 8001

# Open http://localhost:8001
# Test all functionality
```

### 5. Clean Up Old JavaScript Files

```bash
# After confirming everything works, remove .js files
# (Keep .js.old backups!)
find class-distribution/src -name "*.js" -not -name "*.old" -delete
find house-teams/src -name "*.js" -not -name "*.old" -delete
```

---

## 🎯 Current Progress

**Overall**: 6 out of 18 files converted (33%)

**Class-Distribution**: 6 out of 9 files (67%)
**House-Teams**: 0 out of 9 files (0%)

---

## 💡 Tips for Conversion

### Common Patterns

**1. Method Parameters**

```typescript
// Before
async parseCSV(file, requiredHeaders = []) {

// After
async parseCSV(file: File, requiredHeaders: string[] = []): Promise<ParsedSpreadsheetData> {
```

**2. Class Properties**

```typescript
// Before
constructor(logger = null) {
  this.logger = logger;
}

// After
private logger: Logger | null;

constructor(logger: Logger | null = null) {
  this.logger = logger;
}
```

**3. DOM Elements**

```typescript
// Before
const element = document.getElementById('myId');

// After
const element = document.getElementById('myId') as HTMLElement;
// or
const element = document.getElementById('myId')!; // if you're sure it exists
```

**4. Event Handlers**

```typescript
// Before
addEventListener('click', (e) => {

// After
addEventListener('click', (e: Event) => {
  // or
  const target = e.target as HTMLElement;
```

**5. Map/Set Types**

```typescript
// Before
const map = new Map();

// After
const map = new Map<string, number>();
```

---

## 🐛 Common Issues and Fixes

### Issue 1: "Cannot find module"

**Fix**: Make sure imports end with `.js` even for `.ts` files

```typescript
import { Logger } from './utils/Logger.js'; // ✅ Correct
import { Logger } from './utils/Logger.ts'; // ❌ Wrong
import { Logger } from './utils/Logger'; // ❌ Wrong
```

### Issue 2: "Property does not exist"

**Fix**: Add type assertion or optional chaining

```typescript
// Before
const value = map.get('key').property;

// After
const value = map.get('key')?.property;
// or
const value = map.get('key')!.property;
```

### Issue 3: "Implicit any"

**Fix**: Add explicit types

```typescript
// Before
function process(data) {

// After
function process(data: ParsedSpreadsheetData): void {
```

### Issue 4: "Type 'X' is not assignable to type 'Y'"

**Fix**: Make types match or use type assertion

```typescript
// Add type assertion
const result = someFunction() as ExpectedType;

// Or fix the types
function someFunction(): ExpectedType {
```

---

## 📊 Estimated Time to Complete

- **Remaining class-distribution files**: ~2 hours
- **House-teams conversion**: ~3 hours
- **Testing and fixing issues**: ~2 hours
- **Total**: ~7 hours

---

## 🎓 Learning from Converted Files

Look at the already-converted files for patterns:

- `class-distribution/src/core/errors.ts` - Error handling
- `class-distribution/src/core/AppState.ts` - State management patterns
- `class-distribution/src/core/DataMatcher.ts` - Complex business logic
- `class-distribution/src/parsers/SpreadsheetParser.ts` - File I/O and parsing
- `class-distribution/src/generators/ClassDistributionGenerator.ts` - Orchestration
- `class-distribution/src/utils/Logger.ts` - Utility class patterns

---

## 🚀 Next Steps

1. **Complete class-distribution** (3 files remaining)
   - FileUploadCard.ts
   - config/tools.ts
   - main.ts

2. **Copy reusable files to house-teams** (4 files)
   - AppState.ts
   - errors.ts
   - FileUploadCard.ts
   - Logger.ts

3. **Create house-teams specific files** (5 files)
   - DataMatcher.ts
   - SpreadsheetParser.ts
   - HouseTeamsGenerator.ts
   - config/tools.ts
   - main.ts

4. **Build and test**
   - Run `npm run build`
   - Fix any compilation errors
   - Test both tools in browser

5. **Update HTML and clean up**
   - Point to `dist/` files
   - Remove old `.js` files
   - Commit changes

---

## ✨ Benefits Once Complete

- ✅ Full type safety across both tools
- ✅ Better IDE autocomplete and refactoring
- ✅ Catch errors at compile time
- ✅ Self-documenting code with types
- ✅ Easier onboarding for new developers
- ✅ Confidence when making changes

---

## 🆘 Need Help?

Reference files:

- `TYPESCRIPT_GUIDE.md` - Complete TypeScript integration guide
- `JSDOC_EXAMPLE.md` - JSDoc alternative if stuck
- `types/index.ts` - All type definitions
- Already converted `.ts` files in `class-distribution/src/`

**If you get stuck**: You can always fall back to the JSDoc approach (see JSDOC_EXAMPLE.md) which doesn't require converting files.
