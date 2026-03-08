/**
 * Row number header for a single row.
 */

'use client';

import React, { memo } from 'react';

interface HeaderColumnProps {
    rowNumber: number;
}

function HeaderColumnComponent({ rowNumber }: HeaderColumnProps) {
    return (
        <div className="min-w-[50px] h-8 border-r border-b border-zinc-600/60 bg-zinc-900 flex items-center justify-center sticky left-0 z-10">
            <span className="text-xs font-semibold text-zinc-400 select-none">{rowNumber}</span>
        </div>
    );
}

export const HeaderColumn = memo(HeaderColumnComponent);
