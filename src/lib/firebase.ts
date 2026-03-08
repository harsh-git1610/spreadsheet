/**
 * Firebase initialization module.
 *
 * Architecture: Lazy-initializes Firebase app, Firestore, and Auth.
 * All Firebase services are client-side only (no Admin SDK needed).
 * Config is read from environment variables (NEXT_PUBLIC_FIREBASE_*).
 *
 * Graceful degradation: If credentials are missing, Firebase won't
 * initialize and the app will show appropriate fallbacks.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** Check if Firebase config has valid values */
export function isFirebaseConfigured(): boolean {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

/** Get or initialize the Firebase app (singleton) */
function getFirebaseApp(): FirebaseApp | null {
    if (!isFirebaseConfigured()) {
        return null;
    }
    if (getApps().length > 0) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
}

/** Firestore database instance (null if Firebase is not configured) */
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function initServices(): void {
    const app = getFirebaseApp();
    if (app) {
        _db = getFirestore(app);
        _auth = getAuth(app);
    }
}

// Initialize on first import (only if configured)
if (typeof window !== 'undefined') {
    initServices();
}

export function getDb(): Firestore {
    if (!_db) {
        // Try to init if not yet done
        initServices();
        if (!_db) {
            throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
        }
    }
    return _db;
}

export function getAuthInstance(): Auth {
    if (!_auth) {
        initServices();
        if (!_auth) {
            throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
        }
    }
    return _auth;
}

export default getFirebaseApp;
