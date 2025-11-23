'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/app/firebase';
import {
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
                // Check if we need to save user to Firestore here too? 
                // The webhook handles subscription status, but basic user info might be needed.
                // Let's do a quick fetch to credits API which creates the user doc if missing.
                // Sync user to Firestore
                await fetch('/api/user/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: result.user.uid,
                        email: result.user.email,
                        name: result.user.displayName
                    })
                });
                router.push('/editor');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            if (result.user) {
                // Update profile with name
                await updateProfile(result.user, {
                    displayName: name
                });

                // Create user document in Firestore via API (or directly if we had client SDK setup, but API is safer/consistent)
                // Actually, our credits API handles creation on GET if missing.
                // But we want to store the name too.
                // Since we don't have a direct "create user" API that takes name, we can rely on the credits API to init 
                // and maybe update name later or just rely on Auth profile.
                // However, the user explicitly asked to "store everything in the firestore database".
                // So let's make a call to ensure it's stored.

                // We can use the credits API to init the doc.
                // Sync user to Firestore
                await fetch('/api/user/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: result.user.uid,
                        email: email,
                        name: name
                    })
                });

                // Ideally we should update the doc with name. 
                // For now, let's just proceed. The Auth profile has the name.

                router.push('/editor');
            }
        } catch (err: unknown) {
            setError(getErrorMessage((err as { code?: string }).code || ''));
        } finally {
            setLoading(false);
        }
    };

    const getErrorMessage = (code: string): string => {
        switch (code) {
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later';
            default:
                return 'An error occurred. Please try again';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-950 rounded-xl shadow-lg p-8">
                <div className="space-y-6">
                    <div className="space-y-2 text-center">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create Account</h2>
                        <p className="text-base text-gray-600 dark:text-gray-400">
                            Sign up to get started with Text Behind Image
                        </p>
                    </div>

                    <Button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        variant="outline"
                        className="w-full h-12 text-base font-medium border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Continue with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">
                                OR CONTINUE WITH EMAIL
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-base font-medium text-gray-900 dark:text-white">
                                Full Name
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-11 h-12 text-base border-gray-300 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-base font-medium text-gray-900 dark:text-white">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-11 h-12 text-base border-gray-300 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-base font-medium text-gray-900 dark:text-white">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="pl-11 h-12 text-base border-gray-300 dark:border-gray-700"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 text-base font-semibold bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-base text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-semibold text-gray-900 dark:text-white hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
