/**
 * Spreadsheet Grid component.
 *
 * Architecture:
 * - Renders a virtualized-like grid with visible rows/columns
 * - Handles scrolling, cell selection, and keyboard navigation
 * - Uses windowed rendering: only renders rows in the visible viewport
 * - Memoized row rendering to minimize re-renders
 */

'use client';

import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { Cell } from './Cell';
import { HeaderRow } from './HeaderRow';
import { HeaderColumn } from './HeaderColumn';
import { generateColumnHeaders, generateRowNumbers, DEFAULT_COLS, DEFAULT_ROWS } from '@/lib/cellUtils';
import { cellKey } from '@/lib/formulaEngine';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';

const ROW_HEIGHT = 32; // 8 * 4 = h-8
const COL_WIDTH = 100;
const HEADER_COL_WIDTH = 50;
const OVERSCAN = 5;

interface GridProps {
    onCellCommit: (key: string, value: string) => void;
}

export default function Grid({ onCellCommit }: GridProps) {
    const columns = useMemo(() => generateColumnHeaders(DEFAULT_COLS), []);
    const rows = useMemo(() => generateRowNumbers(DEFAULT_ROWS), []);
    const containerRef = useRef<HTMLDivElement>(null);
    const { handleKeyDown } = useSpreadsheet();

    // Track scroll position for virtualization
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Calculate visible row range
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endRow = Math.min(rows.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
    const visibleRows = rows.slice(startRow, endRow);

    // Total grid height for scroll
    const totalHeight = rows.length * ROW_HEIGHT;

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-zinc-950 focus:outline-none"
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            tabIndex={0}
        >
            <div style={{ minWidth: HEADER_COL_WIDTH + columns.length * COL_WIDTH }}>
                {/* Column headers */}
                <HeaderRow columns={columns} />

                {/* Rows with virtualization */}
                <div style={{ height: totalHeight, position: 'relative' }}>
                    {visibleRows.map((rowNum) => (
                        <div
                            key={rowNum}
                            className="flex"
                            style={{
                                position: 'absolute',
                                top: (rowNum - 1) * ROW_HEIGHT,
                                left: 0,
                                right: 0,
                                height: ROW_HEIGHT,
                            }}
                        >
                            <HeaderColumn rowNumber={rowNum} />
                            {columns.map((col) => (
                                <Cell
                                    key={`${col}-${rowNum}`}
                                    cellKey={cellKey(col, rowNum)}
                                    onCellCommit={onCellCommit}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
