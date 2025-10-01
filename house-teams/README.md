# House & Year Entra ID CSV Builder

Generate Microsoft Entra ID CSV files grouped by house and year from Bromcom exports.

> **Technology:** TypeScript with ES6 modules and modern architecture patterns

## Architecture Overview

The application is now organized into a modular structure:

```text
house-teams/
├── src/                # TypeScript source files
│   ├── config/         # Configuration
│   │   └── tools.ts           # Tool configurations
│   ├── core/           # Core business logic (tool-specific)
│   │   └── DataMatcher.ts     # Student data matching logic
│   ├── generators/     # Output generators
│   │   └── HouseTeamsGenerator.ts  # CSV generation & file saving
│   ├── parsers/        # File parsing
│   │   └── SpreadsheetParser.ts  # CSV parsing
│   └── main.ts         # Application entry point
├── dist/               # Compiled JavaScript (git-ignored)
├── index.html          # Tool UI
└── tsconfig.json       # TypeScript configuration

Shared modules (imported from ../shared/src/):
├── core/AppState.ts        # Central state management
├── core/errors.ts          # Custom error classes
├── ui/FileUploadCard.ts    # File upload component
└── utils/Logger.ts         # Logging utility
```

## Key Features

### 1. **Module-Based Architecture**

- ES6 modules for better code organization
- Clear separation of concerns
- Easy to test individual components
- Reusable across different tools

### 2. **State Management**

- Centralized `AppState` class
- Observer pattern for reactive updates
- Predictable data flow
- Easy to debug

### 3. **Better Error Handling**

- Custom error classes (`FileValidationError`, `DataMatchingError`, `ExportError`)
- User-friendly error messages with suggestions
- Proper error propagation

### 4. **Configuration-Driven UI**

- Tool configuration in `config/tools.ts`
- Easy to add new file types or validation rules
- Consistent UI generation
- Self-documenting configuration

### 5. **Component-Based UI**

- `FileUploadCard` component with drag-and-drop
- Built-in validation feedback
- Reusable across tools
- Clean separation from business logic

### 6. **File System Access API Support**

- Save all CSVs to a folder in one operation
- Fallback to individual downloads
- Better user experience for bulk operations

## How It Works

1. **Initialization** (`main.js`)
   - Create file upload cards from configuration
   - Set up event listeners
   - Subscribe to state changes

2. **File Upload** (`FileUploadCard.js`)
   - User selects or drags files
   - Files are validated
   - Valid files are stored in `AppState`
   - UI updates reactively

3. **Processing** (`HouseTeamsGenerator.js`)
   - Parse both CSV files using `SpreadsheetParser`
   - Match student data using `DataMatcher`
   - Group students by house and year
   - Generate CSV files

4. **Saving** (`HouseTeamsGenerator.js`)
   - Option 1: Save to folder using File System Access API
   - Option 2: Download each CSV individually
   - User choice stored in state

5. **Results** (`main.js`)
   - Display statistics
   - Render download links (if not saved to folder)
   - Show missing matches report

## Comparison with Class-Distribution Tool

Both tools now share:

- ✅ Same core modules (`AppState`, `errors`, `Logger`)
- ✅ Same UI components (`FileUploadCard`)
- ✅ Same architecture patterns
- ✅ Configuration-driven approach

**Differences:**

- House-Teams only uses CSV files (simpler parser)
- House-Teams has File System Access API integration
- House-Teams groups by house + year (vs class tags)
- House-Teams is simpler (2 files vs 3 files)

## Benefits

- **Testability**: Each module can be tested independently
- **Maintainability**: Clear structure makes it easy to find and fix bugs
- **Extensibility**: Easy to add new features
- **Reusability**: Components shared with class-distribution tool
- **Debugging**: Better error messages and logging
- **Consistency**: Same patterns across both tools

## Usage

Simply open `index.html` in a browser or run a local server:

```bash
python -m http.server 8002
```

Then navigate to `http://localhost:8002`

## Development

### Building

```bash
# From project root
npm run build:house-teams

# Or build all tools
npm run build
```

### Local Testing

The code uses ES6 modules, so you need to serve it via HTTP (not `file://`).

```bash
python -m http.server 8000
# Then navigate to http://localhost:8000/house-teams/
```

### Making Changes

To modify the tool:

1. Edit `src/config/tools.ts` for file requirements
2. Edit `src/core/DataMatcher.ts` for matching logic
3. Edit `src/generators/HouseTeamsGenerator.ts` for CSV generation

Remember to run `npm run build:house-teams` after making changes!

## Migration from Old Code

The old procedural code has been backed up to `script.js.old`. All JavaScript source files have been converted to TypeScript and archived with `.js.old` extensions.

### What Changed

**Old (305 lines, 1 file):**

- Procedural code
- Global state
- Mixed responsibilities
- Hard to test

**New (~1,100 lines, 9 TypeScript modules):**

- Object-oriented with full type safety
- State management with observer pattern
- Single responsibility per module
- Easy to test and maintain

The refactored code provides significantly better:

- Organization and structure
- Type safety and IDE support
- Error handling
- Maintainability and extensibility

## Documentation

- [Main README](../README.md) - Project overview
- [Class Distribution Tool](../class-distribution/README.md) - Sibling tool documentation
- [Architecture Guide](../class-distribution/ARCHITECTURE.md) - Detailed architecture patterns
