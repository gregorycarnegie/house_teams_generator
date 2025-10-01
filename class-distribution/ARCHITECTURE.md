# Architecture Documentation

## Module Dependency Graph

```text
main.js (Entry Point)
    │
    ├── AppState.js (State Management)
    │   └── Observer Pattern for reactive updates
    │
    ├── Logger.js (Logging Utility)
    │   └── Console + DOM output
    │
    ├── FileUploadCard.js (UI Component)
    │   ├── config/tools.js (Configuration)
    │   └── parsers/SpreadsheetParser.js (Validation)
    │       └── errors.js (Custom Errors)
    │
    └── ClassDistributionGenerator.js (Business Logic)
        ├── parsers/SpreadsheetParser.js
        │   └── errors.js
        ├── core/DataMatcher.js
        │   ├── errors.js
        │   └── Logger.js
        └── Logger.js
```

## Data Flow

```text
1. User Action (File Upload/Config Change)
   ↓
2. FileUploadCard / Input Handler
   ↓
3. AppState.setFile() / AppState.setConfig()
   ↓
4. State.notify() → Observers
   ↓
5. UI Updates (Button state, validation feedback)

---

6. User Clicks Generate
   ↓
7. ClassDistributionGenerator.process()
   ↓
8. SpreadsheetParser.parseXLSX/CSV()
   ↓
9. DataMatcher.matchStudents()
   ↓
10. DataMatcher.filterByClassTags()
    ↓
11. ClassDistributionGenerator.generateCSVs()
    ↓
12. AppState.setResults()
    ↓
13. UI Renders Results
```

## Class Responsibilities

### Core Layer

#### **AppState.js**

- Centralized state management
- Observer pattern implementation
- File, config, and results storage
- Event notification system

**Public API:**

- `setFile(key, file)` - Store a file
- `setConfig(key, value)` - Update configuration
- `setResults(results)` - Store processing results
- `subscribe(event, callback)` - Subscribe to state changes
- `hasAllFiles()` - Check if all required files are loaded

---

#### **DataMatcher.js**

- Student data matching logic
- Cross-referencing between data sources
- Tag filtering
- Year group grouping

**Public API:**

- `buildEntraLookup()` - Create email → Entra ID map
- `buildStudentLookup()` - Create admission # → student map
- `matchStudents()` - Match data from all sources
- `filterByClassTags(students, tags)` - Filter by class tags
- `groupByYearGroup(students)` - Group students by year

**Static Methods:**

- `parseClassTags(input)` - Parse tag input string

---

#### **errors.js**

- Custom error types
- User-friendly error messages
- Error context storage

**Exported Classes:**

- `FileValidationError` - File parsing/validation errors
- `DataMatchingError` - Data matching errors
- `ExportError` - CSV generation errors

---

### Parsers Layer

#### **SpreadsheetParser.js**

- CSV and XLSX file parsing
- Header extraction and validation
- Data normalization

**Public API:**

- `static parseCSV(file, requiredHeaders)` - Parse CSV files
- `static parseXLSX(file, headerRow)` - Parse XLSX files
- `static validateHeaders(headerIndex, required, file)` - Validate headers
- `static normalizeSpreadsheetData(data, headerRow, file)` - Normalize data

---

### Generators Layer

#### **ClassDistributionGenerator.js**

- Main processing orchestration
- CSV file generation
- Results compilation

**Public API:**

- `process(files, options)` - Main processing method
- `generateCSVs(students, tags, mode, matcher)` - Generate CSV files
- `sanitizeName(name)` - Sanitize filenames

---

### UI Layer

#### **FileUploadCard.js**

- File input component
- Drag-and-drop support
- Real-time validation
- Visual feedback

**Public API:**

- `constructor(config, onFileChange)` - Initialize with config
- `getFile()` - Get selected file
- `getElement()` - Get DOM element
- `reset()` - Reset the card

**Internal Methods:**

- `render()` - Generate HTML
- `setupEventListeners()` - Set up events
- `validateFile()` - Validate selected file
- `updateUI()` - Update visual state

---

### Config Layer

#### **tools.js**

- Tool configuration
- File specifications
- Validation rules

**Exports:**

- `TOOLS` - Configuration object
- `getToolConfig(toolId)` - Get tool config
- `getFileConfig(toolId, fileId)` - Get file config

---

### Utils Layer

#### **Logger.js**

- Application-wide logging
- Multiple log levels
- Console + DOM output
- Log export functionality

**Public API:**

