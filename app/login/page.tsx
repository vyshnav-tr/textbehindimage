'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/app/firebase';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { Loader2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
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

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            if (result.user) {
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
            setError(getErrorMessage((err as { code?: string }).code || ''));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
        } catch (err: unknown) {
            setError(getErrorMessage((err as { code?: string }).code || ''));
        } finally {
            setLoading(false);
        }
    };

    const getErrorMessage = (code: string): string => {
        switch (code) {
            case 'auth/email-already-in-use': return 'Email already in use';
            case 'auth/invalid-email': return 'Invalid email address';
            case 'auth/user-not-found': return 'No account found with this email';
            case 'auth/wrong-password': return 'Incorrect password';
            case 'auth/weak-password': return 'Password should be at least 6 characters';
            case 'auth/too-many-requests': return 'Too many attempts. Please try again later';
            default: return 'An error occurred. Please try again';
        }
    };

    return (
        <div className="min-h-screen w-full flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-12 xl:p-24 bg-white relative">
                <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                    <div className="mb-8">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white mb-6">
                            <ImageIcon size={20} />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-black mb-2">
                            {isResetMode ? 'Reset Password' : 'Welcome back'}
                        </h1>
                        <p className="text-gray-500">
                            {isResetMode
                                ? 'Enter your email to receive a reset link'
                                : 'Enter your details to access your account'}
                        </p>
                    </div>

                    {isResetMode ? (
                        resetSent ? (
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Check your email</h3>
                                    <p className="text-gray-500">We&apos;ve sent a password reset link to <span className="font-medium text-black">{email}</span></p>
                                </div>
                                <Button onClick={() => setIsResetMode(false)} className="w-full h-12 bg-black text-white hover:bg-gray-800">
                                    Back to Sign In
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reset-email">Email</Label>
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-12"
                                    />
                                </div>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                                <Button type="submit" disabled={loading} className="w-full h-12 bg-black text-white hover:bg-gray-800">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                                </Button>
                                <button type="button" onClick={() => setIsResetMode(false)} className="w-full text-sm text-gray-500 hover:text-black mt-4">
                                    Back to Sign In
                                </button>
                            </form>
                        )
                    ) : (
                        <div className="space-y-6">
                            <Button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                variant="outline"
                                className="w-full h-12 text-base font-medium border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
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
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-400">Or continue with email</span>
                                </div>
                            </div>

                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="password">Password</Label>
                                        <button
                                            type="button"
                                            onClick={() => setIsResetMode(true)}
                                            className="text-xs font-medium text-gray-500 hover:text-black"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-12 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                <Button type="submit" disabled={loading} className="w-full h-12 bg-black text-white hover:bg-gray-800 text-base font-medium">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                                </Button>
                            </form>

                            <p className="text-center text-sm text-gray-500">
                                Don&apos;t have an account?{' '}
                                <Link href="/signup" className="font-semibold text-black hover:underline">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:block w-1/2 relative bg-black">
                <Image
                    src="/images/confident.webp"
                    alt="Login Visual"
                    fill
                    className="object-cover opacity-80"
                    priority
                    unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12 text-white">
                    <h2 className="text-4xl font-bold mb-4">&quot;The easiest way to create viral content.&quot;</h2>
                    <p className="text-lg text-gray-300">Join thousands of creators making stunning visuals with TextBehindImage.</p>
                </div>
            </div>
        </div>
    );
}
