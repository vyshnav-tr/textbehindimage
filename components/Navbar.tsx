"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/firebase';
import { User } from 'firebase/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-black/5 supports-[backdrop-filter]:bg-white/60">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-200" />
                                <Image src="/images/wordmark.png" alt="TextBehindImage" width={150} height={30} className="h-8 w-auto object-contain relative" />
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/#features" className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group">
                            Features
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full" />
                        </Link>
                        <Link href="/#how-it-works" className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group">
                            How it Works
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full" />
                        </Link>
                        <Link href="/#pricing" className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group">
                            Pricing
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full" />
                        </Link>

                        {user ? (
                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                <span className="text-sm font-medium text-gray-900">Hi, {user.displayName?.split(' ')[0]}</span>
                                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Avatar className="w-10 h-10 cursor-pointer border-2 border-white shadow-sm hover:shadow-md transition-all ring-1 ring-gray-100">
                                            <AvatarImage src={user.photoURL || undefined} />
                                            <AvatarFallback className="bg-black text-white">{user.displayName?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-2 bg-white border border-gray-100 shadow-xl rounded-xl" align="end">
                                        <div className="px-3 py-2 border-b border-gray-100 mb-2">
                                            <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        </div>
                                        <button
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg transition-colors text-red-600 font-medium flex items-center gap-2"
                                            onClick={handleLogout}
                                        >
                                            Log out
                                        </button>
                                    </PopoverContent>
                                </Popover>
                                <Button onClick={() => router.push('/editor')} className="bg-black text-white hover:bg-gray-800 rounded-full px-6 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all">
                                    Dashboard
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Log in</Link>
                                <Button onClick={() => router.push('/signup')} className="bg-black text-white hover:bg-gray-800 rounded-full px-6 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 transition-all">
                                    Sign up free
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                            {isMobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200 p-6 absolute w-full text-gray-900 shadow-2xl">
                    <div className="flex flex-col space-y-6">
                        <Link href="/#features" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
                        <Link href="/#how-it-works" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>How it Works</Link>
                        <Link href="/#pricing" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
                        <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                            {user ? (
                                <>
                                    <div className="flex items-center gap-3 mb-2 p-2 bg-gray-50 rounded-xl">
                                        <Avatar className="w-10 h-10 border border-white shadow-sm">
                                            <AvatarImage src={user.photoURL || undefined} />
                                            <AvatarFallback className="bg-black text-white">{user.displayName?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.displayName}</span>
                                            <span className="text-xs text-gray-500">{user.email}</span>
                                        </div>
                                    </div>
                                    <Button onClick={() => router.push('/editor')} className="w-full bg-black text-white rounded-xl h-12 text-base shadow-lg">Dashboard</Button>
                                    <Button variant="outline" onClick={handleLogout} className="w-full rounded-xl h-12 text-base border-gray-200 text-gray-900 hover:bg-gray-50">Log out</Button>
                                </>
                            ) : (
                                <>
                                    <Link href="/login" className="w-full py-3 text-center font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Log in</Link>
                                    <Button onClick={() => router.push('/signup')} className="w-full bg-black text-white rounded-xl h-12 text-base shadow-lg">Sign up free</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
