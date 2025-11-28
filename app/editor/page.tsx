'use client';

import { Slider } from '@/components/ui/slider';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { removeBackground } from "@imgly/background-removal";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Check, Download, Plus, Redo, Trash2, Type, Undo, Upload, Loader2, Sparkles, Crown, Coins, Infinity as InfinityIcon, User as UserIcon, LogOut, Copy, FlipHorizontal, FlipVertical, Bold, Italic, Underline, Strikethrough, CaseUpper, CaseLower } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { auth } from '@/app/firebase';
import { PricingDialog } from '@/components/PricingDialog';

import { logAnalyticsEvent } from '@/app/utils/analytics';

interface GoogleFont {
    family: string;
    // Add other properties if needed
}

interface GoogleFontsResponse {
    items: GoogleFont[];
}

interface FontSelectorProps {
    value: string;
    onChange: (font: string) => void;
    fonts: string[];
}



interface FilterSettings {
    filter: string;
    intensity: number;
    saturation: number;
    hue: number;
    exposure: number;
    highlights: number;
    shadows: number;
    temperature: number;
    sharpen: number;
}

// New comprehensive filter builder
const buildFilterString = (settings: FilterSettings) => {
    const filters: string[] = [];

    // Basic filter (if not 'none')
    if (settings.filter !== 'none') {
        switch (settings.filter) {
            case 'brightness':
                filters.push(`brightness(${settings.intensity}%)`);
                break;
            case 'contrast':
                filters.push(`contrast(${settings.intensity}%)`);
                break;
            case 'grayscale':
                filters.push(`grayscale(${settings.intensity}%)`);
                break;
            case 'sepia':
                filters.push(`sepia(${settings.intensity}%)`);
                break;
            case 'blur':
                filters.push(`blur(${settings.intensity / 10}px)`);
                break;
        }
    }

    // Color Adjustments
    if (settings.saturation !== 0) {
        filters.push(`saturate(${100 + settings.saturation}%)`);
    }
    if (settings.hue !== 0) {
        filters.push(`hue-rotate(${settings.hue}deg)`);
    }

    // Lighting Adjustments
    if (settings.exposure !== 0) {
        filters.push(`brightness(${100 + settings.exposure}%)`);
    }
    if (settings.highlights !== 0 || settings.shadows !== 0) {
        // Note: CSS filters don't have direct shadows/highlights control
        // We approximate with brightness/contrast
        const brightnessAdjust = (settings.highlights + settings.shadows) / 2;
        const contrastAdjust = settings.highlights - settings.shadows;
        if (brightnessAdjust !== 0) filters.push(`brightness(${100 + brightnessAdjust}%)`);
        if (contrastAdjust !== 0) filters.push(`contrast(${100 + contrastAdjust}%)`);
    }

    // Temperature (approximation using hue-rotate and saturation)
    if (settings.temperature !== 0) {
        // Warm: orange tint, Cool: blue tint
        const tempHue = settings.temperature * 0.3; // Scale down
        const tempSat = Math.abs(settings.temperature) * 0.2;
        filters.push(`hue-rotate(${tempHue}deg)`);
        filters.push(`saturate(${100 + tempSat}%)`);
    }

    // Sharpen (using contrast as approximation since CSS doesn't have direct sharpen)
    if (settings.sharpen !== 0) {
        filters.push(`contrast(${100 + settings.sharpen}%)`);
    }

    return filters.length > 0 ? filters.join(' ') : 'none';
};

const FontSelector = ({ value, onChange, fonts }: FontSelectorProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(50);
    const observer = useRef<IntersectionObserver | null>(null);

    const filteredFonts = fonts.filter(font =>
        font.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setDisplayLimit((prev) => Math.min(prev + 50, filteredFonts.length));
            }
        }, { threshold: 0.1, rootMargin: '100px' });

        if (node) observer.current.observe(node);
    }, [filteredFonts]);

    useEffect(() => {
        setDisplayLimit(50);
    }, [searchTerm]);

    useEffect(() => {
        // Load only visible fonts
        const fontsToLoad = filteredFonts.slice(0, displayLimit);
        fontsToLoad.forEach(font => {
            const fontId = `font-${font.replace(/\s+/g, '-')}`;
            if (!document.getElementById(fontId)) {
                const link = document.createElement('link');
                link.id = fontId;
                link.href = `https://fonts.googleapis.com/css?family=${font.replace(/\s+/g, '+')}`;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
        });
    }, [displayLimit, filteredFonts]);

    useEffect(() => {
        if (isOpen && value) {
            const index = filteredFonts.findIndex(f => f === value);
            if (index !== -1) {
                // Ensure it's rendered
                if (index >= displayLimit) {
                    setDisplayLimit(index + 20);
                }
                // Scroll into view
                setTimeout(() => {
                    const el = document.getElementById(`font-item-${value.replace(/\s+/g, '-')}`);
                    if (el) {
                        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }
                }, 100);
            }
        }
    }, [isOpen, value, filteredFonts, displayLimit]);


    const handleFontSelect = (font: string) => {
        onChange(font);
        setIsOpen(false);
    };

    return (
        <div className="space-y-2">
            <Label htmlFor="font-selector">Font Family</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <div
                        className="border rounded-md p-2 cursor-pointer hover:bg-accent transition-colors"
                        style={{ fontFamily: value }}
                    >
                        {value || 'Select a font'}
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" side="left" align="start">
                    <div className="p-2 border-b">
                        <Input
                            type="text"
                            placeholder="Search font family..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <ScrollArea className="h-[300px]">
                        {filteredFonts.slice(0, displayLimit).map((font) => (
                            <div
                                key={font}
                                id={`font-item-${font.replace(/\s+/g, '-')}`}
                                className={`p-2 cursor-pointer transition-colors px-4 flex items-center justify-between ${font === value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                                    }`}
                                style={{ fontFamily: font }}
                                onClick={() => handleFontSelect(font)}
                            >
                                <span>{font}</span>
                                {font === value && <Check className="h-4 w-4" />}
                            </div>
                        ))}
                        {filteredFonts.length > displayLimit && (
                            <div ref={lastElementRef} className="h-10 w-full flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-xs text-muted-foreground">Loading more fonts...</span>
                            </div>
                        )}
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
    );
};
interface TextItem {
    id: number;
    text: string;
    fontFamily: string;
    textColor: string;
    gradientColor1: string;
    gradientColor2: string;
    useGradient: boolean;
    xPosition: number;
    yPosition: number;
    textSize: number;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrikethrough: boolean;
    textAlign: 'left' | 'center' | 'right';
    textOpacity: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
    rotation: number;
    isForeground: boolean;
    gradientAngle: number;
    textTransform: 'none' | 'uppercase' | 'lowercase';
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    strokeColor: string;
    strokeWidth: number;
    letterSpacing: number;
    curveStrength: number;
    skewX: number;
    skewY: number;
    extrusionDepth: number;
    extrusionColor: string;
    extrusionAngle: number;
}

type HistoryEntry = TextItem[];

