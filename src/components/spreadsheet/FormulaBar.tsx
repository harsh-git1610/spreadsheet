/**
 * Formula bar — shows cell reference and editable value/formula.
 */

'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import { parseCellKey } from '@/lib/formulaEngine';
import { formatCellRef } from '@/lib/cellUtils';

interface FormulaBarProps {
    onCommit: (key: string, value: string) => void;
}

export default function FormulaBar({ onCommit }: FormulaBarProps) {
    const activeCell = useSpreadsheetStore((s) => s.activeCell);
    const formulaBarValue = useSpreadsheetStore((s) => s.formulaBarValue);
    const setFormulaBarValue = useSpreadsheetStore((s) => s.setFormulaBarValue);
    const startEditing = useSpreadsheetStore((s) => s.startEditing);
    const stopEditing = useSpreadsheetStore((s) => s.stopEditing);
    const inputRef = useRef<HTMLInputElement>(null);

    // Format the cell reference label
    const cellLabel = activeCell
        ? (() => {
            const parsed = parseCellKey(activeCell);
            return parsed ? formatCellRef(parsed.col, parsed.row) : activeCell;
        })()
        : '';

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setFormulaBarValue(e.target.value);
        },
        [setFormulaBarValue]
    );

    const handleFocus = useCallback(() => {
        if (activeCell) {
            startEditing(activeCell);
        }
    }, [activeCell, startEditing]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && activeCell) {
                onCommit(activeCell, formulaBarValue);
                stopEditing();
                inputRef.current?.blur();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                stopEditing();
                inputRef.current?.blur();
                e.preventDefault();
            }
        },
        [activeCell, formulaBarValue, onCommit, stopEditing]
    );

    // Sync formula bar value when active cell changes (for display)
    useEffect(() => {
        // Value is set by the store's setActiveCell
    }, [activeCell]);

    return (
        <div className="flex items-center h-9 bg-zinc-900 border-b border-zinc-700/60 px-2 gap-2">
            {/* Cell reference label */}
            <div className="min-w-[60px] h-7 px-2 flex items-center justify-center bg-zinc-800 rounded border border-zinc-700/60">
                <span className="text-xs font-mono font-semibold text-emerald-400">{cellLabel}</span>
            </div>

            {/* fx indicator */}
            <span className="text-xs font-semibold text-zinc-500 italic">fx</span>

            {/* Formula/value input */}
            <input
                ref={inputRef}
                type="text"
                value={formulaBarValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder="Enter a value or formula (e.g. =SUM(A1:A5))"
                className="flex-1 h-7 px-2 bg-zinc-800 text-zinc-100 text-sm rounded border border-zinc-700/60 outline-none focus:ring-1 focus:ring-emerald-500/50 font-mono placeholder:text-zinc-600"
            />
        </div>
    );
}
