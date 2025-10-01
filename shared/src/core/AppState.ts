import type { AppFiles, AppConfig, StateListener } from '../../../types/index.js';

/**
 * Central state management for the application
 * Implements observer pattern for reactive updates
 */
export class AppState {
  public files: AppFiles;
  public results: any | null;
  public config: AppConfig;
  private listeners: StateListener[];

  constructor() {
    this.files = {
      studentEmails: null,
      studentClassList: null,
      entraAd: null
    };

    this.results = null;

    this.config = {
      classTagFilters: [],
      yeargroupMode: false
    };

    this.listeners = [];
  }

  /**
   * Set a file in the state
   */
  setFile(key: string, file: File | null): void {
    if (!this.files.hasOwnProperty(key)) {
      throw new Error(`Invalid file key: ${key}`);
    }

    this.files[key] = file;
    this.notify('fileChanged', { key, file });
  }

  /**
   * Get a file from the state
   */
  getFile(key: string): File | null {
    return this.files[key];
  }

  /**
   * Check if all required files are loaded
   */
  hasAllFiles(): boolean {
    return Object.values(this.files).every(file => file !== null);
  }

  /**
   * Set configuration option
   */
  setConfig(key: string, value: any): void {
    if (!this.config.hasOwnProperty(key)) {
      throw new Error(`Invalid config key: ${key}`);
    }

    this.config[key] = value;
    this.notify('configChanged', { key, value });
  }

  /**
   * Get configuration value
   */
  getConfig(key: string): any {
    return this.config[key];
  }

  /**
   * Set processing results
   */
  setResults(results: any): void {
    this.results = results;
    this.notify('resultsChanged', { results });
  }

  /**
   * Get processing results
   */
  getResults(): any | null {
    return this.results;
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.files = {
      studentEmails: null,
      studentClassList: null,
      entraAd: null
    };
    this.results = null;
    this.config.classTagFilters = [];
    this.config.yeargroupMode = false;
    this.notify('cleared', {});
  }

  /**
   * Subscribe to state changes
   * Returns an unsubscribe function
   */
  subscribe(event: string, callback: (data: any, event?: string) => void): () => void {
    const listener: StateListener = { event, callback };
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of an event
   */
  notify(event: string, data: any): void {
    this.listeners
      .filter(l => l.event === event || l.event === '*')
      .forEach(l => {
        try {
          l.callback(data, event);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
  }

  /**
   * Get current state snapshot
   */
  getSnapshot(): { files: AppFiles; config: AppConfig; results: any | null } {
    return {
      files: { ...this.files },
      config: { ...this.config },
      results: this.results ? { ...this.results } : null
    };
  }
}
