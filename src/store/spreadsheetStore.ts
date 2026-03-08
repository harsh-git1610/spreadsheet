/**
 * Zustand store for spreadsheet state.
 *
 * Architecture: Central state container for the editor.
 * All cell data, selection state, presence, and save status live here.
 * Firestore listeners push updates into this store.
 * UI components subscribe to slices of this store.
 */

import { create } from 'zustand';
import type { SpreadsheetState, CellData, CellMap, SaveStatus, SpreadsheetDocument, UserPresence } from '@/types';
import { recalculateAllCells, isFormula, evaluateFormula } from '@/lib/formulaEngine';

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
    document: null,
    cells: {},
    activeCell: null,
    editingCell: null,
    formulaBarValue: '',
    users: {},
    saveStatus: 'idle',

    setDocument: (doc: SpreadsheetDocument | null) => set({ document: doc }),

    setCells: (cells: CellMap) => {
        // Recalculate all formula cells whenever the full cell map is set
        const recalculated = recalculateAllCells(cells);
        set({ cells: recalculated });
    },

    setCell: (key: string, data: CellData) => {
        const { cells } = get();
        let updated = { ...data };

        // If the cell has a formula, compute it
        if (data.formula && isFormula(data.formula)) {
            const computed = evaluateFormula(data.formula, { ...cells, [key]: data }, new Set());
            updated = { ...updated, computedValue: computed };
        } else {
            const num = parseFloat(data.value);
            updated = { ...updated, computedValue: isNaN(num) ? data.value : num };
        }

        const newCells = { ...cells, [key]: updated };

        // Recalculate any other cells that might depend on this one
        const recalculated = recalculateAllCells(newCells);
        set({ cells: recalculated });
    },

    removeCell: (key: string) => {
        const { cells } = get();
        const newCells = { ...cells };
        delete newCells[key];
        const recalculated = recalculateAllCells(newCells);
        set({ cells: recalculated });
    },

    setActiveCell: (key: string | null) => {
        if (key) {
            const { cells } = get();
            const cell = cells[key];
            const formulaBarValue = cell?.formula || cell?.value || '';
            set({ activeCell: key, formulaBarValue });
        } else {
            set({ activeCell: null, formulaBarValue: '' });
        }
    },

    startEditing: (key: string) => {
        const { cells } = get();
        const cell = cells[key];
        const formulaBarValue = cell?.formula || cell?.value || '';
        set({ editingCell: key, activeCell: key, formulaBarValue });
    },

    stopEditing: () => set({ editingCell: null }),

    setFormulaBarValue: (value: string) => set({ formulaBarValue: value }),

    setUsers: (users: Record<string, UserPresence>) => set({ users }),

    setSaveStatus: (status: SaveStatus) => set({ saveStatus: status }),

    recalculateAll: () => {
        const { cells } = get();
        const recalculated = recalculateAllCells(cells);
        set({ cells: recalculated });
    },
}));
