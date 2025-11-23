"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { auth } from '@/app/firebase';
import { User } from 'firebase/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';


const LandingPage = () => {
  const router = useRouter();
  const images = [
    '/images/life.webp',
    '/images/confident.webp',
  ];
  const [user, setUser] = useState<User | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleAvatarClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };
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

  const handleGetStarted = () => {
    if (user) {
      router.push('/editor');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      {/* App Bar */}
      <div className="bg-white text-white p-4 flex justify-between items-center">
        <h1 className="text-lg sm:text-xl font-bold text-black">Text Inside Image</h1>
        {user ? (
          <div className="flex items-center">
            <span className="text-black mr-4">Welcome, {user.displayName}</span>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Avatar className="w-8 h-8 mr-2 cursor-pointer" onClick={handleAvatarClick}>
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                  <AvatarFallback>{user.displayName ? user.displayName[0] : 'U'}</AvatarFallback>
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="p-2">
                <button
                  className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </PopoverContent>
            </Popover>

          </div>
        ) : (
          <div className="flex items-center">
            <Button variant="ghost" className="text-black hover:bg-gray-100 mr-2" onClick={() => router.push('/login')}>
              Log in
            </Button>
            <Button className="bg-black text-white hover:bg-gray-800" onClick={() => router.push('/signup')}>
              Sign up
            </Button>
          </div>
        )}
      </div>
      <Separator />
      <div className="my-6 sm:my-8">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
            <motion.h1
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 text-black"
            >
              Text Inside Image
              <br />
              Elevate Your Images with Striking Text
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6 text-sm sm:text-base text-gray-600"
            >
              Enhance Your Visuals with Compelling Text Overlays
              <br />
              That Not Only Beautify but Also Convey Powerful Messages
            </motion.p>

            {/* ... existing code ... */}
            <Button
              className="bg-black text-white px-6 py-3 sm:px-8 sm:py-4 rounded-md text-sm sm:text-xl font-semibold hover:bg-gray-800 transition-colors duration-300 shadow-lg"
              onClick={handleGetStarted}
            >
              {user ? "Design Now For Free" : "Login to Get Started"}
            </Button>
          </div>

          <div className="w-full lg:w-1/2 relative h-[300px] sm:h-[400px] lg:h-[600px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="absolute top-0 left-0 w-3/4 h-3/4"
            >
              <Image
                src={images[0]}
                alt="Nature image 1"
                fill
                style={{ objectFit: "contain" }}
                className="rounded-3xl"
                unoptimized
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute bottom-0 right-0 w-3/4 h-3/4"
            >
              <Image
                src={images[1]}
                alt="Nature image 2"
                fill
                style={{ objectFit: "contain" }}
                className="rounded-3xl"
                unoptimized
              />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="my-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 grid-rows-2 gap-4 h-[300px] sm:h-[400px] lg:h-[600px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative col-span-2 row-span-2"
          >
            <Image
              src="/images/car.webp"
              alt="Car"
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
              unoptimized
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative col-span-2 row-span-1"
          >
            <Image
              src="/images/van.webp"
              alt="Confident"
              fill
              style={{ objectFit: "contain" }}
              className="rounded-lg"
              unoptimized
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative col-span-1 row-span-1"
          >
            <Image
              src="/images/go.webp"
              alt="Life"
              fill
              style={{ objectFit: "contain" }}
              className="rounded-lg"
              unoptimized
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="relative col-span-1 row-span-1"
          >
            <Image
              src="/images/drone.webp"
              alt="Another Car"
              fill
              style={{ objectFit: "cover" }}
              className="rounded-lg"
              unoptimized
            />
          </motion.div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="my-16 sm:my-24" id="pricing">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-black">Simple, Transparent Pricing</h2>
        <p className="text-center text-gray-600 mb-12 text-lg">Start for free, upgrade for unlimited power</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto px-4">
          {/* Monthly Plan */}
          <div className="border rounded-2xl p-8 flex flex-col gap-6 hover:shadow-xl transition-shadow bg-white relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-200 to-gray-400 group-hover:from-black group-hover:to-gray-800 transition-all"></div>
            <div>
              <h3 className="text-2xl font-bold text-black">Monthly</h3>
              <p className="text-gray-500 mt-2">Perfect for short-term projects</p>
            </div>
            <div className="flex items-baseline">
              <span className="text-5xl font-bold text-black">$9</span>
              <span className="text-gray-500 ml-2">/month</span>
            </div>
            <ul className="space-y-4 flex-1">
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                Unlimited Background Removals
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                High Quality Export
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                Priority Support
              </li>
            </ul>
            <Button
              className="w-full bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-colors py-6 text-lg"
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
          </div>

          {/* Yearly Plan */}
          <div className="border rounded-2xl p-8 flex flex-col gap-6 hover:shadow-xl transition-shadow bg-black text-white relative overflow-hidden transform md:-translate-y-4">
            <div className="absolute top-4 right-4 bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Best Value
            </div>
            <div>
              <h3 className="text-2xl font-bold">Yearly</h3>
              <p className="text-gray-400 mt-2">Save money with annual billing</p>
            </div>
            <div className="flex items-baseline">
              <span className="text-5xl font-bold">$6</span>
              <span className="text-gray-400 ml-2">/month</span>
            </div>
            <p className="text-sm text-gray-400 -mt-4">Billed $72 yearly</p>
            <ul className="space-y-4 flex-1">
              <li className="flex items-center gap-3 text-gray-300">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                All Monthly Features
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                Save $36 per year
              </li>
            </ul>
            <Button
              className="w-full bg-white text-black hover:bg-gray-200 transition-colors py-6 text-lg font-bold"
              onClick={handleGetStarted}
            >
              Get Started Yearly
            </Button>
          </div>
        </div>
      </div>

      <footer className="bg-gray-100 mt-8 sm:mt-16">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-4 sm:mb-0">
              <p className="text-gray-600 text-sm sm:text-base">Created by Vyshnav TR</p>
            </div>
            <a href="https://www.buymeacoffee.com/vyshnav.tr" target="_blank">
              <Image
                src="/images/default-yellow.png"
                alt="Buy Me A Coffee"
                width={217}
                height={60}
                className="h-10 w-auto"
                unoptimized
              />
            </a>
            <div className="flex space-x-4">
              <a href="https://x.com/vyshnav_tr_?t=Qk-a0kwEArQKBJvd5-zR-Q&s=08" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/vyshnav-tr-7b4902204?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/vyshnav.t.r/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                </svg>
              </a>
              <a href="https://github.com/Vyshnavtr0" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
};

export default LandingPage;