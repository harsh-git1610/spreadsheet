/**
 * Reusable Button component with multiple variants.
 */

'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
    primary:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/20 border border-emerald-500/30',
    secondary:
        'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600/50',
    danger:
        'bg-red-600/90 hover:bg-red-700 text-white border border-red-500/30',
    ghost:
        'bg-transparent hover:bg-zinc-800 text-zinc-300 border border-transparent',
};

const sizeStyles: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2
        rounded-lg font-medium
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 focus:ring-offset-zinc-900
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
            {...props}
        >
            {children}
        </button>
    );
}
