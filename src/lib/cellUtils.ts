/**
 * Cell utility helpers.
 *
 * Helpers for cell key generation, column/row parsing,
 * keyboard navigation, and display value resolution.
 */

import type { CellData } from '@/types';
import { isFormula } from './formulaEngine';

/** Number of default columns to render */
export const DEFAULT_COLS = 26;

/** Number of default rows to render */
export const DEFAULT_ROWS = 100;

/** Get the display value for a cell (what the user sees) */
export function getDisplayValue(cell: CellData | undefined): string {
    if (!cell) return '';
    if (cell.computedValue !== undefined) {
        return String(cell.computedValue);
    }
    return cell.value;
}

/** Get the edit value for a cell (what shows when editing) */
export function getEditValue(cell: CellData | undefined): string {
    if (!cell) return '';
    if (cell.formula) return cell.formula;
    return cell.value;
}

/** Determine if a string value is numeric */
export function isNumeric(value: string): boolean {
    if (value === '') return false;
    return !isNaN(parseFloat(value)) && isFinite(Number(value));
}

/** Format a cell reference for display: col "A", row 1 → "A1" */
export function formatCellRef(col: string, row: number): string {
    return `${col}${row}`;
}

/** Parse a cell reference string like "A1" → { col: "A", row: 1 } */
export function parseCellRef(ref: string): { col: string; row: number } | null {
    const match = ref.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) return null;
    return { col: match[1].toUpperCase(), row: parseInt(match[2], 10) };
}

/** Build a CellData object from a raw input value */
export function buildCellData(value: string, userId?: string): CellData {
    const data: CellData = { value };

    if (isFormula(value)) {
        data.formula = value;
    }

    if (userId) {
        data.updatedBy = userId;
    }

    return data;
}

/** Generate an array of column letters for the grid */
export function generateColumnHeaders(count: number): string[] {
    const cols: string[] = [];
    for (let i = 0; i < count; i++) {
        let col = '';
        let n = i + 1;
        while (n > 0) {
            n--;
            col = String.fromCharCode(65 + (n % 26)) + col;
            n = Math.floor(n / 26);
        }
        cols.push(col);
    }
    return cols;
}

/** Generate an array of row numbers */
export function generateRowNumbers(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i + 1);
}