- `setContainer(container)` - Set DOM container
- `clear()` - Clear all logs
- `debug(message, data)` - Log debug message
- `info(message, data)` - Log info message
- `warn(message, data)` - Log warning message
- `error(message, error)` - Log error message
- `success(message, data)` - Log success message
- `exportLogs()` - Export logs as JSON

---

### Main Application

#### **main.js**

- Application initialization
- Event coordination
- UI orchestration
- Results rendering

**ClassDistributionApp Methods:**

- `init()` - Initialize application
- `loadSheetJS()` - Load dependencies
- `setupFileCards()` - Create file upload UI
- `setupControls()` - Wire up inputs/buttons
- `setupStateListeners()` - Subscribe to state changes
- `handleGenerate()` - Process files on generate
- `renderResults(results)` - Display results

---

## Design Patterns Used

### 1. **Observer Pattern**

- **Where**: `AppState.js`
- **Why**: Reactive UI updates when state changes
- **Benefit**: Decouples state management from UI logic

### 2. **Component Pattern**

- **Where**: `FileUploadCard.js`
- **Why**: Reusable, self-contained UI components
- **Benefit**: Easy to test and maintain

### 3. **Static Factory Methods**

- **Where**: `SpreadsheetParser.js`
- **Why**: Parsing doesn't require instance state
- **Benefit**: Simple API, no unnecessary instantiation

### 4. **Dependency Injection**

- **Where**: `ClassDistributionGenerator`, `DataMatcher`
- **Why**: Logger is injected, not hardcoded
- **Benefit**: Better testability, optional logging

### 5. **Configuration-Driven**

- **Where**: `config/tools.js`
- **Why**: UI generated from configuration
- **Benefit**: Easy to add new tools/files

---

## Error Handling Strategy

```text
User Action
    ↓
Try-Catch Block
    ↓
Custom Error (FileValidationError, etc.)
    ↓
Logger.error()
    ↓
UI Feedback (status message, validation feedback)
```

### Error Flow

1. Operation throws custom error with context
2. Error caught in main.js or component
3. Logger receives error with full context
4. User sees friendly message + suggestions
5. Developer sees full error in console

---

## Testing Strategy

### Unit Tests (Future)

- Test each class in isolation
- Mock dependencies (Logger, AppState)
- Test error conditions

### Integration Tests (Future)

- Test full processing flow
- Use mock files
- Verify output format

### Manual Testing

1. Upload valid files → Should process successfully
2. Upload invalid files → Should show validation errors
3. Missing files → Should disable generate button
4. Empty tags → Should disable generate button
5. No matching students → Should show warning

---

## Performance Considerations

### Current

- All processing happens in main thread
- Files processed sequentially
- Results rendered synchronously

### Future Improvements

- **Web Workers**: Move heavy processing off main thread
- **Streaming**: Process large files in chunks
- **Virtual Scrolling**: For large result sets
- **Lazy Loading**: Load modules on demand

---

## Browser Compatibility

**Requirements:**

- ES6 Modules support
- FileReader API
- Drag and Drop API
- Blob/URL.createObjectURL

**Supported Browsers:**

- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

---

## Security Considerations

1. **CSP**: Content Security Policy in HTML
2. **Local Processing**: No data sent to server
3. **Input Validation**: All files validated before processing
4. **Sanitization**: Filenames sanitized before download
5. **No eval()**: No dynamic code execution

---

## Extending the Application

### Adding a New File Type

1. Add to `config/tools.js`:

    ```javascript
    {
    id: 'newFile',
    label: 'New File',
    format: 'CSV',
    requiredHeaders: ['col1', 'col2'],
    validator: (file) => validateCSV(file)
    }
    ```

2. Update `AppState` files object:

    ```javascript
    this.files = {
    studentEmails: null,
    studentClassList: null,
    entraAd: null,
    newFile: null  // Add here
    };
    ```

3. Update `DataMatcher` or `ClassDistributionGenerator` to use new file

### Adding a New Tool

1. Create new generator in `src/generators/`
2. Add configuration to `config/tools.js`
3. Create new HTML page
4. Import and initialize in new main.js

---

## File Size & Load Time

**Total Size:**

- `main.js`: ~7KB
- `AppState.js`: ~4KB
- `DataMatcher.js`: ~7KB
- `SpreadsheetParser.js`: ~6KB
- `ClassDistributionGenerator.js`: ~5KB
- `FileUploadCard.js`: ~5KB
- `Logger.js`: ~4KB
- `errors.js`: ~1KB
- `tools.js`: ~2KB
- **Total**: ~41KB (unminified)

**External Dependencies:**

- SheetJS (xlsx): ~700KB (CDN)

**Load Time:**

- First load: < 1s (on fast connection)
- Subsequent loads: < 100ms (browser cache)
