"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <Navbar />
            <main className="pt-32 pb-16 px-4 container mx-auto max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
                <div className="prose prose-lg max-w-none text-gray-600">
                    <p className="text-sm text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-2xl font-bold text-black mt-8 mb-4">1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using TextBehindImage, you accept and agree to be bound by the terms and provision of this agreement.
                        In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                    </p>

                    <h2 className="text-2xl font-bold text-black mt-8 mb-4">2. Description of Service</h2>
                    <p>
                        TextBehindImage provides users with tools to edit images, specifically to place text behind subjects in photos using AI technology.
                        You understand and agree that the Service may include advertisements and that these advertisements are necessary for TextBehindImage to provide the Service.
                    </p>

                    <h2 className="text-2xl font-bold text-black mt-8 mb-4">3. User Conduct</h2>
                    <p>
                        You agree to not use the Service to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mt-4">
                        <li>Upload, post, email, transmit or otherwise make available any Content that is unlawful, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another&apos;s privacy, hateful, or racially, ethnically or otherwise objectionable.</li>
                        <li>Harm minors in any way.</li>
                        <li>Impersonate any person or entity.</li>
                    </ul>

                    <h2 className="text-2xl font-bold text-black mt-8 mb-4">4. Intellectual Property</h2>
                    <p>
                        The Service and its original content, features and functionality are and will remain the exclusive property of TextBehindImage and its licensors.
                        The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
                    </p>

                    <h2 className="text-2xl font-bold text-black mt-8 mb-4">5. Termination</h2>
                    <p>
                        We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
