import type { ParsedSpreadsheetData } from '../../../types/index.js';

export interface PreviewData {
  fileName: string;
  headers: string[];
  rows: any[][];
  totalRows: number;
  previewRowCount: number;
}

/**
 * Utility for generating data previews from parsed spreadsheets
 */
export class DataPreview {
  /**
   * Generate a preview of parsed spreadsheet data
   * @param data Parsed spreadsheet data
   * @param fileName Name of the file
   * @param maxRows Maximum number of rows to preview (default: 5)
   */
  static generatePreview(
    data: ParsedSpreadsheetData,
    fileName: string,
    maxRows: number = 5
  ): PreviewData {
    const previewRows = data.rows.slice(0, maxRows);

    return {
      fileName,
      headers: data.headers,
      rows: previewRows,
      totalRows: data.rows.length,
      previewRowCount: previewRows.length
    };
  }

  /**
   * Generate HTML table representation of preview data
   */
  static generateTableHTML(preview: PreviewData): string {
    let html = '<div class="preview-container">';
    html += `<div class="preview-header">`;
    html += `<strong>${preview.fileName}</strong> - `;
    html += `Showing ${preview.previewRowCount} of ${preview.totalRows} rows`;
    html += `</div>`;

    html += '<div class="preview-table-wrapper">';
    html += '<table class="preview-table">';

    // Headers
    html += '<thead><tr>';
    for (const header of preview.headers) {
      html += `<th>${this.escapeHtml(header)}</th>`;
    }
    html += '</tr></thead>';

    // Rows
    html += '<tbody>';
    for (const row of preview.rows) {
      html += '<tr>';
      for (let i = 0; i < preview.headers.length; i++) {
        const value = row[i] !== undefined && row[i] !== null ? row[i] : '';
        html += `<td>${this.escapeHtml(String(value))}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    html += '</table>';
    html += '</div>'; // preview-table-wrapper
    html += '</div>'; // preview-container

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Generate a summary of the data
   */
  static generateSummary(previews: PreviewData[]): string {
    let summary = '<div class="preview-summary">';
    summary += '<h3>Data Summary</h3>';

    for (const preview of previews) {
      summary += '<div class="summary-item">';
      summary += `<strong>${preview.fileName}:</strong> `;
      summary += `${preview.totalRows} rows, ${preview.headers.length} columns`;
      summary += '</div>';
    }

    summary += '</div>';
    return summary;
  }
}
