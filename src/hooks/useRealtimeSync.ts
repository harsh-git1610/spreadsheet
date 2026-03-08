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

    // Subscribe to realtime cell updates from Firestore
    useEffect(() => {
        if (!isFirebaseConfigured()) return;

        const unsubscribe = subscribeToCells(docId, (cells) => {
            if (pendingWritesRef.current.size > 0) {
                // Merge incoming cells but preserve local pending optimistic writes
                const merged = { ...cells };
                for (const [key, pendingData] of pendingWritesRef.current.entries()) {
                    if (merged[key]) {
                        merged[key] = { ...merged[key], ...pendingData };
                    } else {
                        merged[key] = pendingData as CellData;
                    }
                }
                setCells(merged);
            } else {
                setCells(cells);
            }
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
            setSaveStatus('saved');

            // Reset to idle after 2s
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Firestore save error:', error);
            setSaveStatus('error');
        }
    }, [docId, setSaveStatus]);

    // Write a cell: optimistic local update + debounced Firestore write
    const writeCell = useCallback(
        (key: string, data: CellData) => {
            // Optimistic local update
            setCell(key, data);

            if (!isFirebaseConfigured()) return;

            // Queue the write (Firestore rejects 'undefined' values, so we filter them out)
            const payload: Partial<CellData> = { value: data.value };
            if (data.formula !== undefined) payload.formula = data.formula;
            if (data.computedValue !== undefined) payload.computedValue = data.computedValue;
            if (user?.userId) payload.updatedBy = user.userId;
            if (data.formatting !== undefined) payload.formatting = data.formatting;

            pendingWritesRef.current.set(key, payload);

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
