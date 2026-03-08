/**
 * Realtime sync hook — connects Firestore to Zustand store.
 *
 * Architecture:
 * - onSnapshot listener on cells subcollection
 * - Optimistic updates: local state updates immediately, then writes to Firestore
 * - Debounced writes to avoid excessive Firestore operations
 * - Save status tracking
 * - Gracefully degrades to local-only mode when Firebase isn't configured
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { subscribeToCells, updateCell as firestoreUpdateCell } from '@/lib/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import type { CellData, UserSession } from '@/types';

const DEBOUNCE_MS = 300;

export function useRealtimeSync(docId: string, user: UserSession | null) {
    const setCells = useSpreadsheetStore((s) => s.setCells);
    const setCell = useSpreadsheetStore((s) => s.setCell);
    const setSaveStatus = useSpreadsheetStore((s) => s.setSaveStatus);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingWritesRef = useRef<Map<string, Partial<CellData>>>(new Map());
    const isLocalUpdate = useRef(false);

    // Subscribe to realtime cell updates from Firestore
    useEffect(() => {
        if (!isFirebaseConfigured()) return;

        const unsubscribe = subscribeToCells(docId, (cells) => {
            // Skip if this was triggered by our own write
            if (isLocalUpdate.current) {
                isLocalUpdate.current = false;
                return;
            }
            setCells(cells);
        });

        return () => unsubscribe();
    }, [docId, setCells]);

    // Flush pending writes to Firestore
    const flushWrites = useCallback(async () => {
        if (!isFirebaseConfigured()) return;

        const writes = new Map(pendingWritesRef.current);
        pendingWritesRef.current.clear();

        if (writes.size === 0) return;

        setSaveStatus('saving');
        try {
            const promises: Promise<void>[] = [];
            for (const [key, data] of writes.entries()) {
                promises.push(firestoreUpdateCell(docId, key, data));
            }
            await Promise.all(promises);
            isLocalUpdate.current = true;
            setSaveStatus('saved');

            // Reset to idle after 2s
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
            setSaveStatus('error');
        }
    }, [docId, setSaveStatus]);

    // Write a cell: optimistic local update + debounced Firestore write
    const writeCell = useCallback(
        (key: string, data: CellData) => {
            // Optimistic local update
            setCell(key, data);

            if (!isFirebaseConfigured()) return;

            // Queue the write
            pendingWritesRef.current.set(key, {
                value: data.value,
                formula: data.formula,
                computedValue: data.computedValue,
                updatedBy: user?.userId,
                formatting: data.formatting,
            });

            // Debounce the Firestore write
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(flushWrites, DEBOUNCE_MS);
        },
        [setCell, flushWrites, user]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            // Flush any remaining writes
            flushWrites();
        };
    }, [flushWrites]);

    return { writeCell };
}
