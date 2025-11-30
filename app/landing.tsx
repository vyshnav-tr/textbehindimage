
"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/firebase';
import { User } from 'firebase/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ArrowRight, Check, Layers, Zap, Download, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { logAnalyticsEvent } from "@/app/utils/analytics";
import { Spotlight } from '@/components/ui/spotlight';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { StickyScroll } from '@/components/ui/sticky-scroll-reveal';
import { ParallaxScroll } from '@/components/ui/parallax-scroll';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const LandingPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free');
  const [dodoCustomerId, setDodoCustomerId] = useState<string | undefined>(undefined);
  const [dodoSubscriptionId, setDodoSubscriptionId] = useState<string | undefined>(undefined);
  const [subscriptionInterval, setSubscriptionInterval] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null);

  useEffect(() => {
    logAnalyticsEvent('page_view', { page_title: 'Landing Page' });
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        fetch(`/api/user/credits?uid=${user.uid}`)
          .then(res => res.json())
          .then(data => {
            console.log('Landing Page Subscription Data:', data);
            setSubscriptionStatus(data.subscriptionStatus);
            setDodoCustomerId(data.dodoCustomerId);
            setDodoSubscriptionId(data.dodoSubscriptionId);
            setSubscriptionInterval(data.subscriptionInterval);
          })
          .catch(console.error);
      }
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
    logAnalyticsEvent('click_get_started');
    if (user) {
      router.push('/editor');
    } else {
      router.push('/login');
    }
  };

  const handlePortal = async () => {
    logAnalyticsEvent('manage_subscription');
    console.log('handlePortal called', { dodoCustomerId, dodoSubscriptionId, uid: user?.uid });

    // Ensure user is logged in
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading('portal');
    try {
      // Allow server to resolve customerId from uid or subscription if missing
      const payload: Record<string, unknown> = {};
      if (dodoCustomerId) payload.customerId = dodoCustomerId;
      if (dodoSubscriptionId) payload.subscriptionId = dodoSubscriptionId;
      if (user?.uid) payload.uid = user.uid;

      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          email: user.email || undefined,
        }),
      });

      const data = await response.json();
      console.log('Portal API response:', data);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No URL in portal response');
        alert('Could not open billing portal. Please try again.');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      alert(error instanceof Error ? error.message : 'Error opening portal');
    } finally {
      setLoading(null);
    }
  };


  const handleCheckout = async (interval: 'monthly' | 'yearly') => {
    if (!user) {
      router.push('/login');
      return;
    }

    logAnalyticsEvent('begin_checkout', { plan: interval });
    setLoading(interval === 'monthly' ? 'monthly' : 'yearly');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: interval === 'monthly' ? process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY : process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY,
          uid: user.uid,
          email: user.email,
          name: user.displayName
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(null);
    }
  };


  const handleSwitchPlan = async (target: 'monthly' | 'yearly') => {
    // Require auth
    if (!user) {
      router.push('/login');
      return;
    }
    if (!dodoSubscriptionId) {
      alert('No active subscription found to switch.');
      return;
    }

    logAnalyticsEvent('switch_plan', { target });

    // Reuse existing loading keys
    setLoading(target);
    try {
      const newProductId =
        target === 'monthly'
          ? process.env.NEXT_PUBLIC_DODO_PRODUCT_MONTHLY
          : process.env.NEXT_PUBLIC_DODO_PRODUCT_YEARLY;

      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: dodoSubscriptionId,
          newProductId,
          uid: user.uid,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        // Update local UI state immediately without full reload
        const newInterval = target === 'monthly' ? 'month' : 'year';
        setSubscriptionStatus('active');
        setSubscriptionInterval(newInterval);

        // Force-sync Firestore from Dodo so DB reflects the new interval promptly
        try {
          const syncRes = await fetch('/api/subscription/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid, subscriptionId: dodoSubscriptionId }),
          });
          const syncData = await syncRes.json();
          if (syncRes.ok) {
            if (syncData.subscriptionInterval) setSubscriptionInterval(syncData.subscriptionInterval);
            if (syncData.dodoCustomerId) setDodoCustomerId(syncData.dodoCustomerId);
            if (syncData.dodoSubscriptionId) setDodoSubscriptionId(syncData.dodoSubscriptionId);
          } else {
            console.warn('Subscription sync failed:', syncData?.error);
          }
        } catch (e) {
          console.warn('Unable to force sync subscription', e);
        }

        // Also re-fetch from server to ensure state matches backend/webhooks
        try {
          const fresh = await fetch(`/api/user/credits?uid=${user.uid}`, {
            method: 'GET',
            headers: { 'cache-control': 'no-store' },
          });
          const freshData = await fresh.json();
          if (fresh.ok) {
            setSubscriptionStatus(freshData.subscriptionStatus);
            setDodoCustomerId(freshData.dodoCustomerId);
            setDodoSubscriptionId(freshData.dodoSubscriptionId);
            setSubscriptionInterval(freshData.subscriptionInterval);
          } else {
            console.warn('Refresh of subscription state failed:', freshData?.error);
          }
        } catch (e) {
          console.warn('Unable to refresh subscription state from server', e);
        }

        alert('Plan switched successfully.');
      } else {
        throw new Error(data?.error || 'Failed to switch plan');
      }
    } catch (error) {
      console.error('Error switching plan:', error);
      alert(error instanceof Error ? error.message : 'Error switching plan');
    } finally {
      setLoading(null);
    }
  };

  const steps = [
    {
      num: "01",
      title: "Upload Image",
      desc: "Choose any photo from your gallery."
    },
    {
      num: "02",
      title: "Add Text",
      desc: "Type your message and customize fonts."
    },
    {
      num: "03",
      title: "Auto-Magic",
      desc: "Our AI places text behind the subject instantly."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">

      {/* Navbar */}
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
              <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full" />
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group">
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full" />
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-black transition-colors relative group">
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
              <Link href="#features" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
              <Link href="#how-it-works" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>How it Works</Link>
              <Link href="#pricing" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Pricing</Link>
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

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-48 md:pb-32 px-4 overflow-hidden bg-white antialiased bg-grid-black/[0.02]">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="rgba(0,0,0,0.05)"
        />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-medium mb-8 border border-gray-200"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              New: Advanced Text Effects
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 max-w-4xl text-black"
            >
              Text <span className="italic text-gray-400">Behind</span> Image
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed"
            >
              Create viral-worthy content in seconds. The easiest way to add depth to your designs by placing text behind subjects automatically.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button onClick={handleGetStarted} className="h-14 px-8 rounded-full text-lg bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-300 shadow-xl shadow-black/10 flex items-center justify-center gap-2 group font-semibold">
                Start Creating Now <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-14 px-8 rounded-full text-lg border-gray-200 text-black hover:bg-gray-50 transition-all duration-300 bg-white"
              >
                See how it works
              </Button>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-20 relative w-full max-w-5xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 group"
            >
              <div className="absolute inset-0 bg-gray-50 animate-pulse" />
              <Image
                src="/images/legend.webp"
                alt="App Interface Preview"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </section>


      {/* Gallery Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-black">Made with TextBehindImage</h2>
            <p className="text-gray-600 text-lg">See what our community is creating.</p>
          </div>
          <ParallaxScroll images={[
            "/images/horizon.webp",
            "/images/garden.webp",
            "/images/wild.webp",
            "/images/queen.webp",
            "/images/airtime.webp",
            "/images/fashion.webp",
            "/images/confident.webp", // Repeating for demo
            "/images/happy.webp",
            "/images/drone.webp",
          ]} className="h-[40rem]" />
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-black">Everything you need</h2>
            <p className="text-gray-600 text-lg">Professional tools made simple for everyone.</p>
          </div>

          <BentoGrid className="max-w-4xl mx-auto">
            <BentoGridItem
              title="Smart Layering"
              description="Automatically detect subjects and place text behind them with precision."
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl overflow-hidden relative">
                  <Image
                    src="/images/lakeside.webp"
                    alt="Smart Layering"
                    fill
                    className="object-cover opacity-90 hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              }
              icon={<div className="p-2 bg-black/5 rounded-lg w-fit text-black"><Layers className="w-6 h-6" /></div>}
              className="md:col-span-1"
            />
            <BentoGridItem
              title="Instant Results"
              description="Get professional-looking results in seconds, not hours of editing."
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-100 flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 hidden group-hover:flex items-center justify-center transition-all">
                    <span className="text-4xl font-bold text-black">0.5s</span>
                  </div>
                  <Image src="/images/legend.webp" alt="Fast" fill className="object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500" />
                </div>
              }
              icon={<div className="p-2 bg-black/5 rounded-lg w-fit text-black"><Zap className="w-6 h-6" /></div>}
              className="md:col-span-1"
            />
            <BentoGridItem
              title="High Quality Export"
              description="Download your creations in high resolution, ready for social media."
              header={
                <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gray-100 border border-gray-100 flex-col items-center justify-center relative overflow-hidden">
                  <Image src="/images/car.webp" alt="High Quality" fill className="object-cover hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <span className="text-white font-bold text-xl">4K Export</span>
                  </div>
                </div>
              }
              icon={<div className="p-2 bg-black/5 rounded-lg w-fit text-black"><Download className="w-6 h-6" /></div>}
              className="md:col-span-1"
            />
          </BentoGrid>
        </div>
      </section>
      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-black">How it works</h2>
            <p className="text-gray-600 text-lg">Create stunning visuals in three simple steps.</p>
          </div>

          <StickyScroll
            content={steps.map((step, i) => ({
              title: step.title,
              description: step.desc,
              content: (
                <div className="h-full w-full flex items-center justify-center text-white">
                  <Image
                    src={i === 0 ? "/images/fly_before.webp" : i === 1 ? "/images/fly_after.webp" : "/images/car.webp"}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover"
                    alt="linear board demo"
                    unoptimized
                  />
                </div>
              ),
            }))}
            contentClassName="bg-gray-100"
          />

          <div className="mt-10 text-center">
            <Link href="/editor" onClick={handleGetStarted}>
              <button className="bg-black text-white rounded-full px-8 py-6 text-lg hover:bg-gray-800 font-bold transition-colors">
                Try it yourself
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-50 text-black border-t border-gray-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 text-lg">Start for free, upgrade for power.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <motion.div
              whileHover={{ y: -10 }}
              className={`bg-white rounded-3xl p-8 border ${subscriptionStatus === 'active' && subscriptionInterval?.toLowerCase() === 'month' ? 'border-green-500' : 'border-gray-200'} flex flex-col relative hover:shadow-xl transition-all shadow-sm`}
            >
              {subscriptionStatus === 'active' && subscriptionInterval?.toLowerCase() === 'month' && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Current Plan
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Monthly</h3>
                <p className="text-gray-500">Perfect for short-term projects</p>
              </div>
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-bold">$9</span>
                <span className="text-gray-500 ml-2">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Unlimited Edits Usage', 'Advanced Text Effects (3D, Curve)', 'Pro Image Adjustments', 'Priority Support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              {subscriptionStatus === 'active' && subscriptionInterval?.toLowerCase() === 'month' ? (
                <Button onClick={handlePortal} disabled={loading === 'portal'} className="w-full bg-black text-white hover:bg-gray-800 py-6 rounded-xl text-lg font-bold">
                  {loading === 'portal' ? 'Loading...' : 'Manage Subscription'}
                </Button>
              ) : (
                <Button
                  onClick={() => subscriptionStatus === 'active' ? handleSwitchPlan('monthly') : handleCheckout('monthly')}
                  disabled={loading === 'monthly' || loading === 'portal'}
                  className="w-full bg-black text-white hover:bg-gray-800 py-6 rounded-xl text-lg font-bold"
                >
                  {subscriptionStatus === 'active' ? 'Switch Plan' : (loading === 'monthly' ? 'Processing...' : 'Get Started')}
                </Button>
              )}
            </motion.div>

            {/* Yearly Plan */}
            <motion.div
              whileHover={{ y: -10 }}
              className={`bg-gradient-to-b from-gray-900 to-black text-white rounded-3xl p-8 border ${subscriptionStatus === 'active' && subscriptionInterval?.toLowerCase() === 'year' ? 'border-green-500' : 'border-gray-800'} flex flex-col relative overflow-hidden shadow-xl`}
            >
              {subscriptionStatus === 'active' && subscriptionInterval?.toLowerCase() === 'year' ? (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Current Plan
                </div>
              ) : (
                <div className="absolute top-4 right-4 bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Best Value
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Yearly</h3>
                <p className="text-gray-400">Save money with annual billing</p>
              </div>
              <div className="flex items-baseline mb-2">
                <span className="text-5xl font-bold">$6</span>
                <span className="text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">Billed $72 yearly</p>
              <ul className="space-y-4 mb-8 flex-1">
                {['All Monthly Features', 'Save $36 per year', 'Early access to new features'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                      <Check className="w-3 h-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              {subscriptionStatus === 'active' && subscriptionInterval?.toLowerCase() === 'year' ? (
                <Button onClick={handlePortal} disabled={loading === 'portal'} className="w-full bg-white text-black hover:bg-gray-200 py-6 rounded-xl text-lg font-bold">
                  {loading === 'portal' ? 'Loading...' : 'Manage Subscription'}
                </Button>
              ) : (
                <Button
                  onClick={() => subscriptionStatus === 'active' ? handleSwitchPlan('yearly') : handleCheckout('yearly')}
                  disabled={loading === 'yearly' || loading === 'portal'}
                  className="w-full bg-white text-black hover:bg-gray-200 py-6 rounded-xl text-lg font-bold"
                >
                  {subscriptionStatus === 'active' ? 'Switch Plan' : (loading === 'yearly' ? 'Processing...' : 'Get Started Yearly')}
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-black">Frequently Asked Questions</h2>
            <p className="text-gray-600 text-lg">Got questions? We&apos;ve got answers.</p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-medium">What is TextBehindImage?</AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base">
                TextBehindImage is an AI-powered tool that allows you to easily place text behind subjects in your photos. It automatically detects the subject and creates a depth effect, making your designs look professional in seconds.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-medium">Is it free to use?</AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base">
                Yes, we offer a free tier that allows you to try out the basic features. For unlimited edits, higher resolution exports, and advanced text effects, you can upgrade to our Pro plan.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-medium">How does the smart layering work?</AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base">
                We use advanced computer vision algorithms to analyze your image and separate the foreground subject from the background. This allows us to place text &quot;behind&quot; the subject while keeping it in front of the background.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-medium">Can I use my own images?</AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base">
                Absolutely! You can upload any image from your device. We support common formats like JPG, PNG, and WEBP.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger className="text-lg font-medium">What formats are supported for export?</AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base">
                You can export your final designs in high-quality PNG format, perfect for sharing on social media platforms like Instagram, TikTok, and YouTube.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <Image src="/images/wordmark.png" alt="TextBehindImage" width={150} height={30} className="h-8 w-auto object-contain" />
              </Link>
              <p className="text-gray-500 text-lg mb-8 max-w-md">
                The easiest way to add depth to your designs. Create viral-worthy content in seconds with our advanced AI tools.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465 1.067-.047 1.407-.06 4.123-.06h.08v.001zm0 1.802c-2.615 0-2.94.011-3.968.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.969v.08c0 2.615.011 2.94.058 3.968.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.968-.058v-.001zm0 4.378a5.317 5.317 0 110 10.634 5.317 5.317 0 010-10.634zm0 1.802a3.515 3.515 0 100 7.03 3.515 3.515 0 000-7.03zm5.336-5.759a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-black mb-6">Product</h4>
              <ul className="space-y-4 text-gray-600">
                <li><Link href="#features" className="hover:text-black transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-black transition-colors">Pricing</Link></li>
                <li><Link href="#faq" className="hover:text-black transition-colors">FAQ</Link></li>
                <li><Link href="/editor" className="hover:text-black transition-colors">Editor</Link></li>
                <li><Link href="#" className="hover:text-black transition-colors">Showcase</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-black mb-6">Company</h4>
              <ul className="space-y-4 text-gray-600">
                <li><Link href="/about" className="hover:text-black transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-black transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-black transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Vyshnav TR. All rights reserved.
            </p>
            <div className="flex gap-8 text-sm text-gray-600">
              <Link href="/privacy-policy" className="hover:text-black transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-black transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;