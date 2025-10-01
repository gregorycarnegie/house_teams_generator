# House Teams Generator

A collection of tools for generating Microsoft Entra ID distribution group CSV files based on student data exports from Bromcom.

## 🚀 Quick Start

### Build the Project

```bash
npm install
npm run build
```

### Use the Tools

Open either tool in a browser:

- **Class Distribution:** [class-distribution/index.html](class-distribution/index.html)
- **House Teams:** [house-teams/index.html](house-teams/index.html)

## 🛠️ Tools

### 1. Class Distribution Group Generator

Generate Entra ID distribution group CSVs filtered by class tags.

**Location:** `class-distribution/`

**Features:**

- Filter students by class tags (e.g., MAT, SCI, ENG)
- Group by year groups (optional)
- Export multiple CSV files at once

**Required Files:**

- Bromcom Student Emails Report (XLSX)
- Bromcom Student Class List (XLSX)
- Entra ID Export (CSV)

[📖 Read more](class-distribution/README.md)

### 2. House & Year Entra ID CSV Builder

Generate Entra ID CSV files grouped by house and year.

**Location:** `house-teams/`

**Features:**

- Automatic grouping by house and year
- Save all CSVs to a folder (recommended)
- Individual download support

**Required Files:**

- Bromcom Export with House(s), Student email, Year Group Name (CSV)
- Entra ID Export with id and mail (CSV)

[📖 Read more](house-teams/README.md)

## 💻 Technology Stack

### TypeScript

- **Full TypeScript integration** with strict mode
- Type-safe code across all modules
- Comprehensive type definitions in `types/index.ts`

### Modern JavaScript (ES2020)

- ES6 modules with import/export
- Component-based UI architecture
- Observer pattern for state management

### Libraries

- **SheetJS (xlsx)** - Excel file parsing (class-distribution only)
- Native File APIs - File reading and CSV export

## 📁 Project Structure

```text
house_teams_generator/
├── types/
│   └── index.ts                 # Shared type definitions
│
├── shared/                      # Shared code library
│   ├── src/                     # Shared TypeScript modules
│   │   ├── core/               # errors.ts, AppState.ts
│   │   ├── ui/                 # FileUploadCard.ts
│   │   └── utils/              # Logger.ts
│   ├── icons/                   # Shared icons
│   └── styles/                  # Shared styles
│
├── class-distribution/          # Class distribution tool
│   ├── src/                     # TypeScript source files
│   ├── dist/                    # Compiled JavaScript (git-ignored)
│   ├── index.html              # Tool UI
│   └── README.md               # Tool documentation
│
├── house-teams/                 # House teams tool
│   ├── src/                     # TypeScript source files
│   ├── dist/                    # Compiled JavaScript (git-ignored)
│   ├── index.html              # Tool UI
│   └── README.md               # Tool documentation
│
├── docs/                        # Documentation
│   ├── TYPESCRIPT_QUICK_START.md
│   ├── TYPESCRIPT_GUIDE.md
│   ├── PROJECT_STRUCTURE.md
│   └── ...
│
├── package.json                 # Dependencies and build scripts
└── tsconfig.json               # TypeScript configuration
```

## 🔧 Development

### Build Commands

```bash
# Build both tools
npm run build

# Build specific tool
npm run build:class-distribution
npm run build:house-teams

# Watch mode (auto-rebuild)
npm run build:watch

# Type-check only
npm run type-check
```

### Making Changes

1. Edit TypeScript files in `*/src/`
2. Run `npm run build`
3. Test in browser by opening `index.html`
4. Commit only TypeScript source files (`.ts`)

### Adding New Features

1. Update type definitions in `types/index.ts` if needed
2. Implement feature in appropriate module
3. Update tool configuration if needed
4. Build and test

## 📖 Documentation

- [**Quick Start Guide**](TYPESCRIPT_QUICK_START.md) - Get started with TypeScript
- [**Shared Code Refactoring**](SHARED_CODE_REFACTORING.md) - How code duplication was eliminated
- [**TypeScript Guide**](docs/TYPESCRIPT_GUIDE.md) - Comprehensive TypeScript integration guide
- [**Project Structure**](docs/PROJECT_STRUCTURE.md) - Detailed architecture overview
- [**Refactoring Summary**](docs/REFACTORING_SUMMARY.md) - Migration from monolithic to modular
- [**Completion Summary**](docs/TYPESCRIPT_COMPLETION_SUMMARY.md) - What was accomplished

## 🏗️ Architecture

### Modular Design

- **Core modules:** State management, error handling, data matching
- **Parsers:** CSV and XLSX file parsing
- **Generators:** CSV file generation with proper formatting
- **UI components:** Reusable file upload cards
- **Configuration:** Tool-specific settings and validation

### Shared Library (`shared/src/`)

4 modules imported by both tools (eliminating code duplication):

- `core/errors.ts` - Custom error classes with user-friendly messages
- `core/AppState.ts` - State management with observer pattern
- `ui/FileUploadCard.ts` - Drag-and-drop file upload component
- `utils/Logger.ts` - Logging utility with multiple log levels

**Benefits:** Zero code duplication, single source of truth, easier maintenance

### Type Safety

- 120 lines of shared type definitions
- Strict TypeScript mode enabled
- Full IDE autocomplete support

## 🎯 Features

### Common Features

- ✅ Drag-and-drop file upload
- ✅ Real-time file validation
- ✅ Progress logging
- ✅ Detailed error messages
- ✅ Missing student tracking
- ✅ Statistics dashboard

### Class Distribution Specific

- ✅ Class tag filtering (substring match, case-insensitive)
- ✅ Year group mode (separate CSVs per year)
- ✅ XLSX file support
- ✅ Multiple file export

### House Teams Specific

- ✅ Automatic house/year grouping
- ✅ Save to folder (File System Access API)
- ✅ CSV-only workflow
- ✅ Bulk file export

## 📝 Output Format

All tools generate CSVs in the Entra ID bulk import format:

```csv
version:v1.0
Member object ID or user principal name [memberObjectIdOrUpn] Required
Example: 9832aad8-e4fe-496b-a604-95c6ef01ae75
<entra-id-1>
<entra-id-2>
<entra-id-3>
...
```

## 🔍 Browser Compatibility

- **Chrome/Edge:** ✅ Full support (recommended)
- **Firefox:** ✅ Full support
- **Safari:** ⚠️ Limited (no File System Access API for house-teams)

## 🤝 Contributing

This is a school internal tool. For changes:

1. Create a feature branch
2. Make changes to TypeScript files
3. Build and test thoroughly
4. Create pull request with clear description

## 📜 License

Internal use only - Harrow School

## 🆘 Support

For issues or questions:

- Check the documentation in `docs/`
- Review the tool-specific README files
- Contact the development team

---

**Version:** 2.0.0 (TypeScript)
**Last Updated:** January 2025
**Status:** ✅ Production Ready
