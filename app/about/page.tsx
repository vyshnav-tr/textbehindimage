"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <Navbar />
            <main className="pt-32 pb-16 px-4 container mx-auto max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8">About Us</h1>
                <div className="prose prose-lg max-w-none text-gray-600">
                    <p className="mb-6">
                        Welcome to TextBehindImage, where we believe that great design should be accessible to everyone.
                        Our mission is to empower creators, marketers, and individuals to create stunning visuals with ease.
                    </p>
                    <p className="mb-6">
                        We leverage advanced AI technology to simplify complex editing tasks, such as placing text behind subjects in images.
                        What used to take hours of manual masking and editing can now be done in seconds.
                    </p>
                    <p>
                        Our team is passionate about building tools that inspire creativity and help you tell your story.
                        Thank you for being a part of our journey.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
