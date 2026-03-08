/**
 * Dashboard Page — Root landing page.
 *
 * Lists all spreadsheet documents with create, delete, open, and sort capabilities.
 * Uses Firebase Auth for identity and Firestore for document persistence.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDocuments, createDocument, deleteDocument } from '@/lib/firestore';
import { isFirebaseConfigured } from '@/lib/firebase';
import type { SpreadsheetDocument } from '@/types';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import AuthModal from '@/components/auth/AuthModal';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle, signInAsAnonymous, signOut } = useAuth();
  const [documents, setDocuments] = useState<SpreadsheetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Fetch documents for the current user
  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const docs = await getDocuments(user.userId);
      setDocuments(docs);
    } catch {
      // Fail gracefully — show empty list
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, fetchDocuments]);

  // Create new document
  const handleCreate = useCallback(async () => {
    if (!user) return;
    setCreating(true);
    try {
      if (!isFirebaseConfigured()) {
        // Local-only mode: generate a random doc ID
        const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        router.push(`/editor/${localId}`);
        return;
      }
      const docId = await createDocument({
        title: 'Untitled Spreadsheet',
        ownerId: user.userId,
        ownerName: user.name,
      });
      router.push(`/editor/${docId}`);
    } catch {
      // Handle error
      setCreating(false);
    }
  }, [user, router]);

  // Delete document
  const handleDelete = useCallback(
    async (docId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm('Delete this spreadsheet? This cannot be undone.')) return;
      try {
        await deleteDocument(docId);
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      } catch {
        // Handle error
      }
    },
    []
  );

  // Format date
  const formatDate = (timestamp: { toDate?: () => Date } | undefined): string => {
    if (!timestamp || !timestamp.toDate) return '—';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Show auth modal if not logged in
  if (!authLoading && !user) {
    return (
      <AuthModal
        onAnonymousSignIn={signInAsAnonymous}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-zinc-100">Spreadsheets</h1>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <Avatar name={user.name} color={user.color} size="sm" />
              <span className="text-sm text-zinc-400 hidden sm:block">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Create button */}
        <div className="mb-6 animate-fade-in">
          <Button onClick={handleCreate} disabled={creating} size="lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {creating ? 'Creating...' : 'New Spreadsheet'}
          </Button>
        </div>

        {/* Sign-in-to-save banner (local-only mode) */}
        {!isFirebaseConfigured() && (
          <div className="mb-8 animate-fade-in p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">You&apos;re in guest mode</p>
              <p className="text-xs text-amber-400/70 mt-0.5">Your spreadsheets won&apos;t be saved. Sign in with Google to save and sync across devices.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={signInWithGoogle} className="flex-shrink-0 !border-amber-700/50 !text-amber-300 hover:!bg-amber-900/30">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in to save
            </Button>
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-400 mb-1">No spreadsheets yet</h3>
            <p className="text-sm text-zinc-600">Create your first spreadsheet to get started</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/editor/${doc.id}`)}
                className="group flex items-center gap-4 p-4 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl cursor-pointer transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-zinc-800 group-hover:bg-emerald-900/30 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                  <svg className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-200 truncate">{doc.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {doc.ownerName} · {formatDate(doc.updatedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="!text-zinc-500 hover:!text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
