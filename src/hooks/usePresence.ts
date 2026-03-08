/**
 * Presence hook — tracks and displays collaborators in a document.
 *
 * Architecture:
 * - On mount, writes user presence to Firestore
 * - Heartbeat every 30s keeps presence alive
 * - Subscribes to presence changes for real-time user list
 * - Cleans up on unmount and beforeunload
 * - Gracefully degrades when Firebase isn't configured
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import { setPresence, removePresence, subscribeToPresence } from '@/lib/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useSpreadsheetStore } from '@/store/spreadsheetStore';
import type { UserSession } from '@/types';

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function usePresence(docId: string, user: UserSession | null) {
    const setUsers = useSpreadsheetStore((s) => s.setUsers);
    const activeCell = useSpreadsheetStore((s) => s.activeCell);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const updatePresence = useCallback(async () => {
        if (!user || !isFirebaseConfigured()) return;
        try {
            await setPresence(docId, {
                userId: user.userId,
                name: user.name,
                color: user.color,
                activeCell: activeCell || undefined,
                lastSeen: Timestamp.now(),
            });
        } catch {
            // Silently ignore presence update failures
        }
    }, [docId, user, activeCell]);

    useEffect(() => {
        if (!user || !isFirebaseConfigured()) return;

        // Set initial presence
        updatePresence();

        // Heartbeat
        heartbeatRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);

        // Subscribe to presence updates
        const unsubscribe = subscribeToPresence(docId, (users) => {
            // Filter out stale users (last seen > 2 minutes ago)
            const now = Date.now();
            const activeUsers: typeof users = {};
            for (const [id, u] of Object.entries(users)) {
                const lastSeen = u.lastSeen?.toMillis?.() ?? 0;
                if (now - lastSeen < 120_000) {
                    activeUsers[id] = u;
                }
            }
            setUsers(activeUsers);
        });

        // Cleanup on page leave
        const handleBeforeUnload = () => {
            removePresence(docId, user.userId).catch(() => { });
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            removePresence(docId, user.userId).catch(() => { });
            unsubscribe();
        };
    }, [docId, user, updatePresence, setUsers]);
}
