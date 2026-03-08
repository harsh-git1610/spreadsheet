/**
 * Export utilities for spreadsheet data.
 * Supports CSV and JSON export of cell data.
 */

import type { CellMap } from '@/types';
import { parseCellKey } from './formulaEngine';
import { getDisplayValue, generateColumnHeaders } from './cellUtils';

/** Export cells as CSV string */
export function exportToCSV(cells: CellMap, maxCol: number = 26, maxRow: number = 100): string {
    const headers = generateColumnHeaders(maxCol);
    const rows: string[] = [];

    // Header row
    rows.push(['', ...headers].join(','));

    // Data rows
    for (let r = 1; r <= maxRow; r++) {
        const row: string[] = [String(r)];
        let hasData = false;
        for (const col of headers) {
            const key = `${col}-${r}`;
            const cell = cells[key];
            const val = getDisplayValue(cell);
            if (val) hasData = true;
            // Escape commas and quotes in CSV values
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                row.push(`"${val.replace(/"/g, '""')}"`);
            } else {
                row.push(val);
            }
        }
        if (hasData) rows.push(row.join(','));
    }

    return rows.join('\n');
}

/** Export cells as JSON */
export function exportToJSON(cells: CellMap): string {
    const structured: Record<string, Record<string, string>> = {};

    for (const [key, cell] of Object.entries(cells)) {
        const parsed = parseCellKey(key);
        if (!parsed) continue;
        const rowKey = `row_${parsed.row}`;
        if (!structured[rowKey]) structured[rowKey] = {};
        structured[rowKey][parsed.col] = getDisplayValue(cell);
    }

    return JSON.stringify(structured, null, 2);
}

/** Trigger a file download in the browser */
export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
