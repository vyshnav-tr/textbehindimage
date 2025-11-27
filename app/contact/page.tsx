"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <Navbar />
            <main className="pt-32 pb-16 px-4 container mx-auto max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8">Contact Us</h1>
                <p className="text-gray-600 mb-8 text-lg">
                    Have questions, feedback, or just want to say hello? We&apos;d love to hear from you.
                    Fill out the form below and we&apos;ll get back to you as soon as possible.
                </p>

                <form className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            id="name"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            id="message"
                            rows={5}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                            placeholder="How can we help?"
                        />
                    </div>

                    <Button className="w-full bg-black text-white hover:bg-gray-800 py-6 rounded-xl text-lg font-bold">
                        Send Message
                    </Button>
                </form>
            </main>
            <Footer />
        </div>
    );
}
