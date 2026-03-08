/**
 * Toolbar component — provides formatting buttons, export options,
 * presence display, and save status indicator.
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import Avatar from '@/components/ui/Avatar';
import StatusIndicator from '@/components/ui/StatusIndicator';
import Button from '@/components/ui/Button';
import { exportToCSV, exportToJSON, downloadFile } from '@/lib/exportUtils';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { CellFormatting, UserSession } from '@/types';

interface ToolbarProps {
    docTitle: string;
    user: UserSession | null;
    onTitleChange?: (title: string) => void;
    onSignOut?: () => void;
}

/** Share button with copy-link functionality */
function ShareButton() {
    const [copied, setCopied] = useState(false);

    const handleShare = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = window.location.href;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, []);

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            title="Copy link to collaborate"
            className={copied ? '!text-emerald-400' : ''}
        >
            {copied ? (
                <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Copied!
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    Share
                </>
            )}
        </Button>
    );
}

export default function Toolbar({ docTitle, user, onTitleChange, onSignOut }: ToolbarProps) {
    const cells = useSpreadsheetStore((s) => s.cells);
    const activeCell = useSpreadsheetStore((s) => s.activeCell);
    const setCell = useSpreadsheetStore((s) => s.setCell);
    const users = useSpreadsheetStore((s) => s.users);
    const saveStatus = useSpreadsheetStore((s) => s.saveStatus);

    const toggleFormat = useCallback(
        (property: keyof CellFormatting) => {
            if (!activeCell) return;
            const cell = cells[activeCell];
            if (!cell) return;
            const current = cell.formatting?.[property];
            const newFormatting: CellFormatting = {
                ...cell.formatting,
                [property]: !current,
            };
            setCell(activeCell, { ...cell, formatting: newFormatting });
        },
        [activeCell, cells, setCell]
    );

    const handleExportCSV = useCallback(() => {
        const csv = exportToCSV(cells);
        downloadFile(csv, `${docTitle || 'spreadsheet'}.csv`, 'text/csv');
    }, [cells, docTitle]);

    const handleExportJSON = useCallback(() => {
        const json = exportToJSON(cells);
        downloadFile(json, `${docTitle || 'spreadsheet'}.json`, 'application/json');
    }, [cells, docTitle]);

    const userList = Object.values(users);

    return (
        <div className="flex items-center h-12 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-700/60 px-4 gap-3">
            {/* Document title */}
            <input
                type="text"
                value={docTitle}
                onChange={(e) => onTitleChange?.(e.target.value)}
                className="text-base font-semibold text-zinc-100 bg-transparent border-none outline-none hover:bg-zinc-800/50 focus:bg-zinc-800 px-2 py-1 rounded transition-colors max-w-[200px]"
            />

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-700/60" />

            {/* Formatting buttons */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFormat('bold')}
                    title="Bold (Ctrl+B)"
                    className="font-bold w-7 h-7 !p-0"
                >
                    B
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFormat('italic')}
                    title="Italic (Ctrl+I)"
                    className="italic w-7 h-7 !p-0"
                >
                    I
                </Button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-700/60" />

            {/* Export buttons */}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleExportCSV} title="Export as CSV">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportJSON} title="Export as JSON">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    JSON
                </Button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-700/60" />

            {/* Share button */}
            <ShareButton />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Save status or unsaved warning */}
            {isFirebaseConfigured() ? (
                <StatusIndicator status={saveStatus} />
            ) : (
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>Not saved</span>
                </div>
            )}

            {/* Presence avatars */}
            {userList.length > 0 && (
                <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500 mr-1">
                        {userList.length} user{userList.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex -space-x-2">
                        {userList.slice(0, 5).map((u) => (
                            <Avatar key={u.userId} name={u.name} color={u.color} size="sm" />
                        ))}
                        {userList.length > 5 && (
                            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 ring-2 ring-zinc-900">
                                +{userList.length - 5}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* User info */}
            {user && (
                <>
                    <div className="w-px h-6 bg-zinc-700/60" />
                    <div className="flex items-center gap-2">
                        <Avatar name={user.name} color={user.color} size="sm" />
                        <span className="text-xs text-zinc-400 hidden sm:block">{user.name}</span>
                        <Button variant="ghost" size="sm" onClick={onSignOut} className="!py-1 !px-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
