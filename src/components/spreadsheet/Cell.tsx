/**
 * Individual spreadsheet Cell component.
 *
 * Architecture:
 * - View mode: displays computed value (or raw value for non-formula cells)
 * - Edit mode: shows raw value/formula in an input field
 * - Memoized to avoid re-rendering unaffected cells
 */

'use client';

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import { getDisplayValue, getEditValue } from '@/lib/cellUtils';
import type { CellData, CellFormatting } from '@/types';

interface CellProps {
    cellKey: string;
    onCellCommit: (key: string, value: string) => void;
}

function CellComponent({ cellKey: key, onCellCommit }: CellProps) {
    const cell = useSpreadsheetStore((s) => s.cells[key]);
    const isActive = useSpreadsheetStore((s) => s.activeCell === key);
    const isEditing = useSpreadsheetStore((s) => s.editingCell === key);
    const setActiveCell = useSpreadsheetStore((s) => s.setActiveCell);
    const startEditing = useSpreadsheetStore((s) => s.startEditing);
    const stopEditing = useSpreadsheetStore((s) => s.stopEditing);

    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // When entering edit mode, populate the input
    useEffect(() => {
        if (isEditing) {
            const val = getEditValue(cell);
            setEditValue(val);
            // Focus input after render
            requestAnimationFrame(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            });
        }
    }, [isEditing, cell]);

    const handleClick = useCallback(() => {
        setActiveCell(key);
    }, [key, setActiveCell]);

    const handleDoubleClick = useCallback(() => {
        startEditing(key);
    }, [key, startEditing]);

    const commitEdit = useCallback(() => {
        onCellCommit(key, editValue);
        stopEditing();
    }, [key, editValue, onCellCommit, stopEditing]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                commitEdit();
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === 'Escape') {
                stopEditing();
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === 'Tab') {
                commitEdit();
                e.preventDefault();
                e.stopPropagation();
            }
        },
        [commitEdit, stopEditing]
    );

    const handleBlur = useCallback(() => {
        if (isEditing) {
            commitEdit();
        }
    }, [isEditing, commitEdit]);

    // Build formatting styles
    const formatting: CellFormatting = cell?.formatting || {};
    const cellStyle: React.CSSProperties = {
        fontWeight: formatting.bold ? 700 : 400,
        fontStyle: formatting.italic ? 'italic' : 'normal',
        color: formatting.textColor || undefined,
    };

    const displayValue = getDisplayValue(cell);
    const isError = typeof displayValue === 'string' && displayValue.startsWith('#');

    return (
        <div
            className={`
        relative h-8 min-w-[100px] border-r border-b border-zinc-700/60
        flex items-center
        transition-colors duration-75
        ${isActive ? 'ring-2 ring-emerald-500 ring-inset z-10 bg-zinc-800/80' : 'hover:bg-zinc-800/40'}
        ${isError ? 'text-red-400' : 'text-zinc-200'}
      `}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full h-full px-2 bg-zinc-900 text-zinc-100 text-sm outline-none border-none"
                    style={cellStyle}
                />
            ) : (
                <span
                    className="px-2 text-sm truncate w-full select-none"
                    style={cellStyle}
                >
                    {displayValue}
                </span>
            )}
        </div>
    );
}

export const Cell = memo(CellComponent);
