# Class Distribution Group Generator

Generate Microsoft Entra ID distribution group CSVs filtered by class tags.

> **Technology:** TypeScript with ES6 modules and modern architecture patterns

## Architecture Overview

The application is now organized into a modular structure:

```text
class-distribution/
├── src/                # TypeScript source files
│   ├── core/           # Core business logic
│   │   ├── AppState.ts        # Central state management
│   │   ├── DataMatcher.ts     # Student data matching logic
│   │   └── errors.ts          # Custom error classes
│   ├── ui/             # UI components
│   │   └── FileUploadCard.ts  # File upload component
│   ├── parsers/        # File parsing
│   │   └── SpreadsheetParser.ts  # CSV/XLSX parsing
│   ├── generators/     # Output generators
│   │   └── ClassDistributionGenerator.ts  # CSV generation
│   ├── config/         # Configuration
│   │   └── tools.ts           # Tool configurations
│   ├── utils/          # Utilities
│   │   └── Logger.ts          # Logging utility
│   └── main.ts         # Application entry point
├── dist/               # Compiled JavaScript (git-ignored)
├── index.html          # Tool UI
└── tsconfig.json       # TypeScript configuration
```

## Key Improvements

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

- Tool configuration in `config/tools.js`
- Easy to add new file types or validation rules
- Consistent UI generation
- Self-documenting configuration

### 5. **Component-Based UI**

- `FileUploadCard` component with drag-and-drop
- Built-in validation feedback
- Reusable across tools
- Clean separation from business logic

### 6. **Improved Logging**

- Dedicated `Logger` class
- Multiple log levels (debug, info, warning, error, success)
- Console and DOM output
- Log export functionality

### 7. **Cleaner Data Processing**

- `DataMatcher` class for student matching
- `SpreadsheetParser` for file parsing
- `ClassDistributionGenerator` for CSV generation
- Each class has a single responsibility

## How It Works

1. **Initialization** (`main.js`)
   - Load dependencies (SheetJS)
   - Create file upload cards from configuration
   - Set up event listeners
   - Subscribe to state changes

2. **File Upload** (`FileUploadCard.js`)
   - User selects or drags files
   - Files are validated
   - Valid files are stored in `AppState`
   - UI updates reactively

3. **Processing** (`ClassDistributionGenerator.js`)
   - Parse all three files using `SpreadsheetParser`
   - Match student data using `DataMatcher`
   - Filter by class tags
   - Generate CSV files

4. **Results** (`main.js`)
   - Display statistics
   - Render download links
   - Show year group breakdown
   - Display processing log

## Benefits of This Architecture

- **Testability**: Each module can be tested independently
- **Maintainability**: Clear structure makes it easy to find and fix bugs
- **Extensibility**: Easy to add new features or file types
- **Reusability**: Components can be used in other tools
- **Debugging**: Better error messages and logging
- **Performance**: Modular loading and tree-shaking support

## Usage

Simply open `index.html` in a browser or run a local server:

```bash
python -m http.server 8001
```

Then navigate to `http://localhost:8001`

## Development

### Building

```bash
# From project root
npm run build:class-distribution

# Or build all tools
npm run build
```

### Local Testing

The code uses ES6 modules, so you need to serve it via HTTP (not `file://`).

```bash
python -m http.server 8000
# Then navigate to http://localhost:8000/class-distribution/
```

### Making Changes

To add a new file type:

1. Add configuration in `src/config/tools.ts`
2. The UI will be generated automatically
3. Add validation logic if needed

To modify processing logic:

1. Edit `src/core/DataMatcher.ts` for matching logic
2. Edit `src/generators/ClassDistributionGenerator.ts` for output logic

Remember to run `npm run build:class-distribution` after making changes!

## Migration from Old Code

The old procedural code has been backed up to `script.js.old`. All JavaScript source files have been converted to TypeScript and archived with `.js.old` extensions.

## Documentation

- [Architecture Guide](ARCHITECTURE.md) - Detailed architecture documentation
- [Migration Guide](MIGRATION_GUIDE.md) - Before/after comparison
- [TypeScript Quick Start](../TYPESCRIPT_QUICK_START.md) - TypeScript development guide
- [Project Documentation](../docs/) - Comprehensive guides and references
