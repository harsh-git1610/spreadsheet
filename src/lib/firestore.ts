/**
 * Firestore CRUD helpers for documents, cells, and presence.
 *
 * Architecture: Thin wrappers around Firestore SDK calls.
 * - Documents live in `documents/{docId}`
 * - Cells live in `cells/{docId}/data/{cellKey}`
 * - Presence lives in `presence/{docId}/users/{userId}`
 *
 * Uses lazy getDb() to avoid crash when Firebase isn't configured.
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebase';
import type {
    SpreadsheetDocument,
    CreateDocumentInput,
    CellData,
    CellMap,
    UserPresence,
} from '@/types';

// ─── Document Operations ─────────────────────────────────────────────────────

/** Create a new spreadsheet document */
export async function createDocument(input: CreateDocumentInput): Promise<string> {
    const db = getDb();
    const docRef = doc(collection(db, 'documents'));
    const now = Timestamp.now();
    const data: Omit<SpreadsheetDocument, 'id'> = {
        title: input.title,
        ownerId: input.ownerId,
        ownerName: input.ownerName,
        createdAt: now,
        updatedAt: now,
    };
    await setDoc(docRef, data);
    return docRef.id;
}

/** Get all documents ordered by updatedAt descending */
export async function getDocuments(): Promise<SpreadsheetDocument[]> {
    const db = getDb();
    const q = query(collection(db, 'documents'), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
    })) as SpreadsheetDocument[];
}

/** Get a single document by ID */
export async function getDocument(docId: string): Promise<SpreadsheetDocument | null> {
    const db = getDb();
    const snap = await getDoc(doc(db, 'documents', docId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as SpreadsheetDocument;
}

/** Delete a document and its cells subcollection */
export async function deleteDocument(docId: string): Promise<void> {
    const db = getDb();
    // Delete all cells in the subcollection
    const cellsSnap = await getDocs(collection(db, 'cells', docId, 'data'));
    const deletePromises = cellsSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Delete presence
    const presenceSnap = await getDocs(collection(db, 'presence', docId, 'users'));
    const presenceDeletes = presenceSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(presenceDeletes);

    // Delete the document itself
    await deleteDoc(doc(db, 'documents', docId));
}

/** Update document title or metadata */
export async function updateDocumentTitle(docId: string, title: string): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, 'documents', docId), {
        title,
        updatedAt: serverTimestamp(),
    });
}

// ─── Cell Operations ─────────────────────────────────────────────────────────

/** Write a cell to Firestore */
export async function updateCell(
    docId: string,
    cellKey: string,
    data: Partial<CellData>
): Promise<void> {
    const db = getDb();
    const cellRef = doc(db, 'cells', docId, 'data', cellKey);
    await setDoc(
        cellRef,
        {
            ...data,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    // Also touch the document's updatedAt
    await updateDoc(doc(db, 'documents', docId), {
        updatedAt: serverTimestamp(),
    });
}

/** Get all cells for a document */
export async function getCells(docId: string): Promise<CellMap> {
    const db = getDb();
    const snapshot = await getDocs(collection(db, 'cells', docId, 'data'));
    const cells: CellMap = {};
    snapshot.docs.forEach((d) => {
        cells[d.id] = d.data() as CellData;
    });
    return cells;
}

/** Subscribe to realtime cell updates */
export function subscribeToCells(
    docId: string,
    callback: (cells: CellMap) => void
): Unsubscribe {
    const db = getDb();
    return onSnapshot(collection(db, 'cells', docId, 'data'), (snapshot) => {
        const cells: CellMap = {};
        snapshot.docs.forEach((d) => {
            cells[d.id] = d.data() as CellData;
        });
        callback(cells);
    });
}

/** Delete a specific cell */
export async function deleteCell(docId: string, cellKey: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'cells', docId, 'data', cellKey));
}

// ─── Presence Operations ─────────────────────────────────────────────────────

/** Set or update user presence for a document */
export async function setPresence(docId: string, presence: UserPresence): Promise<void> {
    const db = getDb();
    const presenceRef = doc(db, 'presence', docId, 'users', presence.userId);
    await setDoc(presenceRef, {
        ...presence,
        lastSeen: serverTimestamp(),
    });
}

/** Remove user presence */
export async function removePresence(docId: string, userId: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, 'presence', docId, 'users', userId));
}

/** Subscribe to presence updates */
export function subscribeToPresence(
    docId: string,
    callback: (users: Record<string, UserPresence>) => void
): Unsubscribe {
    const db = getDb();
    return onSnapshot(collection(db, 'presence', docId, 'users'), (snapshot) => {
        const users: Record<string, UserPresence> = {};
        snapshot.docs.forEach((d) => {
            users[d.id] = d.data() as UserPresence;
        });
        callback(users);
    });
}