const ImageEditorPage = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [items, setItems] = useState<TextItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);
    const [, setError] = useState(null);
    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showClearAllDialog, setShowClearAllDialog] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [layerSettings, setLayerSettings] = useState({
        background: {
            filter: 'none',
            intensity: 100,
            saturation: 0,
            hue: 0,
            temperature: 0,
            shadows: 0,
            highlights: 0,
            exposure: 0,
            vignette: 0,
            sharpen: 0,
            noise: 0,
            rotation: 0,
            scale: 100
        },
        foreground: {
            filter: 'none',
            intensity: 100,
            saturation: 0,
            hue: 0,
            temperature: 0,
            shadows: 0,
            highlights: 0,
            exposure: 0,
            vignette: 0,
            sharpen: 0,
            noise: 0,
            rotation: 0,
            scale: 100
        }
    });
    const [activeImageTab, setActiveImageTab] = useState<'background' | 'foreground'>('background');
    const [activeTab, setActiveTab] = useState('text');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cache loaded images to prevent flickering
    const originalImgRef = useRef<HTMLImageElement | null>(null);
    const processedImgRef = useRef<HTMLImageElement | null>(null);
    const [isForegroundLoaded, setIsForegroundLoaded] = useState(false);


    const [, setDominantColors] = useState<string[]>([]);
    const [fonts, setFonts] = useState<string[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);

    // Credit System State
    const [credits, setCredits] = useState<number>(0);
    const [subscriptionStatus, setSubscriptionStatus] = useState('free');
    const [dodoCustomerId, setDodoCustomerId] = useState<string | undefined>(undefined);
    const [dodoSubscriptionId, setDodoSubscriptionId] = useState<string | undefined>(undefined);
    const [subscriptionInterval, setSubscriptionInterval] = useState<string | undefined>(undefined);
    const [showPricingDialog, setShowPricingDialog] = useState(false);
    const [isCreditsLoading, setIsCreditsLoading] = useState(true);
    const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('Auto editing...');

    const router = useRouter();

    useEffect(() => {
        logAnalyticsEvent('page_view', { page_title: 'Editor Page' });
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/');
            } else {
                // Fetch credits
                setIsCreditsLoading(true);
                fetch(`/api/user/credits?uid=${user.uid}`)
                    .then(res => res.json())
                    .then(data => {
                        setCredits(data.credits);
                        setSubscriptionStatus(data.subscriptionStatus);
                        setDodoCustomerId(data.dodoCustomerId);
                        setDodoSubscriptionId(data.dodoSubscriptionId);
                        setSubscriptionInterval(data.subscriptionInterval);
                    })
                    .finally(() => {
                        setIsCreditsLoading(false);
                    });
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Check for success param from Stripe
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            // Refresh credits
            if (auth.currentUser) {
                fetch(`/api/user/credits?uid=${auth.currentUser.uid}`)
                    .then(res => res.json())
                    .then(data => {
                        setCredits(data.credits);
                        setSubscriptionStatus(data.subscriptionStatus);
                        setDodoCustomerId(data.dodoCustomerId);
                        setDodoSubscriptionId(data.dodoSubscriptionId);
                        setSubscriptionInterval(data.subscriptionInterval);
                        setSubscriptionInterval(data.subscriptionInterval);

                        // Trigger confetti
                        const duration = 3 * 1000;
                        const animationEnd = Date.now() + duration;
                        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

                        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

                        const interval: NodeJS.Timeout = setInterval(function () {
                            const timeLeft = animationEnd - Date.now();

                            if (timeLeft <= 0) {
                                return clearInterval(interval);
                            }

                            const particleCount = 50 * (timeLeft / duration);
                            confetti({
                                ...defaults,
                                particleCount,
                                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                            });
                            confetti({
                                ...defaults,
                                particleCount,
                                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                            });
                        }, 250);

                        // Clear URL param
                        window.history.replaceState({}, '', '/editor');
                    });
            }
        }
    }, []);

    useEffect(() => {
        // Fetch fonts from Google Fonts API
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY;
        fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}`)
            .then(response => response.json())
            .then((data: GoogleFontsResponse) => {
                setFonts(data.items.map((item: GoogleFont) => item.family));
            });
    }, []);

    useEffect(() => {
        // Moved auth check to the combined effect above
    }, [router]);

    const extractColors = useCallback((imageUrl: string) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Resize to speed up processing
            const scale = Math.min(1, 100 / Math.max(img.width, img.height));
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colorCounts: { [key: string]: number } = {};

            // Build histogram
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const a = imageData[i + 3];

                if (a < 128) continue; // Skip transparent pixels

                // Quantize colors to group similar ones (round to nearest 10)
                const qR = Math.round(r / 10) * 10;
                const qG = Math.round(g / 10) * 10;
                const qB = Math.round(b / 10) * 10;

                const key = `${qR},${qG},${qB}`;
                colorCounts[key] = (colorCounts[key] || 0) + 1;
            }

            // Sort by frequency
            const sortedColors = Object.entries(colorCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([key]) => {
                    const [r, g, b] = key.split(',').map(Number);
                    return { r, g, b, hex: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}` };
                });

            // Select distinct colors
            const distinctColors: string[] = [];
            const minDistance = 50; // Minimum Euclidean distance between colors

            for (const color of sortedColors) {
                if (distinctColors.length >= 7) break;

                const isDistinct = distinctColors.every(existingHex => {
                    const r2 = parseInt(existingHex.slice(1, 3), 16);
                    const g2 = parseInt(existingHex.slice(3, 5), 16);
                    const b2 = parseInt(existingHex.slice(5, 7), 16);

                    const dist = Math.sqrt(
                        Math.pow(color.r - r2, 2) +
                        Math.pow(color.g - g2, 2) +
                        Math.pow(color.b - b2, 2)
                    );
                    return dist >= minDistance;
                });

                if (isDistinct) {
                    distinctColors.push(color.hex);
                }
            }

            // Fill with more colors if we don't have enough (relaxing distance)
            if (distinctColors.length < 7) {
                for (const color of sortedColors) {
                    if (distinctColors.length >= 7) break;
                    if (!distinctColors.includes(color.hex)) {
                        distinctColors.push(color.hex);
                    }
                }
            }

            // Always ensure white and black are available if they are not dominant? 
            // User asked for "auto picked", so let's stick to what's in the image.
            // But maybe ensure we have at least some colors.

            setDominantColors(sortedColors.slice(0, 5).map(c => c.hex));
        };
    }, [setDominantColors]);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);

    // ... existing code ...

    const toggleFlipHorizontal = () => {
        setFlipHorizontal(!flipHorizontal);
    };

    const toggleFlipVertical = () => {
        setFlipVertical(!flipVertical);
    };

    const handleProFeature = (callback: () => void) => {
        if (subscriptionStatus === 'active') {
            callback();
        } else {
            setShowPricingDialog(true);
        }
    };

    const addToHistory = useCallback((newItems: TextItem[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newItems);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);


    const addNewItem = useCallback((width = 500, height = 500) => {
        const newItem: TextItem = {
            id: Date.now(),
            text: 'Sample Text',
            fontFamily: 'Inter',
            textColor: '#ffffff',
            gradientColor1: '#ffffff',
            gradientColor2: '#000000',
            useGradient: false,
            xPosition: Math.round(width / 2),
            yPosition: Math.round(height / 2),
            textSize: Math.round(Math.min(width, height) / 4),
            isBold: false,
            isItalic: false,
            isUnderline: false,
            isStrikethrough: false,
            textAlign: 'center',
            textOpacity: 1,
            flipHorizontal: false,
            flipVertical: false,
            rotation: 0,
            isForeground: false,
            gradientAngle: 90,
            textTransform: 'none',
            shadowColor: '#000000',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            strokeColor: '#000000',
            strokeWidth: 0,
            letterSpacing: 0,
            curveStrength: 0,
            skewX: 0,
            skewY: 0,
            extrusionDepth: 0,
            extrusionColor: '#000000',
            extrusionAngle: 45
        };
        setItems(prevItems => [...prevItems, newItem]);
        addToHistory([...items, newItem]);
    }, [items, addToHistory]);
    const toggleForeground = (id: number) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, isForeground: !item.isForeground } : item
        );
        setItems(updatedItems);
        addToHistory(updatedItems);
    };
    const toggleGradient = (id: number) => {
        handleProFeature(() => {
            const updatedItems = items.map(item =>
                item.id === id ? { ...item, useGradient: !item.useGradient } : item
            );
            setItems(updatedItems);
            addToHistory(updatedItems);
        });
    };

    const toggleFlipHorizontalText = (id: number) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, flipHorizontal: !item.flipHorizontal } : item
        );
        setItems(updatedItems);
        addToHistory(updatedItems);
    };

    const toggleFlipVerticalText = (id: number) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, flipVertical: !item.flipVertical } : item
        );
        setItems(updatedItems);
        addToHistory(updatedItems);
    };

    const rotateText = (id: number, angle: number) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, rotation: (item.rotation + angle) % 360 } : item
        );
        setItems(updatedItems);
        addToHistory(updatedItems);
    };
    const updateItem = (id: number, field: keyof TextItem, value: TextItem[keyof TextItem]) => {
        const proFields: (keyof TextItem)[] = ['extrusionDepth', 'extrusionColor', 'extrusionAngle', 'curveStrength', 'skewX', 'skewY', 'letterSpacing'];

        if (proFields.includes(field)) {
            handleProFeature(() => {
                const updatedItems = items.map(item =>
                    item.id === id ? { ...item, [field]: value } : item
                );
                setItems(updatedItems);
                addToHistory(updatedItems);
            });
            return;
        }

        const updatedItems = items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        setItems(updatedItems);
        addToHistory(updatedItems);
    };

    const deleteItem = (id: number) => {
        const updatedItems = items.filter(item => item.id !== id);
        setItems(updatedItems);
        addToHistory(updatedItems);
    };

    const duplicateItem = (id: number) => {
        const itemToDuplicate = items.find(item => item.id === id);
        if (itemToDuplicate) {
            const newItem = { ...itemToDuplicate, id: Date.now() };
            const updatedItems = [...items, newItem];
            setItems(updatedItems);
            addToHistory(updatedItems);
        }
    };



    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setItems(history[historyIndex - 1]);
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setItems(history[historyIndex + 1]);
        }
    }, [history, historyIndex]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
            const isCmdOrCtrl = e.metaKey || e.ctrlKey;

            if (isCmdOrCtrl && e.shiftKey && e.key === 'z') {
                // Cmd+Shift+Z or Ctrl+Shift+Z for Redo
                e.preventDefault();
                redo();
            } else if (isCmdOrCtrl && e.key === 'z') {
                // Cmd+Z or Ctrl+Z for Undo
                e.preventDefault();
                undo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [historyIndex, history, redo, undo]);

    // Paste functionality for Ctrl+V / Cmd+V



    // ... existing code ...

    // Utility function to convert image to a supported format (PNG)
    const convertImageToSupportedFormat = async (input: File | Blob | string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to convert image'));
                    }
                }, 'image/png');
            };
            img.onerror = () => reject(new Error('Failed to load image'));

            if (typeof input === 'string') {
                img.src = input;
            } else {
                const url = URL.createObjectURL(input);
                img.src = url;
            }
        });
    };

    // Unified function to process image files from any source
    const processImageFile = useCallback(async (file: File | Blob) => {
        setIsLoading(true);
        setError(null);

        try {
            // Convert to supported format if needed
            let processedBlob: Blob;
            if (file.type && !file.type.startsWith('image/')) {
                throw new Error('Invalid file type');
            }

            // Convert to PNG to ensure compatibility
            try {
                processedBlob = await convertImageToSupportedFormat(file);
            } catch (conversionError) {
                console.error('Error converting image:', conversionError);
                processedBlob = file; // Fallback to original if conversion fails
            }

            // Read and display the image
            const reader = new FileReader();
            reader.onload = async (event: ProgressEvent<FileReader>) => {
                if (event.target && event.target.result) {
                    setOriginalImage(event.target.result as string);
                    const img = new Image();
                    img.onload = () => {
                        setImageWidth(img.width);
                        setImageHeight(img.height);

                        // Auto-zoom small images to fit better in viewport
                        // Assume a typical viewport of ~800x600 for the canvas area
                        const viewportWidth = 800;
                        const viewportHeight = 600;
                        const targetFill = 0.8; // Fill 80% of viewport

                        const scaleToFitWidth = (viewportWidth * targetFill) / img.width;
                        const scaleToFitHeight = (viewportHeight * targetFill) / img.height;
                        const autoZoom = Math.min(scaleToFitWidth, scaleToFitHeight);

                        // Only zoom in if image is smaller than viewport, cap at 2x
                        const initialZoom = Math.min(Math.max(autoZoom, 1), 2);
                        setZoom(initialZoom);

                        setIsLoading(false);
                        addNewItem(img.width, img.height);
                        if (event.target && event.target.result) {
                            extractColors(event.target.result as string);
                        }
                    };
                    img.src = event.target.result as string;

                    // Start background removal process
                    if (subscriptionStatus !== 'active' && credits <= 0) {
                        setShowPricingDialog(true);
                        setIsLoading(false);
                        return;
                    }

                    setIsRemovingBackground(true);
                    setBackgroundRemovalProgress(0);
                    setLoadingStatus('Initializing...');
                    try {
                        // Deduct credit if not pro
                        if (subscriptionStatus !== 'active' && auth.currentUser) {
                            const res = await fetch('/api/user/credits', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ uid: auth.currentUser.uid })
                            });
                            const data = await res.json();
                            if (!data.success) {
                                throw new Error(data.error || 'Insufficient credits');
                            }
                            setCredits(data.remainingCredits);
                        }

                        setLoadingStatus('Removing background (local)...');

                        // Use client-side background removal
                        const blob = await removeBackground(processedBlob, {
                            progress: (key, current, total) => {
                                const progress = Math.round((current / total) * 100);
                                setBackgroundRemovalProgress(progress);
                                setLoadingStatus(`Processing: ${progress}%`);
                            }
                        });

                        const url = URL.createObjectURL(blob);
                        setProcessedImage(url);
                    } catch (err) {
                        console.error('Error removing background:', err);
                    } finally {
                        setIsRemovingBackground(false);
                        setBackgroundRemovalProgress(0);
                    }
                }
            };
            reader.readAsDataURL(processedBlob);
        } catch (err) {
            console.error('Error processing image:', err);
            setIsLoading(false);
        }
    }, [subscriptionStatus, credits, addNewItem, extractColors]);

    // Paste functionality for Ctrl+V / Cmd+V
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        await processImageFile(file);
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [processImageFile]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file) return;
        await processImageFile(file);
    };

    // Drag and drop handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                await processImageFile(file);
            }
        }
    };

    // ... rest of the code ...

    const captureAndSaveImage = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'text-behind-image.png';
            link.href = dataUrl;
            link.click();
        } else {
            console.error('Canvas is not available');
        }
    };

    const clearAllItems = () => {
        setShowClearAllDialog(true);
    };

    const confirmClearAllItems = () => {
        setItems([]);
        addToHistory([]);
        setShowClearAllDialog(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeImage = () => {
        setShowDeleteDialog(true);

    };

    const confirmRemoveImage = () => {
        setOriginalImage(null);
        setProcessedImage(null);
        setItems([]);
        setImageWidth(0);
        setImageHeight(0);
        setZoom(1);
        setHistory([]);
        setHistoryIndex(-1);
        setLayerSettings({
            background: {
                filter: 'none',
                intensity: 100,
                saturation: 0,
                hue: 0,
                temperature: 0,
                shadows: 0,
                highlights: 0,
                exposure: 0,
                vignette: 0,
                sharpen: 0,
                noise: 0,
                rotation: 0,
                scale: 100
            },
            foreground: {
                filter: 'none',
                intensity: 100,
                saturation: 0,
                hue: 0,
                temperature: 0,
                shadows: 0,
                highlights: 0,
                exposure: 0,
                vignette: 0,
                sharpen: 0,
                noise: 0,
                rotation: 0,
                scale: 100
            }
        });
        setActiveImageTab('background');
        setShowDeleteDialog(false);
        if (isFilterOpen) {
            toggleFilterSection();
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleZoomIn = () => {
        setZoom(prevZoom => Math.min(prevZoom + 0.2, 3));
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleZoomOut = () => {
        setZoom(prevZoom => Math.max(prevZoom - 0.2, 0.5));
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _applyFilter = (ctx: CanvasRenderingContext2D, filterName: string, filterValue: number) => {
        switch (filterName) {
            case 'brightness':
                ctx.filter = `brightness(${filterValue}%)`;
                break;
            case 'contrast':
                ctx.filter = `contrast(${filterValue}%)`;
                break;
            case 'grayscale':
                ctx.filter = `grayscale(${filterValue}%)`;
                break;
            case 'sepia':
                ctx.filter = `sepia(${filterValue}%)`;
                break;
            case 'blur':
                ctx.filter = `blur(${filterValue / 10}px)`;
                break;
            default:
                ctx.filter = 'none';
        }
    };

    // Helper to draw vignette overlay
    const drawVignette = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
        if (intensity === 0) return;

        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.7
        );

        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity / 100})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    };

    // Helper to draw noise overlay
    const drawNoise = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
        if (intensity === 0) return;

        try {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const amount = intensity * 2.55; // Scale to 0-255

            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * amount;
                data[i] += noise;     // R
                data[i + 1] += noise; // G
                data[i + 2] += noise; // B
            }

            ctx.putImageData(imageData, 0, 0);
        } catch (e) {
            // Silently fail if we can't access image data (CORS, etc.)
            console.warn('Could not apply noise effect:', e);
        }
    };

    const toggleFilterSection = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const drawText = useCallback((ctx: CanvasRenderingContext2D, isForeground: boolean) => {
        items.forEach(item => {
            if (item.isForeground === isForeground) {
                ctx.save();
                const fontStyle = item.isItalic ? 'italic' : 'normal';
                const fontWeight = item.isBold ? 'bold' : 'normal';
                ctx.font = `${fontStyle} ${fontWeight} ${item.textSize * zoom}px "${item.fontFamily}"`;
                ctx.globalAlpha = item.textOpacity;

                // Removed blendMode application

                // Apply rotation and position
                ctx.translate(item.xPosition * zoom, item.yPosition * zoom);
                ctx.rotate(item.rotation * Math.PI / 180);

                // Apply flips
                ctx.scale(item.flipHorizontal ? -1 : 1, item.flipVertical ? -1 : 1);

                // Apply Skew
                if (item.skewX || item.skewY) {
                    ctx.transform(1, (item.skewY || 0) * Math.PI / 180, (item.skewX || 0) * Math.PI / 180, 1, 0, 0);
                }

                ctx.textAlign = item.textAlign;
                ctx.textBaseline = 'middle';

                // Apply text transformation
                let displayText = item.text;
                if (item.textTransform === 'uppercase') {
                    displayText = item.text.toUpperCase();
                } else if (item.textTransform === 'lowercase') {
                    displayText = item.text.toLowerCase();
                }

                // Prepare Fill Style (Gradient or Color)
                if (item.useGradient) {
                    const textWidth = ctx.measureText(displayText).width;
                    const textHeight = item.textSize; // Approximate height

                    // Calculate gradient vector based on angle
                    const angleRad = (item.gradientAngle * Math.PI) / 180;
                    const r = Math.sqrt(textWidth * textWidth + textHeight * textHeight) / 2;

                    const x1 = -r * Math.cos(angleRad);
                    const y1 = -r * Math.sin(angleRad);
                    const x2 = r * Math.cos(angleRad);
                    const y2 = r * Math.sin(angleRad);

                    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                    gradient.addColorStop(0, item.gradientColor1);
                    gradient.addColorStop(1, item.gradientColor2);
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = item.textColor;
                }

                // Set Shadow & Stroke styles
                ctx.shadowColor = item.shadowColor;
                ctx.shadowBlur = item.shadowBlur * zoom;
                ctx.shadowOffsetX = item.shadowOffsetX * zoom;
                ctx.shadowOffsetY = item.shadowOffsetY * zoom;
                ctx.lineWidth = (item.strokeWidth || 0) * zoom;
                ctx.strokeStyle = item.strokeColor || '#000000';
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                (ctx.canvas.style as CSSStyleDeclaration & { letterSpacing: string }).letterSpacing = `${item.letterSpacing || 0}px`;


                // --- DRAWING HELPER ---
                const drawTextLayer = (offsetX: number, offsetY: number, color: string | CanvasGradient, isMainLayer: boolean) => {
                    ctx.save();

                    // Apply global opacity only to the main layer or reduce it for shadow layers if needed
                    // For 3D block, usually we want it solid or same opacity

                    if (!isMainLayer) {
                        // 3D Layer style
                        ctx.fillStyle = color;
                        // Disable shadow/stroke for extrusion layers to keep it clean
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.lineWidth = 0;
                    } else {
                        // Main Layer style
                        ctx.fillStyle = color;
                        // Restore shadow/stroke
                        ctx.shadowColor = item.shadowColor;
                        ctx.shadowBlur = item.shadowBlur * zoom;
                        ctx.shadowOffsetX = item.shadowOffsetX * zoom;
                        ctx.shadowOffsetY = item.shadowOffsetY * zoom;
                        ctx.lineWidth = (item.strokeWidth || 0) * zoom;
                        ctx.strokeStyle = item.strokeColor || '#000000';
                    }

                    if (item.curveStrength && Math.abs(item.curveStrength) > 1) {
                        // CURVED TEXT RENDERING (True Arc)
                        const totalAngleRad = (item.curveStrength * Math.PI) / 180;

                        let totalTextWidth = 0;
                        const charWidths: number[] = [];
                        const spacing = item.letterSpacing || 0;

                        for (let i = 0; i < displayText.length; i++) {
                            const w = ctx.measureText(displayText[i]).width;
                            charWidths.push(w);
                            totalTextWidth += w;
                            if (i < displayText.length - 1) totalTextWidth += spacing;
                        }

                        const radius = totalTextWidth / totalAngleRad;

                        ctx.textAlign = 'center';
                        let currentAngle = -totalAngleRad / 2;

                        for (let i = 0; i < displayText.length; i++) {
                            const char = displayText[i];
                            const charWidth = charWidths[i];
                            const charAngle = charWidth / radius;
                            const drawAngle = currentAngle + charAngle / 2;

                            ctx.save();
                            // Apply 3D offset BEFORE rotation for straight extrusion, 
                            // OR apply after for radial extrusion?
                            // Standard 3D text usually extrudes in one direction (e.g. bottom-right) regardless of rotation.
                            // So we translate by offset first? No, we are inside the context which is already translated/rotated.
                            // We want the extrusion to be in screen space or object space?
                            // Usually object space (relative to text).

                            // For curved text, "down" changes direction.
                            // If we want a solid block, we should probably extrude in the direction of the radius?
                            // Or just a fixed angle relative to the canvas?
                            // Let's stick to fixed angle relative to the text item's coordinate system for now.

                            // Move to center of arc
                            ctx.translate(0, radius);
                            ctx.rotate(drawAngle);
                            ctx.translate(0, -radius);

                            // Apply extrusion offset here
                            ctx.translate(offsetX, offsetY);

                            if (isMainLayer && item.strokeWidth > 0) ctx.strokeText(char, 0, 0);
                            ctx.fillText(char, 0, 0);

                            ctx.restore();

                            const spacingAngle = spacing / radius;
                            currentAngle += charAngle + spacingAngle;
                        }

                    } else {
                        // STANDARD RENDERING
                        // Apply offset
                        ctx.translate(offsetX, offsetY);

                        if (isMainLayer && item.strokeWidth > 0) {
                            ctx.strokeText(displayText, 0, 0);
                        }
                        ctx.fillText(displayText, 0, 0);

                        // Decorations
                        if (isMainLayer && (item.isUnderline || item.isStrikethrough)) {
                            const metrics = ctx.measureText(displayText);
                            const width = metrics.width;
                            let xStart = 0;

                            if (item.textAlign === 'center') xStart = -width / 2;
                            else if (item.textAlign === 'right') xStart = -width;
                            else xStart = 0;

                            ctx.lineWidth = Math.max(1, item.textSize / 15);
                            ctx.strokeStyle = ctx.fillStyle;
                            ctx.shadowBlur = 0;
                            ctx.shadowOffsetX = 0;
                            ctx.shadowOffsetY = 0;

                            if (item.isUnderline) {
                                ctx.beginPath();
                                const yOffset = item.textSize * 0.4;
                                ctx.moveTo(xStart, yOffset);
                                ctx.lineTo(xStart + width, yOffset);
                                ctx.stroke();
                            }

                            if (item.isStrikethrough) {
                                ctx.beginPath();
                                ctx.moveTo(xStart, 0);
                                ctx.lineTo(xStart + width, 0);
                                ctx.stroke();
                            }
                        }
                    }
                    ctx.restore();
                };

                // --- RENDER LOOP ---

                const mainFillStyle = ctx.fillStyle;

                // 1. Draw Extrusion Layers (Back to Front)
                if (item.extrusionDepth > 0) {
                    const depth = item.extrusionDepth * zoom; // Scale depth with zoom
                    const angleRad = (item.extrusionAngle * Math.PI) / 180;

                    // Optimization: Don't draw every single pixel if depth is huge?
                    // For now, step 1 is fine for quality.
                    const step = 1;

                    for (let i = depth; i > 0; i -= step) {
                        const dx = i * Math.cos(angleRad);
                        const dy = i * Math.sin(angleRad);
                        drawTextLayer(dx, dy, item.extrusionColor || '#000000', false);
                    }
                }

                // 2. Draw Main Text Layer
                drawTextLayer(0, 0, mainFillStyle, true);

                ctx.restore();
            }
        });
    }, [items, zoom]);

    // Preload and cache images
    useEffect(() => {
        if (originalImage) {
            const img = new Image();
            img.onload = () => {
                originalImgRef.current = img;
            };
            img.src = originalImage;
        }
    }, [originalImage]);

    useEffect(() => {
        if (processedImage) {
            setIsForegroundLoaded(false);
            const img = new Image();
            img.onload = () => {
                processedImgRef.current = img;
                setIsForegroundLoaded(true);
            };
            img.src = processedImage;
        } else {
            processedImgRef.current = null;
            setIsForegroundLoaded(false);
        }
    }, [processedImage]);

    // Render canvas
    useEffect(() => {
        if (originalImage && originalImgRef.current) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = originalImgRef.current;
            canvas.width = img.width * zoom;
            canvas.height = img.height * zoom;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Apply flips
            ctx.save();
            ctx.translate(flipHorizontal ? canvas.width : 0, flipVertical ? canvas.height : 0);
            ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

            // Draw original image (Background) with all adjustments
            ctx.save();

            // Apply transform (rotation, scale)
            const bgSettings = layerSettings.background;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((bgSettings.rotation * Math.PI) / 180);
            ctx.scale(bgSettings.scale / 100, bgSettings.scale / 100);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);

            // Apply filters
            ctx.filter = buildFilterString(bgSettings);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';

            // Apply vignette
            drawVignette(ctx, canvas.width, canvas.height, bgSettings.vignette);

            // Apply noise
            if (bgSettings.noise > 0) {
                drawNoise(ctx, canvas.width, canvas.height, bgSettings.noise);
            }

            ctx.restore();

            // Draw background text items
            drawText(ctx, false);

            // Draw processed image (Foreground) if available with all adjustments
            if (processedImgRef.current) {
                ctx.save();

                // Apply transform (rotation, scale)
                const fgSettings = layerSettings.foreground;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((fgSettings.rotation * Math.PI) / 180);
                ctx.scale(fgSettings.scale / 100, fgSettings.scale / 100);
                ctx.translate(-canvas.width / 2, -canvas.height / 2);

                // Apply filters
                ctx.filter = buildFilterString(fgSettings);
                ctx.drawImage(processedImgRef.current, 0, 0, canvas.width, canvas.height);
                ctx.filter = 'none';

                // Apply vignette
                drawVignette(ctx, canvas.width, canvas.height, fgSettings.vignette);

                // Apply noise
                if (fgSettings.noise > 0) {
                    drawNoise(ctx, canvas.width, canvas.height, fgSettings.noise);
                }

                ctx.restore();
            }

            // Draw foreground text items
            drawText(ctx, true);

            ctx.restore();
        }
    }, [originalImage, processedImage, items, zoom, layerSettings, flipHorizontal, flipVertical, drawText, isForegroundLoaded]);


    // Helper function to draw text




    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-card border-b flex items-center justify-between px-4 lg:px-6 z-10">
                    <Link href="/" className="text-xl font-bold tracking-tighter flex items-center gap-2">
                        <div className="relative h-6 w-32">
                            <NextImage
                                src="/images/wordmark.png"
                                alt="TextBehindImage"
                                fill
                                className="object-contain dark:invert"
                            />
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        {/* Export Button */}
                        {originalImage && (
                            <Button
                                size="sm"
                                variant="default"
                                className="hidden lg:flex bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white/90 text-white dark:text-black"
                                onClick={() => {
                                    logAnalyticsEvent('export_image');
                                    captureAndSaveImage();
                                }}
                            >
                                <Download className="w-4 h-4 lg:mr-2" />
                                <span className="hidden lg:inline">Export</span>
                            </Button>
                        )}

                        {/* Credits & Upgrade */}
                        {isCreditsLoading ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-secondary px-3 py-1 rounded-full">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        ) : subscriptionStatus === 'active' ? (
                            <div className="flex items-center text-amber-500 font-medium bg-amber-500/10 px-3 py-1 rounded-full text-sm">
                                <InfinityIcon className="w-4 h-4 mr-2" />
                                Infinite Credits
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center text-muted-foreground text-sm bg-secondary px-3 py-1 rounded-full">
                                    <Coins className="w-4 h-4 mr-1.5 lg:mr-2" />
                                    {credits} <span className="hidden lg:inline ml-1">Credits</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                                    onClick={() => {
                                        logAnalyticsEvent('upgrade_click', { source: 'navbar' });
                                        setShowPricingDialog(true);
                                    }}
                                >
                                    <Crown className="w-4 h-4 lg:mr-2" />
                                    <span className="hidden lg:inline">Upgrade</span>
                                </Button>
                            </div>
                        )}

                        {/* Profile & Logout */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={auth.currentUser?.photoURL || ''} alt={auth.currentUser?.displayName || ''} />
                                        <AvatarFallback>{auth.currentUser?.displayName?.charAt(0) || <UserIcon className="h-4 w-4" />}</AvatarFallback>
                                    </Avatar>
                                    {subscriptionStatus === 'active' && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-[2px] border-2 border-background">
                                            <Crown className="w-2 h-2 fill-current" />
                                        </div>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="end" forceMount>
                                <div className="grid gap-4">
                                    <div className="font-medium truncate">{auth.currentUser?.displayName || auth.currentUser?.email}</div>
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            signOut(auth).then(() => router.push('/'));
                                        }}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </header>

                {/* Workspace */}
                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-secondary/30">

                    {/* Canvas Container */}
                    <div
                        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 lg:p-8 min-h-[50vh] lg:min-h-0"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        {/* Dot Pattern Background */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{
                                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                                backgroundSize: '20px 20px'
                            }}
                        />

                        {/* Floating Canvas Controls */}
                        {originalImage && (
                            <>
                                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-card border shadow-lg rounded-full px-4 py-2 flex items-center space-x-2 z-20">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={undo}
                                        disabled={historyIndex <= 0}
                                    >
                                        <Undo className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={redo}
                                        disabled={historyIndex >= history.length - 1}
                                    >
                                        <Redo className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                                    {/* Export Button - Mobile Only */}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="lg:hidden h-9 w-9 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md border shadow-sm hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-all duration-300"
                                        onClick={captureAndSaveImage}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>

                                    {/* Delete Button */}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md border shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900 transition-all duration-300"
                                        onClick={_removeImage}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* The Canvas */}
                        <div className={`relative shadow-2xl rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm transition-all duration-200 ease-out ${isDragOver && !originalImage ? 'ring-4 ring-primary ring-offset-2 scale-105' : ''}`}
                            style={{
                                boxShadow: originalImage ? '0 20px 50px -12px rgba(0, 0, 0, 0.25)' : 'none'
                            }}
                        >
                            {originalImage ? (
                                <canvas ref={canvasRef} className="max-w-full max-h-[calc(100vh-12rem)] object-contain block" />
                            ) : isCreditsLoading ? (
                                <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-12 min-h-[400px]">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex flex-col items-center gap-4"
                                    >
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-sm text-muted-foreground">Loading...</p>
                                    </motion.div>
                                </div>
                            ) : credits > 0 || credits === -1 ? (
                                <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-12">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className={`w-full relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 ease-in-out ${isDragOver
                                            ? 'border-primary bg-primary/5 scale-[1.02]'
                                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white/50 dark:bg-gray-900/50'
                                            }`}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
                                            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white group-hover:scale-110 transition-all duration-300">
                                                <Upload className="w-10 h-10" strokeWidth={1.5} />
                                                {isDragOver && (
                                                    <motion.div
                                                        className="absolute inset-0 rounded-2xl border-2 border-primary"
                                                        initial={{ scale: 1, opacity: 1 }}
                                                        animate={{ scale: 1.5, opacity: 0 }}
                                                        transition={{ repeat: Infinity, duration: 1 }}
                                                    />
                                                )}
                                            </div>

                                            <div className="space-y-2 max-w-sm">
                                                <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                    {isDragOver ? 'Drop image here' : 'Upload an image'}
                                                </h3>
                                                <p className="text-base text-gray-500 dark:text-gray-400">
                                                    Drag and drop, paste from clipboard, or click to browse
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <Button size="lg" className="h-12 px-8 rounded-full font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300 bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100">
                                                    Select Image
                                                </Button>
                                            </div>

                                            <p className="text-xs text-gray-400 dark:text-gray-500 pt-4">
                                                Supports JPG, PNG, WEBP • Processed locally, no size limit
                                            </p>
                                        </div>
                                    </motion.div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-12">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className="w-full relative rounded-3xl border-2 border-dashed border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10"
                                    >
                                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
                                            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500">
                                                <Crown className="w-10 h-10" strokeWidth={1.5} />
                                            </div>

                                            <div className="space-y-2 max-w-sm">
                                                <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                                    Out of Credits
                                                </h3>
                                                <p className="text-base text-gray-500 dark:text-gray-400">
                                                    You need credits to process new images. Upgrade your plan to continue creating.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <Button
                                                    size="lg"
                                                    onClick={() => setShowPricingDialog(true)}
                                                    className="h-12 px-8 rounded-full font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                                                >
                                                    Go Unlimited
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {(isLoading || isRemovingBackground) && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50 overflow-hidden">
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    />
                                    <div className="relative z-10 flex flex-col items-center gap-4">
                                        <Sparkles className="h-10 w-10 text-primary animate-pulse mb-3" />
                                        <p className="text-sm font-medium animate-pulse bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                            {isRemovingBackground ? loadingStatus : 'Something magical...'}
                                        </p>

                                        {/* Progress Bar */}
                                        {isRemovingBackground && backgroundRemovalProgress > 0 && (
                                            <div className="w-64 mt-2">
                                                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        className="bg-gradient-to-r from-primary to-purple-600 h-full rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${backgroundRemovalProgress}%` }}
                                                        transition={{ duration: 0.3 }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground text-center mt-2">
                                                    {backgroundRemovalProgress}%
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Right Sidebar - Tabs (Text & Image) */}
                    {originalImage && (
                        <div className="w-full lg:w-96 h-1/2 lg:h-full bg-card border-t lg:border-t-0 lg:border-l flex flex-col z-10 transition-all duration-300 ease-in-out shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                                <div className="p-4 border-b">
                                    <TabsList className="w-full grid grid-cols-2 relative">
                                        <TabsTrigger value="text" className="relative z-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white transition-none">
                                            <span className="relative z-10">Text</span>
                                            {activeTab === 'text' && (
                                                <motion.div
                                                    layoutId="active-tab"
                                                    className="absolute inset-0 bg-black shadow-sm rounded-sm z-0"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="image" className="relative z-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white transition-none">
                                            <span className="relative z-10">Image</span>
                                            {activeTab === 'image' && (
                                                <motion.div
                                                    layoutId="active-tab"
                                                    className="absolute inset-0 bg-black shadow-sm rounded-sm z-0"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Text Tab Content */}
                                <TabsContent value="text" className="flex-1 flex flex-col m-0 overflow-hidden data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                                        <h2 className="font-semibold text-sm">Layers</h2>
                                        <div className="flex space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => addNewItem(imageWidth, imageHeight)}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                title="Add Text"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={clearAllItems}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                title="Clear All"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <ScrollArea className="flex-1 p-4">
                                        {items.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <p className="text-sm">No text layers added.</p>
                                                <Button
                                                    variant="link"
                                                    onClick={() => addNewItem(imageWidth, imageHeight)}
                                                    className="mt-2"
                                                >
                                                    Add Text
                                                </Button>
                                            </div>
                                        ) : (
                                            <Accordion type="single" collapsible className="w-full space-y-2 pb-20 lg:pb-0">
                                                {items.map((item, index) => (
                                                    <AccordionItem
                                                        key={item.id}
                                                        value={`item-${item.id}`}
                                                        className="border rounded-lg px-2"
                                                    >
                                                        <AccordionTrigger className="hover:no-underline py-3">
                                                            <div className="flex items-center justify-between w-full pr-2">
                                                                <div className="flex items-center space-x-2 overflow-hidden">
                                                                    <span className="text-xs font-mono text-muted-foreground w-4">{index + 1}</span>
                                                                    <span className="text-sm font-medium truncate max-w-[120px]" title={item.text}>{item.text}</span>
                                                                </div>
                                                                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6"
                                                                        onClick={() => duplicateItem(item.id)}
                                                                        title="Duplicate"
                                                                    >
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 hover:text-destructive"
                                                                        onClick={() => deleteItem(item.id)}
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pt-2 pb-4 space-y-4">
                                                            {/* Text Content */}
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Content</Label>
                                                                <Input
                                                                    value={item.text}
                                                                    onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                                                                    className="h-8"
                                                                />
                                                            </div>

                                                            <Separator />

                                                            {/* Position & Transform */}
                                                            <div className="space-y-3">
                                                                <Label className="text-xs">Position & Transform</Label>

                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-muted-foreground">X</Label>
                                                                        <Slider
                                                                            value={[item.xPosition]}
                                                                            onValueChange={([val]) => updateItem(item.id, 'xPosition', val)}
                                                                            max={imageWidth}
                                                                            step={1}
                                                                            className="py-1"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-muted-foreground">Y</Label>
                                                                        <Slider
                                                                            value={[item.yPosition]}
                                                                            onValueChange={([val]) => updateItem(item.id, 'yPosition', val)}
                                                                            max={imageHeight}
                                                                            step={1}
                                                                            className="py-1"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <Label className="text-[10px] text-muted-foreground">Rotation</Label>
                                                                        <span className="text-[10px] text-muted-foreground">{item.rotation}°</span>
                                                                    </div>
                                                                    <Slider
                                                                        value={[item.rotation]}
                                                                        onValueChange={([val]) => rotateText(item.id, val - item.rotation)}
                                                                        max={360}
                                                                        step={1}
                                                                    />
                                                                </div>

                                                                {/* Curve & Skew */}
                                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                                    <div className="space-y-1 col-span-2">
                                                                        <div className="flex justify-between">
                                                                            <Label className="text-[10px] text-muted-foreground flex items-center">
                                                                                Curve Strength <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                                            </Label>
                                                                            <span className="text-[10px] text-muted-foreground">{item.curveStrength || 0}</span>
                                                                        </div>
                                                                        <Slider
                                                                            value={[item.curveStrength || 0]}
                                                                            onValueChange={([val]) => updateItem(item.id, 'curveStrength', val)}
                                                                            min={-360}
                                                                            max={360}
                                                                            step={1}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                                            Skew X <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                                        </Label>
                                                                        <Slider
                                                                            value={[item.skewX || 0]}
                                                                            onValueChange={([val]) => updateItem(item.id, 'skewX', val)}
                                                                            min={-45}
                                                                            max={45}
                                                                            step={1}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                                            Skew Y <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                                        </Label>
                                                                        <Slider
                                                                            value={[item.skewY || 0]}
                                                                            onValueChange={([val]) => updateItem(item.id, 'skewY', val)}
                                                                            min={-45}
                                                                            max={45}
                                                                            step={1}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <Label className="text-[10px] text-muted-foreground">Opacity</Label>
                                                                        <span className="text-[10px] text-muted-foreground">{Math.round(item.textOpacity * 100)}%</span>
                                                                    </div>
                                                                    <Slider
                                                                        value={[item.textOpacity]}
                                                                        onValueChange={([val]) => updateItem(item.id, 'textOpacity', val)}
                                                                        max={1}
                                                                        step={0.01}
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                                    <Button
                                                                        variant={item.flipHorizontal ? "secondary" : "outline"}
                                                                        size="sm"
                                                                        className="h-8 w-full"
                                                                        onClick={() => toggleFlipHorizontalText(item.id)}
                                                                        title="Flip Horizontal"
                                                                    >
                                                                        <FlipHorizontal className="h-4 w-4 mr-2" /> Flip H
                                                                    </Button>
                                                                    <Button
                                                                        variant={item.flipVertical ? "secondary" : "outline"}
                                                                        size="sm"
                                                                        className="h-8 w-full"
                                                                        onClick={() => toggleFlipVerticalText(item.id)}
                                                                        title="Flip Vertical"
                                                                    >
                                                                        <FlipVertical className="h-4 w-4 mr-2" /> Flip V
                                                                    </Button>
                                                                </div>

                                                                {/* Layer Options */}
                                                                <div className="space-y-2 pt-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-xs">Foreground Layer</Label>
                                                                        <Switch
                                                                            checked={item.isForeground}
                                                                            onCheckedChange={() => toggleForeground(item.id)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Separator />

                                                            {/* Font & Style */}
                                                            <div className="space-y-2">
                                                                <FontSelector
                                                                    value={item.fontFamily}
                                                                    onChange={(font) => updateItem(item.id, 'fontFamily', font)}
                                                                    fonts={fonts}
                                                                />
                                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                                    <div className="space-y-1 col-span-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label className="text-[10px] text-muted-foreground">Size</Label>
                                                                            <span className="text-[10px] text-muted-foreground">{item.textSize}px</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Slider
                                                                                value={[item.textSize]}
                                                                                min={10}
                                                                                max={Math.max(imageWidth, imageHeight, 1000)}
                                                                                step={1}
                                                                                onValueChange={(val) => updateItem(item.id, 'textSize', val[0])}
                                                                                className="flex-1"
                                                                            />
                                                                            <Input
                                                                                type="number"
                                                                                value={item.textSize}
                                                                                onChange={(e) => updateItem(item.id, 'textSize', Number(e.target.value))}
                                                                                className="h-7 w-16 text-right"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1 col-span-2">
                                                                        <Label className="text-[10px] text-muted-foreground">Style & Case</Label>
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            {/* Style buttons */}
                                                                            <div className="flex bg-muted/40 border rounded-md p-1 gap-1">
                                                                                <Button
                                                                                    variant={item.isBold ? "default" : "ghost"}
                                                                                    size="icon"
                                                                                    className={`h-7 w-7 ${item.isBold ? '' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                    onClick={() => updateItem(item.id, 'isBold', !item.isBold)}
                                                                                    title="Bold"
                                                                                >
                                                                                    <Bold className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant={item.isItalic ? "default" : "ghost"}
                                                                                    size="icon"
                                                                                    className={`h-7 w-7 ${item.isItalic ? '' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                    onClick={() => updateItem(item.id, 'isItalic', !item.isItalic)}
                                                                                    title="Italic"
                                                                                >
                                                                                    <Italic className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant={item.isUnderline ? "default" : "ghost"}
                                                                                    size="icon"
                                                                                    className={`h-7 w-7 ${item.isUnderline ? '' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                    onClick={() => updateItem(item.id, 'isUnderline', !item.isUnderline)}
                                                                                    title="Underline"
                                                                                >
                                                                                    <Underline className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant={item.isStrikethrough ? "default" : "ghost"}
                                                                                    size="icon"
                                                                                    className={`h-7 w-7 ${item.isStrikethrough ? '' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                    onClick={() => updateItem(item.id, 'isStrikethrough', !item.isStrikethrough)}
                                                                                    title="Strikethrough"
                                                                                >
                                                                                    <Strikethrough className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                            {/* Text case buttons */}
                                                                            <div className="flex bg-muted/40 border rounded-md p-1 gap-1">
                                                                                <Button
                                                                                    variant={item.textTransform === 'none' ? "default" : "ghost"}
                                                                                    size="icon"
                                                                                    className={`h-7 w-7 ${item.textTransform === 'none' ? '' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                    onClick={() => updateItem(item.id, 'textTransform', 'none')}
                                                                                    title="Normal Case"
                                                                                >
                                                                                    <Type className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant={item.textTransform === 'uppercase' ? "default" : "ghost"}
                                                                                    size="icon"
                                                                                    className={`h-7 w-7 ${item.textTransform === 'uppercase' ? '' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                    onClick={() => updateItem(item.id, 'textTransform', 'uppercase')}
                                                                                    title="Uppercase"
                                                                                >
                                                                                    <CaseUpper className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant={item.textTransform === 'lowercase' ? "default" : "ghost"}
                                                                                    size="icon"
                                                                                    className={`h-7 w-7 ${item.textTransform === 'lowercase' ? '' : 'text-muted-foreground hover:text-foreground'}`}
                                                                                    onClick={() => updateItem(item.id, 'textTransform', 'lowercase')}
                                                                                    title="Lowercase"
                                                                                >
                                                                                    <CaseLower className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1 col-span-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label className="text-[10px] text-muted-foreground flex items-center">
                                                                                Letter Spacing <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                                            </Label>
                                                                            <span className="text-[10px] text-muted-foreground">{item.letterSpacing}px</span>
                                                                        </div>
                                                                        <Slider
                                                                            value={[item.letterSpacing]}
                                                                            min={-10}
                                                                            max={50}
                                                                            step={1}
                                                                            onValueChange={(val) => updateItem(item.id, 'letterSpacing', val[0])}
                                                                            className="flex-1"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Separator />

                                                            {/* Color */}
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-medium">Appearance</Label>
                                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{item.textColor}</span>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    {/* Custom Picker */}
                                                                    <div className="relative group shrink-0">
                                                                        <Label className="sr-only">Text Color</Label>
                                                                        <div className="w-8 h-8 rounded-full border shadow-sm overflow-hidden cursor-pointer relative">
                                                                            <input
                                                                                type="color"
                                                                                value={item.textColor}
                                                                                onChange={(e) => updateItem(item.id, 'textColor', e.target.value)}
                                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                                            />
                                                                            <div
                                                                                className="w-full h-full"
                                                                                style={{ backgroundColor: item.textColor }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Preset Colors */}
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'].map((color) => (
                                                                            <button
                                                                                key={color}
                                                                                className={`w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring ${item.textColor === color ? 'ring-2 ring-ring scale-110' : ''}`}
                                                                                style={{ backgroundColor: color }}
                                                                                onClick={() => updateItem(item.id, 'textColor', color)}
                                                                                title={color}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                id={`gradient-${item.id}`}
                                                                                checked={item.useGradient}
                                                                                onCheckedChange={() => toggleGradient(item.id)}
                                                                            />
                                                                            <Label htmlFor={`gradient-${item.id}`} className="text-xs font-medium flex items-center">
                                                                                Gradient Overlay <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                                            </Label>
                                                                        </div>
                                                                    </div>

                                                                    {item.useGradient && (
                                                                        <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[10px] text-muted-foreground">Start Color</Label>
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <div className="h-8 w-full rounded-md border overflow-hidden relative">
                                                                                            <input
                                                                                                type="color"
                                                                                                value={item.gradientColor1}
                                                                                                onChange={(e) => updateItem(item.id, 'gradientColor1', e.target.value)}
                                                                                                className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[10px] text-muted-foreground">End Color</Label>
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <div className="h-8 w-full rounded-md border overflow-hidden relative">
                                                                                            <input
                                                                                                type="color"
                                                                                                value={item.gradientColor2}
                                                                                                onChange={(e) => updateItem(item.id, 'gradientColor2', e.target.value)}
                                                                                                className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between">
                                                                                    <Label className="text-[10px] text-muted-foreground">Angle</Label>
                                                                                    <span className="text-[10px] text-muted-foreground">{item.gradientAngle}°</span>
                                                                                </div>
                                                                                <Slider
                                                                                    value={[item.gradientAngle]}
                                                                                    onValueChange={([val]) => updateItem(item.id, 'gradientAngle', val)}
                                                                                    max={360}
                                                                                    step={1}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <Separator />

                                                            {/* Effects */}
                                                            <div className="space-y-3">
                                                                <Label className="text-xs">Effects</Label>

                                                                {/* Shadow Control */}
                                                                <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Switch
                                                                                id={`shadow-${item.id}`}
                                                                                checked={item.shadowBlur > 0 || item.shadowOffsetX !== 0 || item.shadowOffsetY !== 0}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) {
                                                                                        updateItem(item.id, 'shadowBlur', 10);
                                                                                        updateItem(item.id, 'shadowOffsetX', 5);
                                                                                        updateItem(item.id, 'shadowOffsetY', 5);
                                                                                    } else {
                                                                                        updateItem(item.id, 'shadowBlur', 0);
                                                                                        updateItem(item.id, 'shadowOffsetX', 0);
                                                                                        updateItem(item.id, 'shadowOffsetY', 0);
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Label htmlFor={`shadow-${item.id}`} className="text-xs font-medium">Drop Shadow</Label>
                                                                        </div>
                                                                    </div>

                                                                    {(item.shadowBlur > 0 || item.shadowOffsetX !== 0 || item.shadowOffsetY !== 0) && (
                                                                        <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[10px] text-muted-foreground">Color</Label>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <div className="h-6 w-full rounded-md border overflow-hidden relative">
                                                                                        <input
                                                                                            type="color"
                                                                                            value={item.shadowColor}
                                                                                            onChange={(e) => updateItem(item.id, 'shadowColor', e.target.value)}
                                                                                            className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between">
                                                                                    <Label className="text-[10px] text-muted-foreground">Blur</Label>
                                                                                    <span className="text-[10px] text-muted-foreground">{item.shadowBlur}px</span>
                                                                                </div>
                                                                                <Slider
                                                                                    value={[item.shadowBlur]}
                                                                                    onValueChange={([val]) => updateItem(item.id, 'shadowBlur', val)}
                                                                                    max={200}
                                                                                    step={1}
                                                                                />
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[10px] text-muted-foreground">Offset X</Label>
                                                                                    <Slider
                                                                                        value={[item.shadowOffsetX]}
                                                                                        onValueChange={([val]) => updateItem(item.id, 'shadowOffsetX', val)}
                                                                                        min={-50}
                                                                                        max={50}
                                                                                        step={1}
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-[10px] text-muted-foreground">Offset Y</Label>
                                                                                    <Slider
                                                                                        value={[item.shadowOffsetY]}
                                                                                        onValueChange={([val]) => updateItem(item.id, 'shadowOffsetY', val)}
                                                                                        min={-50}
                                                                                        max={50}
                                                                                        step={1}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Stroke Control */}
                                                                <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Switch
                                                                                id={`stroke-${item.id}`}
                                                                                checked={item.strokeWidth > 0}
                                                                                onCheckedChange={(checked) => {
                                                                                    updateItem(item.id, 'strokeWidth', checked ? 2 : 0);
                                                                                }}
                                                                            />
                                                                            <Label htmlFor={`stroke-${item.id}`} className="text-xs font-medium">Outline (Stroke)</Label>
                                                                        </div>
                                                                    </div>

                                                                    {item.strokeWidth > 0 && (
                                                                        <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[10px] text-muted-foreground">Color</Label>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <div className="h-6 w-full rounded-md border overflow-hidden relative">
                                                                                        <input
                                                                                            type="color"
                                                                                            value={item.strokeColor}
                                                                                            onChange={(e) => updateItem(item.id, 'strokeColor', e.target.value)}
                                                                                            className="absolute -top-2 -left-2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <div className="flex justify-between">
                                                                                    <Label className="text-[10px] text-muted-foreground">Width</Label>
                                                                                    <span className="text-[10px] text-muted-foreground">{item.strokeWidth}px</span>
                                                                                </div>
                                                                                <Slider
                                                                                    value={[item.strokeWidth]}
                                                                                    onValueChange={([val]) => updateItem(item.id, 'strokeWidth', val)}
                                                                                    min={1}
                                                                                    max={100}
                                                                                    step={1}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <Separator />

                                                            {/* 3D Effect */}
                                                            <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center space-x-2">
                                                                        <Switch
                                                                            id={`extrusion-${item.id}`}
                                                                            checked={(item.extrusionDepth || 0) > 0}
                                                                            onCheckedChange={(checked) => updateItem(item.id, 'extrusionDepth', checked ? 10 : 0)}
                                                                        />
                                                                        <Label htmlFor={`extrusion-${item.id}`} className="text-xs font-medium flex items-center">
                                                                            3D Effect <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                                        </Label>
                                                                    </div>
                                                                </div>

                                                                {(item.extrusionDepth || 0) > 0 && (
                                                                    <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                                                        <div className="space-y-1">
                                                                            <div className="flex justify-between">
                                                                                <Label className="text-[10px] text-muted-foreground">Depth</Label>
                                                                                <span className="text-[10px] text-muted-foreground">{Math.round(item.extrusionDepth)}</span>
                                                                            </div>
                                                                            <Slider
                                                                                value={[item.extrusionDepth || 0]}
                                                                                onValueChange={([val]) => updateItem(item.id, 'extrusionDepth', val)}
                                                                                min={0}
                                                                                max={50}
                                                                                step={1}
                                                                            />
                                                                        </div>

                                                                        <div className="space-y-1">
                                                                            <div className="flex justify-between">
                                                                                <Label className="text-[10px] text-muted-foreground">Direction</Label>
                                                                                <span className="text-[10px] text-muted-foreground">{Math.round(item.extrusionAngle || 45)}°</span>
                                                                            </div>
                                                                            <Slider
                                                                                value={[item.extrusionAngle || 45]}
                                                                                onValueChange={([val]) => updateItem(item.id, 'extrusionAngle', val)}
                                                                                min={0}
                                                                                max={360}
                                                                                step={1}
                                                                            />
                                                                        </div>

                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] text-muted-foreground">Color</Label>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="relative w-full h-8 rounded-md border shadow-sm overflow-hidden cursor-pointer">
                                                                                    <input
                                                                                        type="color"
                                                                                        value={item.extrusionColor || '#000000'}
                                                                                        onChange={(e) => updateItem(item.id, 'extrusionColor', e.target.value)}
                                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                                    />
                                                                                    <div
                                                                                        className="w-full h-full flex items-center justify-center text-[10px] font-mono pointer-events-none"
                                                                                        style={{
                                                                                            backgroundColor: item.extrusionColor || '#000000',
                                                                                            color: (() => {
                                                                                                const hex = item.extrusionColor || '#000000';
                                                                                                const r = parseInt(hex.slice(1, 3), 16);
                                                                                                const g = parseInt(hex.slice(3, 5), 16);
                                                                                                const b = parseInt(hex.slice(5, 7), 16);
                                                                                                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                                                                                return luminance > 0.5 ? '#000000' : '#ffffff';
                                                                                            })()
                                                                                        }}
                                                                                    >
                                                                                        {item.extrusionColor || '#000000'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                {/* Image Tab Content */}
                                <TabsContent value="image" className="flex-1 flex flex-col m-0 overflow-hidden data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:slide-in-from-bottom-2 duration-300">
                                    <div className="p-4 border-b bg-muted/30 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h2 className="font-semibold text-sm">Image Settings</h2>
                                        </div>
                                        {/* Layer Selector */}
                                        <div className="flex p-1 bg-muted rounded-lg relative">
                                            <button
                                                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all relative z-10 ${activeImageTab === 'background'
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                onClick={() => setActiveImageTab('background')}
                                            >
                                                Background
                                                {activeImageTab === 'background' && (
                                                    <motion.div
                                                        layoutId="active-image-tab"
                                                        className="absolute inset-0 bg-background shadow-sm rounded-md z-[-1]"
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    />
                                                )}
                                            </button>
                                            <button
                                                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all relative z-10 ${activeImageTab === 'foreground'
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                onClick={() => setActiveImageTab('foreground')}
                                            >
                                                Foreground
                                                {activeImageTab === 'foreground' && (
                                                    <motion.div
                                                        layoutId="active-image-tab"
                                                        className="absolute inset-0 bg-background shadow-sm rounded-md z-[-1]"
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <ScrollArea className="flex-1 p-4">
                                        <div className="space-y-6 pb-20 lg:pb-0">
                                            {/* Filter Controls */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-medium">
                                                        {activeImageTab === 'background' ? 'Background' : 'Foreground'} Filter
                                                    </Label>
                                                    {layerSettings[activeImageTab].filter !== 'none' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                                                            onClick={() => setLayerSettings(prev => ({
                                                                ...prev,
                                                                [activeImageTab]: { ...prev[activeImageTab], filter: 'none' }
                                                            }))}
                                                        >
                                                            Reset
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    {['none', 'brightness', 'contrast', 'grayscale', 'sepia', 'blur'].map((f) => (
                                                        <div
                                                            key={f}
                                                            className={`cursor-pointer rounded-md border-2 p-2 text-center transition-all ${layerSettings[activeImageTab].filter === f
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-transparent bg-muted/50 hover:bg-muted'
                                                                }`}
                                                            onClick={() => setLayerSettings(prev => ({
                                                                ...prev,
                                                                [activeImageTab]: { ...prev[activeImageTab], filter: f }
                                                            }))}
                                                        >
                                                            <div className="text-[10px] font-medium capitalize">{f}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {layerSettings[activeImageTab].filter !== 'none' && (
                                                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-[10px] text-muted-foreground">Intensity</Label>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {layerSettings[activeImageTab].intensity}%
                                                            </span>
                                                        </div>
                                                        <Slider
                                                            value={[layerSettings[activeImageTab].intensity]}
                                                            onValueChange={([value]) => setLayerSettings(prev => ({
                                                                ...prev,
                                                                [activeImageTab]: { ...prev[activeImageTab], intensity: value }
                                                            }))}
                                                            min={0}
                                                            max={200}
                                                            step={1}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <Separator />

                                            {/* Advanced Adjustments */}
                                            <div className="space-y-4">
                                                <Label className="text-xs font-medium">Adjustments</Label>

                                                {/* Vignette */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                            Vignette <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground">{layerSettings[activeImageTab].vignette}</span>
                                                    </div>
                                                    <Slider
                                                        value={[layerSettings[activeImageTab].vignette]}
                                                        onValueChange={([val]) => handleProFeature(() => setLayerSettings(prev => ({
                                                            ...prev,
                                                            [activeImageTab]: { ...prev[activeImageTab], vignette: val }
                                                        })))}
                                                        max={100}
                                                        step={1}
                                                    />
                                                </div>

                                                {/* Noise */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                            Noise <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground">{layerSettings[activeImageTab].noise}</span>
                                                    </div>
                                                    <Slider
                                                        value={[layerSettings[activeImageTab].noise]}
                                                        onValueChange={([val]) => handleProFeature(() => setLayerSettings(prev => ({
                                                            ...prev,
                                                            [activeImageTab]: { ...prev[activeImageTab], noise: val }
                                                        })))}
                                                        max={100}
                                                        step={1}
                                                    />
                                                </div>

                                                {/* Sharpen */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                            Sharpen <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground">{layerSettings[activeImageTab].sharpen}</span>
                                                    </div>
                                                    <Slider
                                                        value={[layerSettings[activeImageTab].sharpen]}
                                                        onValueChange={([val]) => handleProFeature(() => setLayerSettings(prev => ({
                                                            ...prev,
                                                            [activeImageTab]: { ...prev[activeImageTab], sharpen: val }
                                                        })))}
                                                        max={100}
                                                        step={1}
                                                    />
                                                </div>

                                                {/* Shadows */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                            Shadows <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground">{layerSettings[activeImageTab].shadows}</span>
                                                    </div>
                                                    <Slider
                                                        value={[layerSettings[activeImageTab].shadows]}
                                                        onValueChange={([val]) => handleProFeature(() => setLayerSettings(prev => ({
                                                            ...prev,
                                                            [activeImageTab]: { ...prev[activeImageTab], shadows: val }
                                                        })))}
                                                        min={-100}
                                                        max={100}
                                                        step={1}
                                                    />
                                                </div>

                                                {/* Highlights */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                            Highlights <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground">{layerSettings[activeImageTab].highlights}</span>
                                                    </div>
                                                    <Slider
                                                        value={[layerSettings[activeImageTab].highlights]}
                                                        onValueChange={([val]) => handleProFeature(() => setLayerSettings(prev => ({
                                                            ...prev,
                                                            [activeImageTab]: { ...prev[activeImageTab], highlights: val }
                                                        })))}
                                                        min={-100}
                                                        max={100}
                                                        step={1}
                                                    />
                                                </div>

                                                {/* Temperature */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <Label className="text-[10px] text-muted-foreground flex items-center">
                                                            Temperature <Crown className="w-3 h-3 text-amber-500 ml-1" />
                                                        </Label>
                                                        <span className="text-[10px] text-muted-foreground">{layerSettings[activeImageTab].temperature}</span>
                                                    </div>
                                                    <Slider
                                                        value={[layerSettings[activeImageTab].temperature]}
                                                        onValueChange={([val]) => handleProFeature(() => setLayerSettings(prev => ({
                                                            ...prev,
                                                            [activeImageTab]: { ...prev[activeImageTab], temperature: val }
                                                        })))}
                                                        min={-100}
                                                        max={100}
                                                        step={1}
                                                    />
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Global Transforms */}
                                            <div className="space-y-3">
                                                <Label className="text-xs font-medium">Global Transform</Label>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant={flipHorizontal ? "secondary" : "outline"}
                                                        size="sm"
                                                        onClick={toggleFlipHorizontal}
                                                        className="flex-1"
                                                    >
                                                        <FlipHorizontal className="h-4 w-4 mr-2" />
                                                        Flip H
                                                    </Button>
                                                    <Button
                                                        variant={flipVertical ? "secondary" : "outline"}
                                                        size="sm"
                                                        onClick={toggleFlipVertical}
                                                        className="flex-1"
                                                    >
                                                        <FlipVertical className="h-4 w-4 mr-2" />
                                                        Flip V
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </main>
            </div >

            {/* Hidden Input */}
            < input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        logAnalyticsEvent('image_upload');
                        handleImageUpload(e);
                    }
                }}
                accept="image/*"
            />

            {/* Dialogs */}
            < AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the current image and all your edits. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemoveImage}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >

            <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear all items?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove all text items from the image.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmClearAllItems}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <PricingDialog
                open={showPricingDialog}
                onOpenChange={setShowPricingDialog}
                uid={auth.currentUser?.uid}
                subscriptionStatus={subscriptionStatus}
                dodoCustomerId={dodoCustomerId}
                dodoSubscriptionId={dodoSubscriptionId}
                subscriptionInterval={subscriptionInterval}
            />
        </div >
    );
};

export default ImageEditorPage;