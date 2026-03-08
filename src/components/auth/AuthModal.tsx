/**
 * Auth modal — allows users to enter a display name or sign in with Google.
 */

'use client';

import React, { useState, useCallback } from 'react';
import Button from '@/components/ui/Button';

interface AuthModalProps {
    onAnonymousSignIn: (name: string) => Promise<void>;
    onGoogleSignIn: () => Promise<void>;
}

export default function AuthModal({ onAnonymousSignIn, onGoogleSignIn }: AuthModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAnonymous = useCallback(async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onAnonymousSignIn(name.trim());
        } finally {
            setLoading(false);
        }
    }, [name, onAnonymousSignIn]);

    const handleGoogle = useCallback(async () => {
        setLoading(true);
        try {
            await onGoogleSignIn();
        } finally {
            setLoading(false);
        }
    }, [onGoogleSignIn]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/50 p-8 w-full max-w-md mx-4">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/30">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100">Welcome</h2>
                    <p className="text-sm text-zinc-400 mt-1">Sign in to start collaborating</p>
                </div>

                {/* Anonymous sign in */}
                <div className="space-y-3 mb-6">
                    <label className="text-sm font-medium text-zinc-300">Display Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnonymous()}
                        placeholder="Enter your name"
                        className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700/60 rounded-lg text-zinc-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-zinc-600"
                        disabled={loading}
                    />
                    <Button
                        onClick={handleAnonymous}
                        disabled={!name.trim() || loading}
                        className="w-full"
                    >
                        {loading ? 'Signing in...' : 'Continue as Guest'}
                    </Button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-zinc-700/60" />
                    <span className="text-xs text-zinc-500">or</span>
                    <div className="flex-1 h-px bg-zinc-700/60" />
                </div>

                {/* Google sign in */}
                <Button
                    variant="secondary"
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Sign in with Google
                </Button>
            </div>
        </div>
    );
}
