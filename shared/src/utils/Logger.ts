import type { LogLevel, LogEntry } from '../../../types/index.js';

/**
 * Logger utility for application-wide logging and debugging
 */
export class Logger {
  private level: LogLevel;
  private logs: LogEntry[];
  private container: HTMLElement | null;

  constructor(level: LogLevel = 'info') {
    this.level = level;
    this.logs = [];
    this.container = null;
  }

  /**
   * Set DOM container for displaying logs
   */
  setContainer(container: HTMLElement | string): void {
    if (typeof container === 'string') {
      this.container = document.getElementById(container);
    } else {
      this.container = container;
    }
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, data: any = null): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data: any = null): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data: any = null): void {
    this.log('warning', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error: Error | any = null): void {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;

    this.log('error', message, errorData);
  }

  /**
   * Log a success message
   */
  success(message: string, data: any = null): void {
    this.log('success', message, data);
  }

  /**
   * Core logging method
   */
  log(level: LogLevel, message: string, data: any = null): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.push(entry);

    // Console output
    if (this.shouldLog(level)) {
      const consoleMethod = level === 'warning' ? 'warn' : level;
      if (data !== null) {
        (console as any)[consoleMethod](message, data);
      } else {
        (console as any)[consoleMethod](message);
      }
    }

    // DOM output
    if (this.container) {
      this.appendToDOM(level, message);
    }
  }

  /**
   * Append log entry to DOM
   */
  private appendToDOM(level: LogLevel, message: string): void {
    if (!this.container) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    entry.textContent = message;
    this.container.appendChild(entry);

    // Auto-scroll to bottom
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warning', 'error', 'success'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    // Always show success and error
    if (level === 'success' || level === 'error') {
      return true;
    }

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    const validLevels: LogLevel[] = ['debug', 'info', 'warning', 'error'];
    if (validLevels.includes(level)) {
      this.level = level;
    }
  }
}
