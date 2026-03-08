/**
 * Save status indicator — shows Saving…, Saved, or Error state.
 */

'use client';

import React from 'react';
import type { SaveStatus } from '@/types';

interface StatusIndicatorProps {
    status: SaveStatus;
}

const STATUS_CONFIG: Record<SaveStatus, { label: string; color: string; icon: string }> = {
    idle: { label: '', color: '', icon: '' },
    saving: { label: 'Saving...', color: 'text-amber-400', icon: '●' },
    saved: { label: 'Saved', color: 'text-emerald-400', icon: '●' },
    error: { label: 'Error saving', color: 'text-red-400', icon: '●' },
};

export default function StatusIndicator({ status }: StatusIndicatorProps) {
    if (status === 'idle') return null;

    const config = STATUS_CONFIG[status];

    return (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${config.color} transition-all duration-300`}>
            <span className={status === 'saving' ? 'animate-pulse' : ''}>{config.icon}</span>
            <span>{config.label}</span>
        </div>
    );
}
