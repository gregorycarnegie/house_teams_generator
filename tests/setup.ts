/**
 * Vitest setup file
 * Runs before all tests
 */

import { beforeAll, afterEach, afterAll } from 'vitest';

// Global setup
beforeAll(() => {
  // Mock window.XLSX for SheetJS
  if (typeof window !== 'undefined') {
    (window as any).XLSX = {
      read: () => ({ SheetNames: [], Sheets: {} }),
      utils: {
        sheet_to_json: () => [],
      },
    };
  }
});

// Clean up after each test
afterEach(() => {
  // Clear any mocks or timers
});

// Global teardown
afterAll(() => {
  // Clean up resources
});
