'use client';

import { Slider } from '@/components/ui/slider';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from '@/components/ui/label';
import { removeBackground } from "@imgly/background-removal";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Trash2, Copy, Upload, Download, Plus, Droplet, Undo, Redo, Sliders, CircleDot, RotateCw, Loader2, FlipHorizontal, FlipVertical, Check, Palette, Bold, Italic, Underline, Strikethrough, Type, CaseLower, CaseUpper, Sparkles } from 'lucide-react';
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
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { initializeApp } from 'firebase/app';

// Firebase configuration (make sure this matches your config in landing.tsx)
const firebaseConfig = {
    apiKey: "AIzaSyA-ag9BCwGhFEsuAQSeG7MVis98xUhYJBU",
    authDomain: "textinsideimage.firebaseapp.com",
    projectId: "textinsideimage",
    storageBucket: "textinsideimage.appspot.com",
    messagingSenderId: "558991178680",
    appId: "1:558991178680:web:959c2d6736ec94452d6d4d",
    measurementId: "G-8QBQY4PZ14"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
    }, [isOpen]);


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
}

type HistoryEntry = TextItem[];

const ImageEditorPage = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [items, setItems] = useState<TextItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);
    const [error, setError] = useState(null);
    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showClearAllDialog, setShowClearAllDialog] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [layerSettings, setLayerSettings] = useState({
        background: { filter: 'none', intensity: 100 },
        foreground: { filter: 'none', intensity: 100 }
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


    const [dominantColors, setDominantColors] = useState<string[]>([]);
    const [fonts, setFonts] = useState<string[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Fetch fonts from Google Fonts API
        fetch('https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyCG9LNdH6W6bOyR-lCDvM73wPNVpVkk0Tw')
            .then(response => response.json())
            .then((data: GoogleFontsResponse) => {
                setFonts(data.items.map((item: GoogleFont) => item.family));
            });
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                // User is not logged in, redirect to landing page
                router.push('/');
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [router]);

    const extractColors = (imageUrl: string) => {
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

            setDominantColors(distinctColors);
        };
    };
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);

    // ... existing code ...

    const toggleFlipHorizontal = () => {
        setFlipHorizontal(!flipHorizontal);
    };

    const toggleFlipVertical = () => {
        setFlipVertical(!flipVertical);
    };
    const addNewItem = (width = 500, height = 500) => {
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
            textTransform: 'none'
        };
        setItems(prevItems => [...prevItems, newItem]);
        addToHistory([...items, newItem]);
    };
    const toggleForeground = (id: number) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, isForeground: !item.isForeground } : item
        );
        setItems(updatedItems);
        addToHistory(updatedItems);
    };
    const toggleGradient = (id: number) => {
        const updatedItems = items.map(item =>
            item.id === id ? { ...item, useGradient: !item.useGradient } : item
        );
        setItems(updatedItems);
        addToHistory(updatedItems);
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

    const addToHistory = (newItems: TextItem[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newItems);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setItems(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setItems(history[historyIndex + 1]);
        }
    };

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
    }, [historyIndex, history]);

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
    }, []);


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
    const processImageFile = async (file: File | Blob) => {
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
                        setIsLoading(false);
                        addNewItem(img.width, img.height);
                        if (event.target && event.target.result) {
                            extractColors(event.target.result as string);
                        }
                    };
                    img.src = event.target.result as string;

                    // Start background removal process
                    setIsRemovingBackground(true);
                    try {
                        const removedBackground = await removeBackground(processedBlob);
                        const url = URL.createObjectURL(removedBackground);
                        setProcessedImage(url);
                    } catch (err) {
                        console.error('Error removing background:', err);
                    } finally {
                        setIsRemovingBackground(false);
                    }
                }
            };
            reader.readAsDataURL(processedBlob);
        } catch (err) {
            console.error('Error processing image:', err);
            setIsLoading(false);
        }
    };

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
            link.download = 'edited_image.png';
            link.href = dataUrl;
            link.click();
        } else {
            console.error('Canvas is not available');
            // Optionally, you can show an error message to the user here
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

    const removeImage = () => {
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
            background: { filter: 'none', intensity: 100 },
            foreground: { filter: 'none', intensity: 100 }
        });
        setActiveImageTab('background');
        setShowDeleteDialog(false);
        if (isFilterOpen) {
            toggleFilterSection();
        }
    };

    const handleZoomIn = () => {
        setZoom(prevZoom => Math.min(prevZoom + 0.2, 3));
    };

    const handleZoomOut = () => {
        setZoom(prevZoom => Math.max(prevZoom - 0.2, 0.5));
    };

    const applyFilter = (ctx: CanvasRenderingContext2D, filterName: string, filterValue: number) => {
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

                // Apply rotation
                ctx.translate(item.xPosition * zoom, item.yPosition * zoom);
                ctx.rotate(item.rotation * Math.PI / 180);

                // Apply flips
                ctx.scale(item.flipHorizontal ? -1 : 1, item.flipVertical ? -1 : 1);

                ctx.textAlign = item.textAlign;
                ctx.textBaseline = 'middle';

                // Apply text transformation
                let displayText = item.text;
                if (item.textTransform === 'uppercase') {
                    displayText = item.text.toUpperCase();
                } else if (item.textTransform === 'lowercase') {
                    displayText = item.text.toLowerCase();
                }

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

                ctx.fillText(displayText, 0, 0);

                // Draw decorations (Underline / Strikethrough)
                if (item.isUnderline || item.isStrikethrough) {
                    const metrics = ctx.measureText(displayText);
                    const width = metrics.width;
                    let xStart = 0;

                    if (item.textAlign === 'center') xStart = -width / 2;
                    else if (item.textAlign === 'right') xStart = -width;
                    else xStart = 0;

                    ctx.lineWidth = Math.max(1, item.textSize / 15);
                    ctx.strokeStyle = ctx.fillStyle; // Use same color/gradient as text

                    if (item.isUnderline) {
                        ctx.beginPath();
                        // Offset for underline (approximate based on baseline)
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

            // Draw original image (Background)
            ctx.save();
            applyFilter(ctx, layerSettings.background.filter, layerSettings.background.intensity);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            // Draw background text items
            drawText(ctx, false);

            // Draw processed image (Foreground) if available
            if (processedImgRef.current) {
                ctx.save();
                applyFilter(ctx, layerSettings.foreground.filter, layerSettings.foreground.intensity);
                ctx.drawImage(processedImgRef.current, 0, 0, canvas.width, canvas.height);
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
                    <h1 className="text-lg font-semibold tracking-tight">Text Behind Image</h1>

                    <div className="flex items-center space-x-3">
                        {originalImage ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={removeImage}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={captureAndSaveImage}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Image
                            </Button>
                        )}
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
                        )}

                        {/* The Canvas */}
                        <div className={`relative shadow-2xl rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm transition-all duration-200 ease-out ${isDragOver && !originalImage ? 'ring-4 ring-primary ring-offset-2 scale-105' : ''}`}
                            style={{
                                boxShadow: originalImage ? '0 20px 50px -12px rgba(0, 0, 0, 0.25)' : 'none'
                            }}
                        >
                            {originalImage ? (
                                <canvas ref={canvasRef} className="max-w-full max-h-[calc(100vh-12rem)] object-contain block" />
                            ) : (
                                <div className="text-center p-12 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-card/50">
                                    <div className="bg-muted rounded-full p-4 inline-flex mb-4">
                                        <Upload className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium mb-1">No image selected</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {isDragOver ? 'Drop your image here' : 'Upload, drag & drop, or paste (Ctrl+V) an image to start editing'}
                                    </p>
                                    <Button onClick={() => fileInputRef.current?.click()}>
                                        Select Image
                                    </Button>
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
                                    <div className="relative z-10 flex flex-col items-center">
                                        <Sparkles className="h-10 w-10 text-primary animate-pulse mb-3" />
                                        <p className="text-sm font-medium animate-pulse bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                            Something magical...
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Right Sidebar - Tabs (Text & Image) */}
                    {originalImage && (
                        <div className="w-full lg:w-80 h-1/2 lg:h-full bg-card border-t lg:border-t-0 lg:border-l flex flex-col z-10 transition-all duration-300 ease-in-out shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
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
                                            <Accordion type="single" collapsible className="w-full space-y-2">
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
                                                                </div>
                                                            </div>

                                                            {/* Color */}
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-medium">Appearance</Label>
                                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{item.textColor}</span>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    {/* Custom Picker */}
                                                                    <div className="relative group shrink-0">
                                                                        <div
                                                                            className="h-9 w-9 rounded-full border-2 border-muted hover:border-primary transition-all cursor-pointer overflow-hidden shadow-sm flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
                                                                            title="Pick Custom Color"
                                                                        >
                                                                            <div
                                                                                className="h-full w-full rounded-full border-[3px] border-background shadow-inner"
                                                                                style={{ backgroundColor: item.textColor }}
                                                                            />
                                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                                                                                <Palette className="h-4 w-4 text-white drop-shadow-md" />
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            type="color"
                                                                            value={item.textColor}
                                                                            onChange={(e) => updateItem(item.id, 'textColor', e.target.value)}
                                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0 border-0"
                                                                        />
                                                                    </div>

                                                                    <div className="w-px h-8 bg-border" />

                                                                    {/* Dominant Colors */}
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {dominantColors.slice(0, 7).map((color) => (
                                                                            <button
                                                                                key={color}
                                                                                className={`h-8 w-8 rounded-full border shadow-sm transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${item.textColor === color
                                                                                    ? 'ring-2 ring-primary ring-offset-2 border-transparent scale-105'
                                                                                    : 'border-border hover:border-primary/50'
                                                                                    }`}
                                                                                style={{ backgroundColor: color }}
                                                                                onClick={() => updateItem(item.id, 'textColor', color)}
                                                                                title={color}
                                                                                type="button"
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
                                                                            <Label htmlFor={`gradient-${item.id}`} className="text-xs font-medium">Gradient Overlay</Label>
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
                                                            </div>

                                                            <Separator />

                                                            {/* Options */}
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs">Foreground Layer</Label>
                                                                    <Switch
                                                                        checked={item.isForeground}
                                                                        onCheckedChange={() => toggleForeground(item.id)}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-medium">Transform</Label>
                                                                    <div className="flex items-center gap-3">
                                                                        <Button
                                                                            variant={item.flipHorizontal ? "secondary" : "outline"}
                                                                            size="icon"
                                                                            className="h-10 w-10 flex-1"
                                                                            onClick={() => toggleFlipHorizontalText(item.id)}
                                                                            title="Flip Horizontal"
                                                                        >
                                                                            <FlipHorizontal className="h-5 w-5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant={item.flipVertical ? "secondary" : "outline"}
                                                                            size="icon"
                                                                            className="h-10 w-10 flex-1"
                                                                            onClick={() => toggleFlipVerticalText(item.id)}
                                                                            title="Flip Vertical"
                                                                        >
                                                                            <FlipVertical className="h-5 w-5" />
                                                                        </Button>
                                                                    </div>
                                                                </div>

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
                                        <div className="space-y-6">
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
            </div>

            {/* Hidden Input */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleImageUpload}
                accept="image/*"
            />

            {/* Dialogs */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
            </AlertDialog>

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
        </div>
    );
};

export default ImageEditorPage;