'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db } from '@/app/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, ArrowLeft, Send } from 'lucide-react';

import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function FeedbackPage() {

    const [user, setUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser?.email) {
                setEmail(currentUser.email);
            }
            setLoadingUser(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            setError('Please enter a message');
            return;
        }
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await addDoc(collection(db, 'feedback'), {
                uid: user?.uid || 'anonymous',
                email: email,
                subject,
                message,
                createdAt: serverTimestamp(),
                userAgent: navigator.userAgent,
            });
            setSuccess(true);
            setSubject('');
            setMessage('');
            // Don't clear email if user is logged in
            if (!user) setEmail('');
        } catch (err) {
            console.error('Error submitting feedback:', err);
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="max-w-2xl mx-auto w-full p-6 lg:p-8">
                <Link href="/editor" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" /> Back to Editor
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-black mb-2">Send Feedback</h1>
                        <p className="text-gray-500">
                            We value your feedback! Let us know how we can improve your experience.
                        </p>
                    </div>

                    {success ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4">
                                <Send className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Thank you!</h3>
                            <p className="text-gray-500 mb-8">Your feedback has been sent successfully.</p>
                            <Button onClick={() => setSuccess(false)} variant="outline">
                                Send another message
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject (Optional)</Label>
                                <Input
                                    id="subject"
                                    placeholder="Feature request, Bug report, etc."
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <textarea
                                    id="message"
                                    placeholder="Tell us what you think..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[150px] resize-y"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" disabled={loading} className="w-full h-11 bg-black text-white hover:bg-gray-800">
                                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Send Feedback
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
