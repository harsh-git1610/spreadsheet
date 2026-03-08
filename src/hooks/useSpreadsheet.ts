/**
 * Spreadsheet keyboard navigation and interaction hook.
 *
 * Handles: arrow keys, Enter, Tab, Escape, Delete, and typing to start editing.
 */

'use client';

import { useCallback } from 'react';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import { colToIndex, indexToCol, cellKey } from '@/lib/formulaEngine';
import { DEFAULT_COLS, DEFAULT_ROWS } from '@/lib/cellUtils';

export function useSpreadsheet() {
    const activeCell = useSpreadsheetStore((s) => s.activeCell);
    const editingCell = useSpreadsheetStore((s) => s.editingCell);
    const setActiveCell = useSpreadsheetStore((s) => s.setActiveCell);
    const startEditing = useSpreadsheetStore((s) => s.startEditing);
    const stopEditing = useSpreadsheetStore((s) => s.stopEditing);

    /** Navigate the active cell by delta (e.g., right: dCol=1, dRow=0) */
    const navigate = useCallback(
        (dCol: number, dRow: number) => {
            if (!activeCell) {
                setActiveCell(cellKey('A', 1));
                return;
            }

            const match = activeCell.match(/^([A-Z]+)-(\d+)$/);
            if (!match) return;

            const currentCol = colToIndex(match[1]);
            const currentRow = parseInt(match[2], 10);

            const newCol = Math.max(0, Math.min(DEFAULT_COLS - 1, currentCol + dCol));
            const newRow = Math.max(1, Math.min(DEFAULT_ROWS, currentRow + dRow));

            setActiveCell(cellKey(indexToCol(newCol), newRow));
        },
        [activeCell, setActiveCell]
    );

    /** Handle keyboard events on the grid */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // If editing, let the cell input handle it
            if (editingCell) {
                if (e.key === 'Escape') {
                    stopEditing();
                    e.preventDefault();
                }
                return;
            }

            switch (e.key) {
                case 'ArrowUp':
                    navigate(0, -1);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    navigate(0, 1);
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    navigate(-1, 0);
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    navigate(1, 0);
                    e.preventDefault();
                    break;
                case 'Enter':
                    if (activeCell) {
                        startEditing(activeCell);
                    }
                    e.preventDefault();
                    break;
                case 'Tab':
                    navigate(e.shiftKey ? -1 : 1, 0);
                    e.preventDefault();
                    break;
                case 'Delete':
                case 'Backspace':
                    // Clear cell — handled by editor
                    break;
                case 'F2':
                    if (activeCell) {
                        startEditing(activeCell);
                    }
                    e.preventDefault();
                    break;
                default:
                    // If it's a printable character and not a modifier key, start editing
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                        if (activeCell) {
                            startEditing(activeCell);
                            // Don't prevent default — let the character be typed
                        }
                    }
                    break;
            }
        },
        [activeCell, editingCell, navigate, startEditing, stopEditing]
    );

    return { handleKeyDown, navigate };
}
