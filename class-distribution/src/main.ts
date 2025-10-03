import { AppState } from '../../shared/src/core/AppState.js';
import { Logger } from '../../shared/src/utils/Logger.js';
import { FileUploadCard } from '../../shared/src/ui/FileUploadCard.js';
import { ClassDistributionGenerator } from './generators/ClassDistributionGenerator.js';
import { SpreadsheetParser } from './parsers/SpreadsheetParser.js';
import { DataPreview } from '../../shared/src/utils/DataPreview.js';
import { TOOLS } from './config/tools.js';
import type { ClassDistributionProcessingResult, GeneratedFile } from '../../types/index.js';
import type { PreviewData } from '../../shared/src/utils/DataPreview.js';

// Declare global types
declare global {
  interface Window {
    XLSX: any;
  }
}

/**
 * Main application class
 */
class ClassDistributionApp {
  private state: AppState;
  private logger: Logger;
  private generator: ClassDistributionGenerator;
  private fileCards: Map<string, FileUploadCard>;
  private toolConfig: typeof TOOLS.classDistribution;
  private previews: Map<string, PreviewData>;

  constructor() {
    this.state = new AppState();
    this.logger = new Logger('info');
    this.generator = new ClassDistributionGenerator(this.logger);
    this.fileCards = new Map();
    this.toolConfig = TOOLS.classDistribution;
    this.previews = new Map();
  }

  /**
   * Initialize the application
   */
  async init(): Promise<void> {
    // Load SheetJS library
    try {
      await this.loadSheetJS();
      this.logger.info('SheetJS library loaded');
    } catch (error) {
      this.logger.error('Failed to load required libraries', error);
      this.disableGeneration('Failed to load required libraries. Please refresh the page.');
      return;
    }

    // Set up logger container
    this.logger.setContainer('processingLog');

    // Set up file upload cards
    this.setupFileCards();

    // Set up controls
    this.setupControls();

    // Set up preview button
    this.setupPreviewButton();

    // Set up state listeners
    this.setupStateListeners();

    // Initial UI update
    this.updateGenerateButton();
  }

