import { AppState } from '../../shared/src/core/AppState.js';
import { Logger } from '../../shared/src/utils/Logger.js';
import { FileUploadCard } from '../../shared/src/ui/FileUploadCard.js';
import { HouseTeamsGenerator } from './generators/HouseTeamsGenerator.js';
import { TOOLS } from './config/tools.js';
import type { HouseTeamsProcessingResult, GeneratedFile } from '../../types/index.js';

// Extend Window interface for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

/**
 * Main application class
 */
class HouseTeamsApp {
  private state: AppState;
  private logger: Logger;
  private generator: HouseTeamsGenerator;
  private fileCards: Map<string, FileUploadCard>;
  private toolConfig: typeof TOOLS.houseTeams;

  constructor() {
    this.state = new AppState();
    this.logger = new Logger('info');
    this.generator = new HouseTeamsGenerator(this.logger);
    this.fileCards = new Map();
    this.toolConfig = TOOLS.houseTeams;

    // Adjust state to match house-teams files
    this.state.files = {
      bromcom: null,
      entra: null
    };
    this.state.config = {
      saveMode: 'folder'
    };
  }

  /**
   * Initialize the application
   */
  init(): void {
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
    // Save mode dropdown
    const saveModeSelect = document.getElementById('saveMode') as HTMLSelectElement;
    if (saveModeSelect) {
      saveModeSelect.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        this.state.setConfig('saveMode', target.value);
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

    const generateBtn = document.getElementById('generate') as HTMLButtonElement;
    const statusText = document.getElementById('status') as HTMLElement;

    if (generateBtn) {
      generateBtn.disabled = !hasAllFiles;
    }

    if (statusText) {
      if (!hasAllFiles) {
        statusText.textContent = 'Select both files to enable.';
      } else {
        statusText.textContent = 'Ready to generate.';
      }
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

    try {
      const files = {
        bromcom: this.state.getFile('bromcom')!,
        entra: this.state.getFile('entra')!
      };

      const options = {
        saveMode: this.state.getConfig('saveMode') as 'folder' | 'downloads'
      };

      const results = await this.generator.process(files, options);
      this.state.setResults(results);

      // Handle save mode
      if (options.saveMode === 'folder' && typeof window.showDirectoryPicker === 'function') {
        if (statusText) {
          statusText.textContent = 'Select a folder to save files...';
        }

        const saveResult = await this.generator.saveToFolder(results.files);

        if (statusText) {
          if (saveResult.success) {
            statusText.textContent = `✓ Saved ${saveResult.count} CSV files to selected folder.`;
          } else if (saveResult.cancelled) {
            statusText.textContent = 'Folder selection cancelled. Click CSV links below to download individually.';
          }
        }
      } else {
        if (statusText) {
          statusText.textContent = `Generated ${results.files.length} CSV file(s). Click links below to download.`;
        }
      }

    } catch (error: any) {
      console.error('Processing error:', error);

      if (statusText) {
        const message = error.userMessage || error.message;
        statusText.textContent = `Error: ${message}`;
      }
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
  private renderResults(results: HouseTeamsProcessingResult): void {
    const resultsSection = document.getElementById('results') as HTMLElement;
    if (resultsSection) {
      resultsSection.classList.remove('hidden');
    }

    // Update stats
    this.updateStat('statProcessed', results.processed);
    this.updateStat('statMatched', results.matched);
    this.updateStat('statMissing', results.missing);
    this.updateStat('statGroups', results.groups.size);
    this.updateStat('statCsvs', results.files.length);

    // Render CSV list
    this.renderCSVList(results.files);

    // Render missing matches table
    this.renderMissingMatches(results.missingDetails);
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
      csvList.innerHTML = '<span class="hint">No CSV files generated.</span>';
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
      link.innerHTML = `<span class="pill">CSV</span> <code>${file.name}</code> <span class="hint">(${file.count} IDs)</span>`;

      csvList.appendChild(link);

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  /**
   * Render missing matches table
   */
  private renderMissingMatches(missingDetails: any[]): void {
    const tbody = document.getElementById('missingTbody') as HTMLTableSectionElement;
    if (!tbody) return;

    tbody.innerHTML = '';

    if (missingDetails.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="hint">No missing matches - all students processed successfully!</td></tr>';
      return;
    }

    missingDetails.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${item.email || 'N/A'}</td>
        <td>${item.reason}</td>
        <td>${item.house || 'N/A'} / ${item.year || 'N/A'}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new HouseTeamsApp();
    app.init();
  });
} else {
  const app = new HouseTeamsApp();
  app.init();
}
