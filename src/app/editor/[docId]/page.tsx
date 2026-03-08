/**
 * Spreadsheet Editor Page — the core editing experience.
 *
 * Architecture:
 * - Loads document metadata and cells from Firestore (or local-only mode)
 * - Subscribes to realtime cell updates
 * - Tracks user presence
 * - Renders the grid, toolbar, and formula bar
 * - Handles cell commits (local + remote)
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { usePresence } from '@/hooks/usePresence';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import { getDocument, updateDocumentTitle, getCells } from '@/lib/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { buildCellData } from '@/lib/cellUtils';
import Grid from '@/components/spreadsheet/Grid';
import Toolbar from '@/components/spreadsheet/Toolbar';
import FormulaBar from '@/components/spreadsheet/FormulaBar';
import AuthModal from '@/components/auth/AuthModal';

export default function EditorPage() {
    const params = useParams();
    const router = useRouter();
    const docId = params.docId as string;
    const { user, loading: authLoading, signInWithGoogle, signInAsAnonymous, signOut } = useAuth();

    const setDocument = useSpreadsheetStore((s) => s.setDocument);
    const setCells = useSpreadsheetStore((s) => s.setCells);
    const setCell = useSpreadsheetStore((s) => s.setCell);

    const [pageLoading, setPageLoading] = useState(true);
    const [docTitle, setDocTitle] = useState('Untitled Spreadsheet');

    const { writeCell } = useRealtimeSync(docId, user);
    usePresence(docId, user);

    // Load document metadata and cells
    useEffect(() => {
        if (!user || !docId) return;

        // Local-only mode: skip Firestore loading
        if (!isFirebaseConfigured()) {
            setPageLoading(false);
            return;
        }

        let cancelled = false;

        async function loadDocument() {
            try {
                const [doc, cells] = await Promise.all([
                    getDocument(docId),
                    getCells(docId),
                ]);

                if (cancelled) return;

                if (doc) {
                    setDocument(doc);
                    setDocTitle(doc.title);
                }
                setCells(cells);
            } catch {
                // Firestore load failed — continue with empty state
            } finally {
                if (!cancelled) setPageLoading(false);
            }
        }

        loadDocument();

        return () => {
            cancelled = true;
        };
    }, [docId, user, setDocument, setCells]);

    // Handle cell commit from Grid or FormulaBar
    const handleCellCommit = useCallback(
        (key: string, value: string) => {
            if (!value.trim()) return;
            const data = buildCellData(value, user?.userId);

            if (isFirebaseConfigured()) {
                writeCell(key, data);
            } else {
                // Local-only mode: just update the store
                setCell(key, data);
            }
        },
        [writeCell, setCell, user]
    );

    // Handle title change with debounced save
    const handleTitleChange = useCallback(
        (title: string) => {
            setDocTitle(title);
            if (isFirebaseConfigured()) {
                const timeout = setTimeout(() => {
                    updateDocumentTitle(docId, title).catch(() => { });
                }, 1000);
                return () => clearTimeout(timeout);
            }
        },
        [docId]
    );

    const handleSignOut = useCallback(async () => {
        await signOut();
        router.push('/');
    }, [signOut, router]);

    // Auth check
    if (!authLoading && !user) {
        return (
            <AuthModal
                onAnonymousSignIn={signInAsAnonymous}
                onGoogleSignIn={signInWithGoogle}
            />
        );
    }

    // Loading state
    if (pageLoading || authLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-center animate-fade-in">
                    <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-zinc-400">Loading spreadsheet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-zinc-950">
            {/* Toolbar */}
            <Toolbar
                docTitle={docTitle}
                user={user}
                onTitleChange={handleTitleChange}
                onSignOut={handleSignOut}
            />

            {/* Formula bar */}
            <FormulaBar onCommit={handleCellCommit} />

            {/* Grid */}
            <Grid onCellCommit={handleCellCommit} />
        </div>
    );
}