  /**
   * Load SheetJS library dynamically
   */
  private loadSheetJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load SheetJS library'));
      document.head.appendChild(script);
    });
  }

  /**
   * Set up file upload cards
   */
  private setupFileCards(): void {
    console.log('Setting up file cards...');
    console.log('Tool config:', this.toolConfig);

    const container = document.querySelector('.grid.inputs') as HTMLElement;
    console.log('Container found:', container);

    if (!container) {
      console.error('File upload container not found');
      return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Create file cards from config
    console.log('Creating', this.toolConfig.files.length, 'file cards');
    for (const fileConfig of this.toolConfig.files) {
      console.log('Creating card for:', fileConfig.id);
      const card = new FileUploadCard(fileConfig, (fileId: string, file: File | null) => {
        this.state.setFile(fileId, file);
      });

      this.fileCards.set(fileConfig.id, card);
      const cardElement = card.getElement();
      console.log('Card element:', cardElement);
      container.appendChild(cardElement);
    }
    console.log('File cards setup complete');
  }

  /**
   * Set up controls (inputs, buttons)
   */
  private setupControls(): void {
    // Class tag filters
    const tagsInput = document.getElementById('classTagFilters') as HTMLTextAreaElement;
    if (tagsInput) {
      tagsInput.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        this.state.setConfig('classTagFilters', target.value);
      });
    }

    // Yeargroup mode checkbox
    const yeargroupCheckbox = document.getElementById('yeargroupMode') as HTMLInputElement;
    if (yeargroupCheckbox) {
      yeargroupCheckbox.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.state.setConfig('yeargroupMode', target.checked);
      });
    }

    // Generate button
    const generateBtn = document.getElementById('generate') as HTMLButtonElement;
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.handleGenerate());
    }
  }

  /**
   * Set up preview button
   */
  private setupPreviewButton(): void {
    const previewBtn = document.getElementById('previewData') as HTMLButtonElement;
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.handlePreview());
    }
  }

  /**
   * Set up state listeners for reactive updates
   */
  private setupStateListeners(): void {
    // Listen for file changes
    this.state.subscribe('fileChanged', () => {
      this.updateGenerateButton();
      this.updatePreviewButton();
    });

    // Listen for config changes
    this.state.subscribe('configChanged', () => {
      this.updateGenerateButton();
    });

    // Listen for results
    this.state.subscribe('resultsChanged', ({ results }: any) => {
      this.renderResults(results);
    });
  }

  /**
   * Update generate button state
   */
  private updateGenerateButton(): void {
    const hasAllFiles = this.state.hasAllFiles();
    const tagsInput = this.state.getConfig('classTagFilters');
    const hasTags = tagsInput && typeof tagsInput === 'string' && tagsInput.trim().length > 0;

    const canGenerate = hasAllFiles && hasTags;

    const generateBtn = document.getElementById('generate') as HTMLButtonElement;
    const statusText = document.getElementById('status') as HTMLElement;

    if (generateBtn) {
      generateBtn.disabled = !canGenerate;
    }

    if (statusText) {
      if (!hasAllFiles) {
        statusText.textContent = 'Select all three files to continue.';
      } else if (!hasTags) {
        statusText.textContent = 'Enter at least one class tag to filter.';
      } else {
        statusText.textContent = 'Ready to generate distribution groups.';
      }
    }
  }

  /**
   * Disable generation with error message
   */
  private disableGeneration(message: string): void {
    const generateBtn = document.getElementById('generate') as HTMLButtonElement;
    const statusText = document.getElementById('status') as HTMLElement;

    if (generateBtn) {
      generateBtn.disabled = true;
    }

    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * Update preview button state
   */
  private updatePreviewButton(): void {
    const hasAllFiles = this.state.hasAllFiles();
    const previewBtn = document.getElementById('previewData') as HTMLButtonElement;

    if (previewBtn) {
      previewBtn.disabled = !hasAllFiles;
    }
  }

  /**
   * Handle preview button click
   */
  private async handlePreview(): Promise<void> {
    const previewBtn = document.getElementById('previewData') as HTMLButtonElement;
    const previewSection = document.getElementById('dataPreview') as HTMLElement;

    if (previewBtn) {
      previewBtn.disabled = true;
      previewBtn.textContent = 'Loading...';
    }

    try {
      const studentEmailsFile = this.state.getFile('studentEmails');
      const studentClassListFile = this.state.getFile('studentClassList');
      const entraAdFile = this.state.getFile('entraAd');

      const previews: PreviewData[] = [];

      // Parse and preview each file
      if (studentEmailsFile) {
        const { preview } = await SpreadsheetParser.parseAndPreviewXLSX(studentEmailsFile, 1);
        previews.push(preview);
        this.previews.set('studentEmails', preview);
      }

      if (studentClassListFile) {
        const { preview } = await SpreadsheetParser.parseAndPreviewXLSX(studentClassListFile, 2);
        previews.push(preview);
        this.previews.set('studentClassList', preview);
      }

      if (entraAdFile) {
        const { preview } = await SpreadsheetParser.parseAndPreviewCSV(entraAdFile, ['mail', 'id']);
        previews.push(preview);
        this.previews.set('entraAd', preview);
      }

      // Render previews
      this.renderPreviews(previews);

      // Show preview section
      if (previewSection) {
        previewSection.classList.remove('hidden');
      }

      this.logger.info(`Loaded previews for ${previews.length} file(s)`);
    } catch (error: any) {
      console.error('Preview error:', error);
      this.logger.error(`Preview failed: ${error.message}`, error);
    } finally {
      if (previewBtn) {
        previewBtn.disabled = false;
        previewBtn.textContent = 'Preview Data';
      }
    }
  }

  /**
   * Render data previews
   */
  private renderPreviews(previews: PreviewData[]): void {
    const previewContainer = document.getElementById('previewContainer') as HTMLElement;
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    // Add summary
    const summaryHTML = DataPreview.generateSummary(previews);
    const summaryDiv = document.createElement('div');
    summaryDiv.innerHTML = summaryHTML;
    previewContainer.appendChild(summaryDiv);

    // Add each preview table
    for (const preview of previews) {
      const tableHTML = DataPreview.generateTableHTML(preview);
      const tableDiv = document.createElement('div');
      tableDiv.innerHTML = tableHTML;
      previewContainer.appendChild(tableDiv);
    }
  }

  /**
   * Handle generate button click
   */
  private async handleGenerate(): Promise<void> {
    const generateBtn = document.getElementById('generate') as HTMLButtonElement;
    const statusText = document.getElementById('status') as HTMLElement;

    if (generateBtn) {
      generateBtn.disabled = true;
    }

    if (statusText) {
      statusText.textContent = 'Processing files...';
    }

    this.logger.clear();

    try {
      const files = {
        studentEmails: this.state.getFile('studentEmails')!,
        studentClassList: this.state.getFile('studentClassList')!,
        entraAd: this.state.getFile('entraAd')!
      };

      const options = {
        classTagFilters: this.state.getConfig('classTagFilters') as string,
        yeargroupMode: this.state.getConfig('yeargroupMode') as boolean
      };

      const results = await this.generator.process(files, options);
      this.state.setResults(results);

      if (statusText) {
        if (results.files.length === 0) {
          statusText.textContent = 'No CSV files generated (no matching students).';
        } else {
          statusText.textContent = `Generated ${results.files.length} CSV file(s). Click to download.`;
        }
      }
    } catch (error: any) {
      console.error('Processing error:', error);

      if (statusText) {
        statusText.textContent = `Error: ${error.message}`;
      }

      this.logger.error(`Fatal error: ${error.message}`, error);
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
      }
      this.updateGenerateButton();
    }
  }

  /**
   * Render processing results
   */
  private renderResults(results: ClassDistributionProcessingResult): void {
    const resultsSection = document.getElementById('results') as HTMLElement;
    if (resultsSection) {
      resultsSection.classList.remove('hidden');
    }

    // Update stats
    this.updateStat('statTotal', results.totalStudents);
    this.updateStat('statMatched', results.matched);
    this.updateStat('statFiltered', results.filtered);
    this.updateStat('statWithId', results.withId);
    this.updateStat('statFiles', results.files.length);

    // Render CSV list
    this.renderCSVList(results.files);

    // Render year group breakdown
    this.renderYearGroupBreakdown(results.yearGroups);
  }

  /**
   * Update a stat display
   */
  private updateStat(id: string, value: number): void {
    const element = document.getElementById(id) as HTMLElement;
    if (element) {
      element.textContent = value.toString();
    }
  }

  /**
   * Render CSV file list
   */
  private renderCSVList(files: GeneratedFile[]): void {
    const csvList = document.getElementById('csvList') as HTMLElement;
    if (!csvList) return;

    csvList.innerHTML = '';

    if (files.length === 0) {
      const span = document.createElement('span');
      span.textContent = 'No CSV files generated (no matching students).';
      csvList.appendChild(span);
      return;
    }

    // Create download links
    for (const file of files) {
      const blob = new Blob([file.content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.className = 'download-link';
      link.href = url;
      link.download = file.name;
      link.innerHTML = `<span class="pill">CSV</span> <code>${file.name}</code>`;

      const div = document.createElement('div');
      div.appendChild(link);
      csvList.appendChild(div);

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  /**
   * Render year group breakdown table
   */
  private renderYearGroupBreakdown(yearGroups: Map<string, number>): void {
    const tbody = document.getElementById('yearGroupTbody') as HTMLTableSectionElement;
    const hint = document.getElementById('yearGroupHint') as HTMLElement;

    if (!tbody) return;

    tbody.innerHTML = '';

    if (yearGroups.size === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" class="hint">No data</td>';
      tbody.appendChild(tr);

      if (hint) {
        hint.textContent = 'Students per year group';
      }
      return;
    }

    // Sort year groups
    const sortedYears = Array.from(yearGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    for (const [year, count] of sortedYears) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${year}</td>
        <td>${count}</td>
        <td>${count}</td>
      `;
      tbody.appendChild(tr);
    }

    if (hint) {
      hint.textContent = `${yearGroups.size} year groups`;
    }
  }
}

// Initialize app when DOM is ready
console.log('Script loaded, document.readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired, initializing app...');
    const app = new ClassDistributionApp();
    app.init();
  });
} else {
  console.log('DOM already ready, initializing app immediately...');
  const app = new ClassDistributionApp();
  app.init();
}
