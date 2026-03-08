/**
 * Column header row (A, B, C, ..., Z, AA, AB, ...).
 */

'use client';

import React, { memo } from 'react';

interface HeaderRowProps {
    columns: string[];
}

function HeaderRowComponent({ columns }: HeaderRowProps) {
    return (
        <div className="flex sticky top-0 z-20 bg-zinc-900">
            {/* Corner cell */}
            <div className="min-w-[50px] h-8 border-r border-b border-zinc-600/60 bg-zinc-900 flex items-center justify-center sticky left-0 z-30">
                <span className="text-[10px] text-zinc-500"></span>
            </div>
            {/* Column headers */}
            {columns.map((col) => (
                <div
                    key={col}
                    className="min-w-[100px] h-8 border-r border-b border-zinc-600/60 bg-zinc-900 flex items-center justify-center"
                >
                    <span className="text-xs font-semibold text-zinc-400 select-none">{col}</span>
                </div>
            ))}
        </div>
    );
}

export const HeaderRow = memo(HeaderRowComponent);
