/**
 * Auth hook — manages user identity.
 *
 * Supports:
 * - Anonymous session with display name
 * - Google sign-in via Firebase Auth
 * - Stable random color assignment per session
 *
 * Graceful degradation: If Firebase is not configured, uses a local-only session
 * persisted in sessionStorage to survive page navigation.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInAnonymously,
    updateProfile,
    type User,
} from 'firebase/auth';
import { getAuthInstance, isFirebaseConfigured } from '@/lib/firebase';
import type { UserSession } from '@/types';

const COLORS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4',
    '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B',
    '#6366F1', '#A855F7', '#E11D48', '#0EA5E9', '#10B981',
];

function getRandomColor(): string {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

const SESSION_COLOR_KEY = 'spreadsheet_user_color';
const SESSION_USER_KEY = 'spreadsheet_local_user';

function getSessionColor(): string {
    if (typeof window === 'undefined') return COLORS[0];
    let color = sessionStorage.getItem(SESSION_COLOR_KEY);
    if (!color) {
        color = getRandomColor();
        sessionStorage.setItem(SESSION_COLOR_KEY, color);
    }
    return color;
}

/** Save local user session to sessionStorage */
function saveLocalSession(user: UserSession): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

/** Restore local user session from sessionStorage */
function restoreLocalSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(SESSION_USER_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored) as UserSession;
    } catch {
        return null;
    }
}

/** Clear local user session from sessionStorage */
function clearLocalSession(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_COLOR_KEY);
}

export function useAuth() {
    const [user, setUser] = useState<UserSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If Firebase is not configured, try to restore a local session
        if (!isFirebaseConfigured()) {
            const restored = restoreLocalSession();
            if (restored) {
                setUser(restored);
            }
            setLoading(false);
            return;
        }

        try {
            const auth = getAuthInstance();
            const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
                if (firebaseUser) {
                    setUser({
                        userId: firebaseUser.uid,
                        name: firebaseUser.displayName || 'Anonymous',
                        color: getSessionColor(),
                        isAnonymous: firebaseUser.isAnonymous,
                        email: firebaseUser.email || undefined,
                        photoURL: firebaseUser.photoURL || undefined,
                    });
                } else {
                    setUser(null);
                }
                setLoading(false);
            });
            return () => unsubscribe();
        } catch {
            setLoading(false);
        }
    }, []);

    const signInWithGoogle = useCallback(async () => {
        if (!isFirebaseConfigured()) {
            alert('Firebase is not configured yet. Please add your Firebase credentials to .env.local and restart the dev server.');
            return;
        }
        const auth = getAuthInstance();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    }, []);

    const signInAsAnonymous = useCallback(async (displayName: string) => {
        if (!isFirebaseConfigured()) {
            // Local-only fallback — create and persist a local user session
            const localUser: UserSession = {
                userId: `local-${Date.now()}`,
                name: displayName,
                color: getSessionColor(),
                isAnonymous: true,
            };
            saveLocalSession(localUser);
            setUser(localUser);
            return;
        }

        const auth = getAuthInstance();
        const cred = await signInAnonymously(auth);
        if (cred.user) {
            await updateProfile(cred.user, { displayName });
            setUser({
                userId: cred.user.uid,
                name: displayName,
                color: getSessionColor(),
                isAnonymous: true,
            });
        }
    }, []);

    const signOut = useCallback(async () => {
        if (isFirebaseConfigured()) {
            try {
                const auth = getAuthInstance();
                await firebaseSignOut(auth);
            } catch {
                // Ignore sign-out errors
            }
        }
        clearLocalSession();
        setUser(null);
    }, []);

    return { user, loading, signInWithGoogle, signInAsAnonymous, signOut };
}
