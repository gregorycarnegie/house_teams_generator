import { AppState } from '../../shared/src/core/AppState.js';
import { Logger } from '../../shared/src/utils/Logger.js';
import { FileUploadCard } from '../../shared/src/ui/FileUploadCard.js';
import { ClassDistributionGenerator } from './generators/ClassDistributionGenerator.js';
import { TOOLS } from './config/tools.js';
import type { ClassDistributionProcessingResult, GeneratedFile } from '../../types/index.js';

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

  constructor() {
    this.state = new AppState();
    this.logger = new Logger('info');
    this.generator = new ClassDistributionGenerator(this.logger);
    this.fileCards = new Map();
    this.toolConfig = TOOLS.classDistribution;
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
    const container = document.querySelector('.grid.inputs') as HTMLElement;
    if (!container) {
      console.error('File upload container not found');
      return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Create file cards from config
    for (const fileConfig of this.toolConfig.files) {
      const card = new FileUploadCard(fileConfig, (fileId: string, file: File | null) => {
        this.state.setFile(fileId, file);
      });

      this.fileCards.set(fileConfig.id, card);
      container.appendChild(card.getElement());
    }
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
   * Set up state listeners for reactive updates
   */
  private setupStateListeners(): void {
    // Listen for file changes
    this.state.subscribe('fileChanged', () => {
      this.updateGenerateButton();
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
    const hasTags = tagsInput && tagsInput.trim().length > 0;

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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new ClassDistributionApp();
    app.init();
  });
} else {
  const app = new ClassDistributionApp();
  app.init();
}
