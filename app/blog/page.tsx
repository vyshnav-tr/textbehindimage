"use client";

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function BlogPage() {
    const posts = [
        {
            title: "How to Create Viral Instagram Posts with Text Behind Image",
            excerpt: "Learn the secrets to creating engaging social media content that stops the scroll.",
            date: "October 15, 2023",
            slug: "viral-instagram-posts"
        },
        {
            title: "The Future of AI in Graphic Design",
            excerpt: "Explore how artificial intelligence is transforming the creative industry and what it means for designers.",
            date: "November 2, 2023",
            slug: "ai-in-graphic-design"
        },
        {
            title: "Top 5 Typography Trends for 2024",
            excerpt: "Stay ahead of the curve with these emerging typography trends that are set to dominate the design world.",
            date: "November 20, 2023",
            slug: "typography-trends-2024"
        }
    ];

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <Navbar />
            <main className="pt-32 pb-16 px-4 container mx-auto max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-bold mb-12">Blog</h1>
                <div className="grid gap-12">
                    {posts.map((post, index) => (
                        <article key={index} className="border-b border-gray-100 pb-12 last:border-0">
                            <p className="text-sm text-gray-400 mb-2">{post.date}</p>
                            <h2 className="text-2xl font-bold mb-3 hover:text-gray-700 transition-colors">
                                <Link href={`#`}>{post.title}</Link>
                            </h2>
                            <p className="text-gray-600 mb-4">{post.excerpt}</p>
                            <Link href={`#`} className="text-black font-medium hover:underline">
                                Read more →
                            </Link>
                        </article>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
}
