/**
 * Avatar component — displays user initials with a colored background.
 */

'use client';

import React from 'react';

interface AvatarProps {
    name: string;
    color: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeMap: Record<string, string> = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
};

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export default function Avatar({ name, color, size = 'md', className = '' }: AvatarProps) {
    return (
        <div
            className={`
        ${sizeMap[size]}
        rounded-full flex items-center justify-center
        font-semibold text-white
        ring-2 ring-zinc-900 shadow-sm
        flex-shrink-0 select-none
        ${className}
      `}
            style={{ backgroundColor: color }}
            title={name}
        >
            {getInitials(name)}
        </div>
    );
}
