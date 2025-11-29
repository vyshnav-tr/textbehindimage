"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

export default function ContactPage() {
    const [loading, setLoading] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: '',
        email: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { db } = await import('@/app/firebase');
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

            await addDoc(collection(db, 'contacts'), {
                ...formData,
                createdAt: serverTimestamp(),
                status: 'new'
            });

            setSuccess(true);
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            console.error('Error submitting contact form:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.id]: e.target.value
        }));
    };

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <Navbar />
            <main className="pt-32 pb-16 px-4 container mx-auto max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8">Contact Us</h1>
                <p className="text-gray-600 mb-8 text-lg">
                    Have questions, feedback, or just want to say hello? We&apos;d love to hear from you.
                    Fill out the form below and we&apos;ll get back to you as soon as possible.
                </p>

                {success ? (
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
                        <h3 className="text-2xl font-bold text-green-800 mb-2">Message Sent!</h3>
                        <p className="text-green-600 mb-6">Thank you for reaching out. We&apos;ll get back to you shortly.</p>
                        <Button
                            onClick={() => setSuccess(false)}
                            className="bg-green-600 text-white hover:bg-green-700 py-2 px-6 rounded-xl"
                        >
                            Send Another Message
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                id="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows={5}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                                placeholder="How can we help?"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white hover:bg-gray-800 py-6 rounded-xl text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send Message'}
                        </Button>
                    </form>
                )}
            </main>
            <Footer />
        </div>
    );
}
