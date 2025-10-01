import type { FileConfig } from '../../../types/index.js';

/**
 * File change callback type
 */
type FileChangeCallback = (fileId: string, file: File | null) => void;

/**
 * File upload card component with drag-and-drop support and validation
 */
export class FileUploadCard {
  private config: FileConfig;
  private file: File | null;
  private onFileChange: FileChangeCallback | null;
  private element: HTMLElement;

  constructor(config: FileConfig, onFileChange: FileChangeCallback | null = null) {
    this.config = config;
    this.file = null;
    this.onFileChange = onFileChange;
    this.element = this.render();
    this.setupEventListeners();
  }

  /**
   * Render the upload card HTML
   */
  private render(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'upload-card';
    card.innerHTML = `
      <div class="upload-card__meta">
        <div class="upload-card__header">
          <img src="${this.config.icon}" alt="${this.config.label}" class="upload-card__icon">
          <h3>${this.config.label}</h3>
        </div>
      </div>
      <p class="upload-card__description hint">${this.config.description}</p>
      <label class="file-picker" for="${this.config.id}">
        <span class="file-picker__title">Select or drop file</span>
        <span class="file-picker__formats">${this.config.format}</span>
        <input
          id="${this.config.id}"
          type="file"
          accept="${this.config.accept}"
        />
      </label>
      <div class="validation-feedback"></div>
    `;
    return card;
  }

  /**
   * Set up event listeners for file selection and drag-and-drop
   */
  private setupEventListeners(): void {
    const input = this.element.querySelector('input') as HTMLInputElement;
    const picker = this.element.querySelector('.file-picker') as HTMLElement;

    // File selection
    input.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const selectedFile = target.files?.[0] || null;
      await this.handleFileChange(selectedFile);
    });

    // Drag and drop
    picker.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      picker.classList.add('drag-over');
    });

    picker.addEventListener('dragleave', () => {
      picker.classList.remove('drag-over');
    });

    picker.addEventListener('drop', async (e: DragEvent) => {
      e.preventDefault();
      picker.classList.remove('drag-over');

      const droppedFile = e.dataTransfer?.files?.[0] || null;

      // Update the input element
      if (droppedFile) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        input.files = dataTransfer.files;
      }

      await this.handleFileChange(droppedFile);
    });
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(file: File | null): Promise<void> {
    this.file = file;

    if (file) {
      await this.validateFile();
    } else {
      this.clearValidation();
    }

    this.updateUI();

    // Notify parent
    if (this.onFileChange) {
      this.onFileChange(this.config.id, file);
    }
  }

  /**
   * Validate the selected file
   */
  private async validateFile(): Promise<void> {
    if (!this.file) return;

    const feedback = this.element.querySelector('.validation-feedback') as HTMLElement;

    try {
      if (this.config.validator) {
        await this.config.validator(this.file);
      }

      feedback.innerHTML = '✓ Valid format';
      feedback.className = 'validation-feedback success';
      feedback.style.display = 'block';
    } catch (error: any) {
      const message = error.userMessage || error.message;
      feedback.innerHTML = `⚠️ ${message}`;
      feedback.className = 'validation-feedback error';
      feedback.style.display = 'block';
    }
  }

  /**
   * Clear validation feedback
   */
  private clearValidation(): void {
    const feedback = this.element.querySelector('.validation-feedback') as HTMLElement;
    feedback.innerHTML = '';
    feedback.style.display = 'none';
  }

  /**
   * Update UI to reflect current file state
   */
  private updateUI(): void {
    const picker = this.element.querySelector('.file-picker') as HTMLElement;
    const title = picker.querySelector('.file-picker__title') as HTMLElement;

    if (this.file) {
      title.textContent = this.file.name;
      title.style.color = 'var(--good)';
      picker.style.borderColor = 'var(--good)';
      picker.style.background = 'rgba(76, 217, 100, 0.1)';
      picker.classList.add('has-file');
    } else {
      title.textContent = 'Select or drop file';
      title.style.color = '';
      picker.style.borderColor = '';
      picker.style.background = '';
      picker.classList.remove('has-file');
    }
  }

  /**
   * Get the current file
   */
  getFile(): File | null {
    return this.file;
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Reset the card
   */
  reset(): void {
    this.file = null;
    const input = this.element.querySelector('input') as HTMLInputElement;
    input.value = '';
    this.clearValidation();
    this.updateUI();
  }
}
